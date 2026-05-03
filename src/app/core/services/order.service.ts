import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly apiUrl = `${environment.apiUrl}/pedidos`;
  private readonly http = inject(HttpClient);

  /**
   * GET /api/v1/pedidos?page=0&size=100
   * Retorna PageResponse<PedidoResumenDto>:
   *   { idPedido, codigoUnico, nombreCliente, estadoPedido, fechaEntrega, total, saldoPendiente }
   * El backend devuelve el objeto PageResponse directamente (sin wrapper ApiResponse).
   */
  getAll(filtros?: {
    idCliente?: number;
    estado?: string;
    fechaInicio?: string;
    fechaFin?: string;
    page?: number;
    size?: number;
  }): Observable<any[]> {
    let params = new HttpParams()
      .set('page', String(filtros?.page ?? 0))
      .set('size', String(filtros?.size ?? 100));

    if (filtros?.idCliente) params = params.set('idCliente', String(filtros.idCliente));
    if (filtros?.estado)    params = params.set('estado', filtros.estado);
    if (filtros?.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
    if (filtros?.fechaFin)    params = params.set('fechaFin', filtros.fechaFin);

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => {
        // El backend devuelve PageResponse<PedidoResumenDto> DIRECTAMENTE (sin wrapper ApiResponse)
        // PageResponse tiene: { pageNumber, pageSize, totalElements, totalPages, data: [] }
        const items: any[] = res?.data ?? res?.content ?? [];
        return items.map((p: any) => ({
          // Campos originales del backend (PedidoResumenDto)
          idPedido:       p.idPedido,
          codigoUnico:    p.codigoUnico,
          nombreCliente:  p.nombreCliente,   // PedidoResumenDto usa nombreCliente (string plano)
          estadoPedido:   p.estadoPedido,
          fechaEntrega:   p.fechaEntrega,
          total:          p.total,
          saldoPendiente: p.saldoPendiente,
          // Aliases para compatibilidad con templates existentes
          id:             String(p.idPedido),
          code:           p.codigoUnico,
          status:         p.estadoPedido,
          clientName:     p.nombreCliente ?? '',
          totalAmount:    p.total,
          pendingBalance: p.saldoPendiente,
          deliveryDate:   p.fechaEntrega,
          paymentStatus:  Number(p.saldoPendiente) === 0 ? 'PAID' : 'PARTIAL',
          // Objeto cliente como alias para templates que usan order.cliente?.nombreCompleto
          cliente: { nombreCompleto: p.nombreCliente ?? '', idCliente: null, telefono: '' }
        }));
      })
    );
  }

  /**
   * GET /api/v1/pedidos/{id}?abonosPage=0&abonosSize=5
   * Retorna PedidoDetalleCompletoDto directamente (sin wrapper ApiResponse):
   *   { idPedido, codigoUnico, estadoPedido, fechaEntrega, total, saldoPendiente,
   *     cliente: { idCliente, nombreCompleto, telefono },
   *     productos: [{ idDetalle, nombreProducto, cantidad, precioUnitario, subtotal, observaciones }],
   *     historialAbonos: PageResponse<AbonoDto> }
   */
  getById(id: string | number, abonosPage = 0, abonosSize = 5): Observable<any> {
    const params = new HttpParams()
      .set('abonosPage', String(abonosPage))
      .set('abonosSize', String(abonosSize));
    return this.http.get<any>(`${this.apiUrl}/${id}`, { params });
  }

  /**
   * POST /api/v1/pedidos
   * Body: CrearPedidoDto { idCliente, idUsuario, fechaEntrega, detalles[] }
   * Retorna: PedidoResponseDto (201 CREATED)
   */
  create(data: any): Observable<any> {
    const payload = {
      idCliente:    Number(data.clientId   || data.idCliente  || 1),
      idUsuario:    Number(data.idUsuario  || 1),
      fechaEntrega: data.deliveryDate || data.fechaEntrega || new Date().toISOString().split('T')[0],
      detalles: (data.items || []).map((item: any) => ({
        idProducto:    Number(item.productId || item.idProducto || 1),
        cantidad:      Number(item.quantity  || item.cantidad   || 1),
        observaciones: item.customization || item.observaciones || ''
      }))
    };
    return this.http.post<any>(this.apiUrl, payload);
  }

  /**
   * POST /api/v1/pedidos/{idPedido}/activar-produccion
   * Cambia el estado PENDIENTE → EN_PRODUCCION y genera código único.
   * Retorna: { mensaje, codigoUnico, estado }
   */
  activarProduccion(idPedido: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${idPedido}/activar-produccion`, {});
  }

  /**
   * PUT /api/v1/pedidos/{id}
   * Body: ActualizarPedidoDto { fechaEntrega?, detalles[] }
   * Solo disponible para pedidos en estado PENDIENTE.
   * Retorna: { estado: "EXITO", mensaje }
   */
  update(id: string | number, data: any): Observable<any> {
    const payload: any = {
      detalles: (data.items || data.detalles || []).map((item: any) => ({
        idDetalle:     item.idDetalle  ?? null,
        idProducto:    Number(item.productId  || item.idProducto  || 1),
        cantidad:      Number(item.quantity   || item.cantidad    || 1),
        observaciones: item.customization || item.observaciones || ''
      }))
    };
    if (data.deliveryDate || data.fechaEntrega) {
      payload.fechaEntrega = data.deliveryDate || data.fechaEntrega;
    }
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * PATCH /api/v1/pedidos/{id}/cancelar?reintegrarMateriales=false
   * Cancela el pedido. Solo disponible si no está CANCELADO ni TERMINADO.
   * Retorna: { estado: "EXITO", mensaje, materialesReintegrados }
   */
  cancelar(id: string | number, reintegrarMateriales = false): Observable<any> {
    const params = new HttpParams().set('reintegrarMateriales', String(reintegrarMateriales));
    return this.http.patch<any>(`${this.apiUrl}/${id}/cancelar`, {}, { params });
  }

  /**
   * @deprecated Usar cancelar() en su lugar.
   * Mantenido para no romper referencias existentes.
   */
  delete(id: string | number): Observable<void> {
    return this.cancelar(id).pipe(map(() => undefined));
  }
}
