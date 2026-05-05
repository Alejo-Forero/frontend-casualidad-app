import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private readonly apiUrl = `${environment.apiUrl}/productos`;
  private readonly inventarioUrl = `${environment.apiUrl}/inventario`;
  private readonly http = inject(HttpClient);

  /**
   * GET /api/v1/productos?page=0&size=200&nombre=&sort=nombre,asc
   * Backend devuelve: ApiResponse<PageResponse<InventarioItemDto>>
   * InventarioItemDto: { idProducto, nombre, tipo, unidadMedida, cantidadDisponible, stockBajo }
   */
  getAll(): Observable<any[]> {
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

  private mapInventoryItem(item: any) {
    return {
      idProducto: item.idProducto,
      nombre: item.nombre,
      tipo: item.tipo,
      unidadMedida: item.unidadMedida,
      cantidadDisponible: item.cantidadDisponible,
      stockBajo: item.stockBajo,
      id: String(item.idProducto),
      name: item.nombre,
      type: item.tipo,
      stock: Number(item.cantidadDisponible) || 0,
      isLowStock: item.stockBajo ?? false,
      unit: { name: item.unidadMedida || 'Unidad' },
      purchasePrice: item.precioCompra || null,
      salePrice: item.precioVenta || null,
      productionCost: item.precioCompra || null,
      wastePercent: item.porcentajeSobrante || null,
      minStock: Number(item.stockMinimo) || 0,
      composition: null
    };
  }

  /**
   * POST /api/v1/productos
   * Body: ProductoRequestDto {
   *   nombre, tipo, idUnidadMedida?, nuevaUnidadMedida?,
   *   cantidad, stockMinimo, precioCompra, precioVenta, porcentajeSobrante
   * }
   * El frontend no tiene selector de unidad de medida todavía →
   * se envía nuevaUnidadMedida con el valor del campo unit del formulario.
   */
  create(data: any): Observable<any> {
    const unitValue = data.unit || data.unidadMedida || '';
    const idUnidad = Number.isNaN(Number(unitValue)) ? null : Number(unitValue) || null;

    const payload: any = {
      nombre: data.name || data.nombre,
      tipo: data.type || data.tipo || 'INSUMO',
      cantidad: Number(data.stock ?? data.cantidad ?? 0),
      stockMinimo: Number(data.minStock ?? data.stockMinimo ?? 0),
      precioCompra: Number(data.productionCost ?? data.purchasePrice ?? data.precioCompra ?? 1),
      precioVenta: Number(data.salePrice ?? data.precioVenta ?? 1),
      porcentajeSobrante: Number(data.wastePercent ?? data.porcentajeSobrante ?? 0)
    };

    // Manejo de unidad de medida: ID existente o nombre nuevo
    if (idUnidad && idUnidad > 0) {
      payload.idUnidadMedida = idUnidad;
    } else if (unitValue && typeof unitValue === 'string') {
      payload.nuevaUnidadMedida = unitValue;
    } else {
      payload.nuevaUnidadMedida = 'Unidad';
    }

    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(res => res.data)
    );
  }

  /**
   * PUT /api/v1/productos/{id}
   * Body: EditarProductoDto {
   *   nombre, idUnidadMedida?, nuevaUnidadMedida?,
   *   stockMinimo, precioCompra, precioVenta, porcentajeSobrante
   * }
   * Nota: EditarProductoDto NO incluye `tipo` ni `cantidad` —
   * para modificar stock se usa /api/v1/inventario/ajustes
   */
  update(id: string | number, data: any): Observable<any> {
    const unitValue = data.unit || data.unidadMedida || '';
    const idUnidad = Number.isNaN(Number(unitValue)) ? null : Number(unitValue) || null;

    const payload: any = {
      nombre: data.name || data.nombre,
      stockMinimo: Number(data.minStock ?? data.stockMinimo ?? 0),
      precioCompra: Number(data.productionCost ?? data.purchasePrice ?? data.precioCompra ?? 1),
      precioVenta: Number(data.salePrice ?? data.precioVenta ?? 1),
      porcentajeSobrante: Number(data.wastePercent ?? data.porcentajeSobrante ?? 0)
    };

    if (idUnidad && idUnidad > 0) {
      payload.idUnidadMedida = idUnidad;
    } else if (unitValue && typeof unitValue === 'string') {
      payload.nuevaUnidadMedida = unitValue;
    }

    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map(res => res.data)
    );
  }

  /**
   * Ajuste de inventario a 0 para "eliminar" un producto
   * POST /api/v1/inventario/ajustes
   * Body: AjusteInventarioDto { idProducto, cantidad, motivo }
   * NOTA: El backend no tiene DELETE para productos.
   * Se usa un ajuste a 0 como alternativa hasta que el backend lo implemente.
   */
  delete(id: string | number): Observable<any> {
    const payload = {
      idProducto: Number(id),
      cantidadNueva: 0,
      motivo: 'Eliminación desde interfaz'
    };
    return this.http.post<any>(`${this.inventarioUrl}/ajustes`, payload).pipe(
      map(res => res)
    );
  }

  /**
   * POST /api/v1/inventario/entradas
   * Body: EntradaInventarioDto { idProducto, cantidad, motivo: MotivoMovimiento }
   * MotivoMovimiento: COMPRA_INSUMOS | VENTA_PRODUCTO | CONSUMO | DESPERDICIO | AJUSTE_INVENTARIO
   */
  registrarEntrada(idProducto: number, cantidad: number, motivo: string): Observable<any> {
    const payload = { idProducto, cantidad, motivo };
    return this.http.post<any>(`${this.inventarioUrl}/entradas`, payload).pipe(
      map(res => res)
    );
  }

  /**
   * POST /api/v1/inventario/ajustes
   * Body: AjusteInventarioDto { idProducto, cantidadNueva, motivo: string (10-255 chars) }
   */
  ajustarInventario(idProducto: number, cantidadNueva: number, motivo: string): Observable<any> {
    const payload = { idProducto, cantidadNueva, motivo };
    return this.http.post<any>(`${this.inventarioUrl}/ajustes`, payload).pipe(
      map(res => res)
    );
  }

  /**
   * POST /api/v1/productos/{id}/composicion
   * Agrega insumos a la composición de un producto ELABORADO/TRANSFORMADO.
   */
  addComposicion(idProducto: number, insumos: { idInsumo: number; cantidadUsada: number }[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${idProducto}/composicion`, insumos).pipe(
      map(res => res)
    );
  }
}
