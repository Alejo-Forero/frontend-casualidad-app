import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { OrderSummaryDTO, OrderDetailDTO, CreateOrderDTO, UpdateOrderDTO } from '../models/order.dto';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly apiUrl = `${environment.apiUrl}/pedidos`;
  private readonly http = inject(HttpClient);
  private _orderDraft: any = null;

  setOrderDraft(draft: any) {
    this._orderDraft = draft;
  }

  getOrderDraft(): any {
    return this._orderDraft;
  }

  clearOrderDraft() {
    this._orderDraft = null;
  }

  getAll(filtros?: {
    idCliente?: number;
    estado?: string;
    fechaInicio?: string;
    fechaFin?: string;
    page?: number;
    size?: number;
  }): Observable<OrderSummaryDTO[]> {
    let params = new HttpParams()
      .set('page', String(filtros?.page ?? 0))
      .set('size', String(filtros?.size ?? 100));

    if (filtros?.idCliente) params = params.set('idCliente', String(filtros.idCliente));
    if (filtros?.estado)    params = params.set('estado', filtros.estado);
    if (filtros?.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
    if (filtros?.fechaFin)    params = params.set('fechaFin', filtros.fechaFin);

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => {
        const items: any[] = res?.data ?? res?.content ?? [];
        return items.map(p => this.mapOrderSummary(p));
      })
    );
  }

  private mapOrderSummary(p: any): OrderSummaryDTO {
    const idPedido = p.idPedido;
    return {
      idPedido:       idPedido,
      codigoUnico:    p.codigoUnico,
      nombreCliente:  p.nombreCliente,
      estadoPedido:   p.estadoPedido,
      fechaEntrega:   p.fechaEntrega,
      total:          p.total,
      saldoPendiente: p.saldoPendiente,
      id:             idPedido ? String(idPedido) : `tmp-${crypto.getRandomValues(new Uint32Array(1))[0] % 1000000}`,
      code:           p.codigoUnico,
      status:         p.estadoPedido,
      clientName:     p.nombreCliente ?? '',
      totalAmount:    p.total ?? 0,
      pendingBalance: p.saldoPendiente ?? 0,
      deliveryDate:   p.fechaEntrega,
      paymentStatus:  Number(p.saldoPendiente) === 0 ? 'PAID' : 'PARTIAL',
      cliente: { nombreCompleto: p.nombreCliente ?? '', idCliente: p.idCliente ?? null, telefono: '' }
    };
  }

  getById(id: string | number, abonosPage = 0, abonosSize = 5): Observable<OrderDetailDTO> {
    const params = new HttpParams()
      .set('abonosPage', String(abonosPage))
      .set('abonosSize', String(abonosSize));
    return this.http.get<OrderDetailDTO>(`${this.apiUrl}/${id}`, { params });
  }

  create(data: any): Observable<OrderDetailDTO> {
    console.log('DEBUG - Data received in OrderService:', data);

    // El idCliente debe ser un String (UUID) según la imagen de Postman
    const idCliente = data.clientId ?? data.idCliente ?? data.id_cliente ?? 1;

    const payload: any = {
      // Duplicidad de campos para máxima compatibilidad
      idCliente:    idCliente,
      id_cliente:   idCliente,
      idUsuario:    Number(data.idUsuario ?? localStorage.getItem('userId') ?? 1),
      id_usuario:   Number(data.idUsuario ?? localStorage.getItem('userId') ?? 1),
      fechaEntrega: data.deliveryDate ?? data.fechaEntrega ?? new Date().toISOString().split('T')[0],
      fecha_entrega: data.deliveryDate ?? data.fechaEntrega ?? new Date().toISOString().split('T')[0],
      detalles: (data.items || data.detalles || []).map((item: any) => ({
        idProducto:    Number(item.productId ?? item.idProducto ?? 0),
        id_producto:   Number(item.productId ?? item.idProducto ?? 0),
        cantidad:      Number(item.quantity ?? item.cantidad ?? 1),
        observaciones: item.observaciones ?? item.customization ?? ''
      }))
    };

    console.log('DEBUG - Payload con UUID String:', payload);
    return this.http.post<OrderDetailDTO>(this.apiUrl, payload);
  }

  activarProduccion(idPedido: number): Observable<{ mensaje: string; codigoUnico: string; estado: string }> {
    return this.http.post<{ mensaje: string; codigoUnico: string; estado: string }>(`${this.apiUrl}/${idPedido}/activar-produccion`, {});
  }

  update(id: string | number, data: any): Observable<{ estado: string; mensaje: string }> {
    const payload: UpdateOrderDTO = {
      detalles: (data.items || data.detalles || []).map((item: any) => {
        const mapped = this.mapOrderItem(item);
        return { ...mapped, idDetalle: item.idDetalle ?? null };
      })
    };
    if (data.deliveryDate || data.fechaEntrega) {
      payload.fechaEntrega = data.deliveryDate || data.fechaEntrega;
    }
    return this.http.put<{ estado: string; mensaje: string }>(`${this.apiUrl}/${id}`, payload);
  }

  cancelar(id: string | number, reintegrarMateriales = false): Observable<{ estado: string; mensaje: string }> {
    const params = new HttpParams().set('reintegrarMateriales', String(reintegrarMateriales));
    return this.http.delete<{ estado: string; mensaje: string }>(`${this.apiUrl}/${id}/cancelar`, { params });
  }

  delete(id: string | number): Observable<void> {
    return this.cancelar(id).pipe(map(() => undefined));
  }

  private mapOrderItem(item: any) {
    return {
      idProducto:    Number(item.productId || item.idProducto || 1),
      cantidad:      Number(item.quantity  || item.cantidad   || 1),
      observaciones: item.customization || item.observaciones || ''
    };
  }
}
