import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ProductDTO } from '../models/inventory.dto';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private readonly apiUrl = `${environment.apiUrl}/productos`;
  private readonly inventarioUrl = `${environment.apiUrl}/inventario`;
  private readonly http = inject(HttpClient);

  /**
   * GET /api/v1/productos?page=0&size=200&nombre=&sort=nombre,asc
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
      precioCompra: toNum(item.precio_Unitario ?? item.precioCompra ?? item.precio_compra ?? item.costo),
      precioVenta: toNum(item.precio_Unitario ?? item.precioVenta ?? item.precio_venta ?? item.precio),
      porcentajeSobrante: toNum(item.porcentajeSobrante ?? item.porcentaje_sobrante),
      isLowStock: !!(item.isLowStock ?? item.stockBajo ?? item.stock_bajo ?? false),
      composition: item.composition || item.composicion || null
    };
  }


  /**
   * POST /api/v1/productos
   */
  create(data: any): Observable<number> {
    const unitValue = data.unit || data.unidadMedida || 'Unidad';
    const idUnidad = Number.isNaN(Number(unitValue)) ? null : Number(unitValue) || null;

    const payload: any = {
      nombre: data.nombre || data.name,
      tipo: data.tipo || data.type || 'INSUMO',
      cantidad: Number(data.cantidadDisponible ?? data.stock ?? 0),
      stockMinimo: Number(data.stockMinimo ?? data.minStock ?? 0),
      precioCompra: Number(data.precioCompra ?? data.purchasePrice ?? data.productionCost),
      precioVenta: Number(data.precioVenta ?? data.salePrice),
      porcentajeSobrante: Number(data.porcentajeSobrante ?? data.wastePercent ?? 0)
    };

    if (idUnidad && idUnidad > 0) {
      payload.idUnidadMedida = idUnidad;
    } else if (unitValue && typeof unitValue === 'string') {
      payload.nuevaUnidadMedida = unitValue;
    }

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(res => res.data)
    );
  }

  /**
   * PUT /api/v1/productos/{id}
   */
  update(id: string | number, data: any): Observable<any> {
    const unitValue = data.unit || data.unidadMedida || 'Unidad';
    const idUnidad = Number.isNaN(Number(unitValue)) ? null : Number(unitValue) || null;

    const payload: any = {
      nombre: data.nombre || data.name,
      stockMinimo: Number(data.stockMinimo ?? data.minStock ?? 0),
      precioCompra: Number(data.precioCompra ?? data.purchasePrice ?? data.productionCost ?? 0),
      precioVenta: Number(data.precioVenta ?? data.salePrice ?? 0),
      porcentajeSobrante: Number(data.porcentajeSobrante ?? data.wastePercent ?? 0)
    };

    if (idUnidad && idUnidad > 0) {
      payload.idUnidadMedida = idUnidad;
    } else if (unitValue && typeof unitValue === 'string' && unitValue !== 'NEW_UNIT') {
      payload.nuevaUnidadMedida = unitValue;
    }

    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map(res => res.data)
    );
  }

  delete(id: string | number): Observable<any> {
    const payload = {
      idProducto: Number(id),
      cantidadNueva: 0,
      motivo: 'Eliminación desde interfaz'
    };
    return this.http.post<any>(`${this.inventarioUrl}/ajustes`, payload);
  }

  registrarEntrada(idProducto: number, cantidad: number, motivo: string): Observable<any> {
    const payload = { idProducto, cantidad, motivo };
    return this.http.post<any>(`${this.inventarioUrl}/entradas`, payload);
  }

  ajustarInventario(idProducto: number, cantidadNueva: number, motivo: string): Observable<any> {
    const payload = { idProducto, cantidadNueva, motivo };
    return this.http.post<any>(`${this.inventarioUrl}/ajustes`, payload);
  }

  addComposicion(idProducto: number, insumos: { idInsumo: number; cantidadUsada: number }[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${idProducto}/composicion`, insumos);
  }

  /**
   * Calcula el costo total de una composición basado en una lista de insumos y sus cantidades.
   */
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

