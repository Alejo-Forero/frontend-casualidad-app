import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ComposicionProductoDto, DisponibilidadProductoDto, ProductDTO } from '../models/inventory.dto';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private readonly apiUrl = `${environment.apiUrl}/productos`;
  private readonly inventarioUrl = `${environment.apiUrl}/inventario`;
  private readonly http = inject(HttpClient);

  /**
   * GET /api/v1/productos?page=0&size=200&sort=nombre,asc
   */
  getAll(): Observable<ProductDTO[]> {
    const params = new HttpParams()
      .set('page', '0')
      .set('size', '200')
      .set('sort', 'nombre,asc');

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => {
        const page = res.data;
        const list: any[] = page?.data || page?.content || [];
        return list.map(item => this.mapInventoryItem(item));
      })
    );
  }

  /**
   * GET /api/v1/productos/{id}
   */
  getById(id: string | number): Observable<ProductDTO> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(res => this.mapInventoryItem(res.data || res))
    );
  }

  /**
   * Búsqueda server-side para autocomplete, filtra solo tipos vendibles.
   * GET /api/v1/productos?nombre=<term>&size=<limit>
   */
  searchProductos(term: string, limit = 20): Observable<ProductDTO[]> {
    let params = new HttpParams()
      .set('page', '0')
      .set('size', String(limit))
      .set('sort', 'nombre,asc');

    if (term && term.trim() !== '') {
      params = params.set('nombre', term.trim());
    }

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => {
        const page = res.data;
        const list: any[] = page?.data || page?.content || [];
        return list
          .map(item => this.mapInventoryItem(item))
          .filter(p => p.tipo === 'ELABORADO' || p.tipo === 'TRANSFORMADO' || p.tipo === 'REVENTA');
      })
    );
  }

  /**
   * GET /api/v1/productos/{id}/disponibilidad?cantidad=N
   */
  getDisponibilidad(idProducto: number, cantidad: number): Observable<DisponibilidadProductoDto> {
    const params = new HttpParams().set('cantidad', String(cantidad));
    return this.http.get<any>(`${this.apiUrl}/${idProducto}/disponibilidad`, { params }).pipe(
      map(res => res.data as DisponibilidadProductoDto)
    );
  }

  /**
   * GET /api/v1/productos/{id}/composicion
   */
  getComposicion(idProducto: number): Observable<ComposicionProductoDto> {
    return this.http.get<any>(`${this.apiUrl}/${idProducto}/composicion`).pipe(
      map(res => res.data as ComposicionProductoDto)
    );
  }

  private mapInventoryItem(item: any): ProductDTO {
    const toNum = (val: any): number => {
      if (val === null || val === undefined) return 0;
      const n = Number(val);
      return Number.isNaN(n) ? 0 : n;
    };

    return {
      idProducto: toNum(item.idProducto ?? item.id_producto ?? item.id),
      nombre: item.nombre || item.name || 'Sin nombre',
      tipo: item.tipo || item.type || 'INSUMO',
      unidadMedida: item.unidadMedida || item.nombreUnidadMedida || item.unidad || item.unit?.name || 'Unidad',
      idUnidadMedida: toNum(item.idUnidadMedida ?? item.id_unidad_medida),
      cantidadDisponible: toNum(item.cantidadDisponible ?? item.cantidad ?? item.cantidad_disponible ?? item.stock),
      stockMinimo: toNum(item.stockMinimo ?? item.stock_minimo),
      precioCompra: toNum(item.precioCompra ?? item.precio_compra ?? item.costo),
      precioVenta: toNum(item.precioVenta ?? item.precio_venta ?? item.precio),
      porcentajeSobrante: toNum(item.porcentajeSobrante ?? item.porcentaje_sobrante),
      isLowStock: !!(item.isLowStock ?? item.stockBajo ?? item.stock_bajo ?? false),
      composition: item.composition || item.composicion || null
    };
  }

  /**
   * POST /api/v1/productos
   * Envía el payload limpio al backend. Los enteros opcionales (precioCompra, precioVenta)
   * se omiten si son null/0 para no violar @Min(1) del backend.
   */
  create(data: any): Observable<number> {
    console.log('Data recibida para creación:', data);
    const payload = this.buildProductoPayload(data, 'create');
    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(res => res.data)
    );
  }

  /**
   * PUT /api/v1/productos/{id}
   */
  update(id: string | number, data: any): Observable<any> {
    const payload = this.buildProductoPayload(data, 'update');
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map(res => res.data)
    );
  }

  /**
   * Construye el payload para ProductoRequestDto / EditarProductoDto.
   * Reglas:
   *  - idUnidadMedida y nuevaUnidadMedida son mutuamente excluyentes.
   *  - precioCompra y precioVenta se omiten si son null o <= 0 (backend usa @Min(1)).
   *  - Los precios se redondean a entero (backend usa Integer).
   *  - tipo y cantidad solo se incluyen en 'create'.
   */
  private buildProductoPayload(data: any, op: 'create' | 'update'): any {
    const payload: any = {
      nombre: (data.nombre ?? data.name ?? '').trim(),
      stockMinimo: this.toNumberOrZero(data.stockMinimo ?? data.minStock),
    };

    if (op === 'create') {
      payload.tipo = data.tipo ?? data.type ?? 'INSUMO';
      payload.cantidad = this.toNumberOrZero(data.cantidad ?? 0);
    }

    // Unidad de medida — mutuamente excluyente
    const idUnidad = this.parseIdUnidad(data.idUnidadMedida);
    if (idUnidad !== null) {
      payload.idUnidadMedida = idUnidad;
    } else if (typeof data.nuevaUnidadMedida === 'string' && data.nuevaUnidadMedida.trim()) {
      payload.nuevaUnidadMedida = data.nuevaUnidadMedida.trim();
    }

    // Precios enteros opcionales — solo se incluyen si son >= 1
    const precioCompra = this.toPositiveInt(data.precioCompra);
    if (precioCompra !== null) payload.precioCompra = precioCompra;

    const precioVenta = this.toPositiveInt(data.precioVenta);
    if (precioVenta !== null) payload.precioVenta = precioVenta;

    // Porcentaje sobrante (BigDecimal en backend, 0-100)
    const porc = this.toNumberOrNull(data.porcentajeSobrante);
    if (porc !== null) payload.porcentajeSobrante = porc;

    return payload;
  }

  private parseIdUnidad(raw: any): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private toPositiveInt(raw: any): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Math.round(Number(raw));
    return Number.isFinite(n) && n >= 1 ? n : null;
  }

  private toNumberOrZero(raw: any): number {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  private toNumberOrNull(raw: any): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  vaciarStock(id: string | number): Observable<any> {
    const payload = {
      idProducto: Number(id),
      cantidadNueva: 0,
      motivo: 'Vaciado de stock desde interfaz'
    };
    return this.http.post<any>(`${this.inventarioUrl}/ajustes`, payload);
  }

  registrarEntrada(idProducto: number, cantidad: number, motivo: string): Observable<any> {
    const payload = { idProducto, cantidad, motivo };
    return this.http.post<any>(`${this.inventarioUrl}/entradas`, payload);
  }

  registrarSalida(idProducto: number, cantidad: number, motivo: string, comentario?: string): Observable<any> {
    const payload: any = { idProducto, cantidad, motivo };
    if (comentario) payload.comentario = comentario;
    return this.http.post<any>(`${this.inventarioUrl}/salidas`, payload);
  }

  ajustarInventario(idProducto: number, cantidadNueva: number, motivo: string): Observable<any> {
    const payload = { idProducto, cantidadNueva, motivo };
    return this.http.post<any>(`${this.inventarioUrl}/ajustes`, payload);
  }

  addComposicion(idProducto: number, insumos: { idInsumo: number; cantidadUsada: number }[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${idProducto}/composicion`, insumos);
  }

  calculateCompositionCost(items: any[], products: ProductDTO[]): number {
    return items.reduce((total, item) => {
      const id = item.idInsumo || item.productId;
      if (!id) return total;
      const product = products.find(p => String(p.idProducto) === String(id));
      const cost = product?.precioCompra || 0;
      return total + (cost * (item.cantidadUsada || item.quantity || 0));
    }, 0);
  }

  getUnidadesMedida(): Observable<any[]> {
    return this.http.get<any>(`${environment.apiUrl}/unidades-medida`).pipe(
      map(res => res.data || [])
    );
  }
}
