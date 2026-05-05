import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse, PaymentListItemDTO } from '../models/payment.dto';

/**
 * Servicio para gestión de abonos y reportes de pagos.
 *
 * AbonoController → /api/pedidos/{idPedido}/abonos  (nota: sin /v1/ en la ruta del backend)
 * ReporteController → /api/v1/reportes
 */
@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  /**
   * ⚠️ NOTA DE RUTA: El AbonoController del backend usa /api/pedidos (sin /v1/).
   * Derivamos la base desde authUrl para evitar añadir /v1/.
   */
  private readonly abonosBase = `${environment.authUrl.replace('/auth', '')}/pedidos`;
  private readonly reportesUrl = `${environment.apiUrlv2}/reportes`;
  private readonly paymentUrl = `${environment.apiUrlv2}/pagos`;
  private readonly http = inject(HttpClient);

  // ─── ABONOS ──────────────────────────────────────────────────────────────────

  /**
   * POST /api/pedidos/{idPedido}/abonos
   * Body: RegistrarAbonoRequestDto { monto, metodoPago: 'EFECTIVO'|'TRANSFERENCIA', referenciaComprobante? }
   * Retorna: AbonoResponseDto { idPago, monto, metodoPago, tipoPago, fechaPago, referenciaComprobante, nuevoSaldoPendientePedido }
   */
  registrarAbono(idPedido: number, data: {
    monto: number;
    metodoPago: 'EFECTIVO' | 'TRANSFERENCIA';
    referenciaComprobante?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.abonosBase}/${idPedido}/abonos`, data);
  }

  /**
   * PUT /api/pedidos/{idPedido}/abonos/{idPago}
   * Body: EditarAbonoRequestDto { monto, metodoPago, referenciaComprobante? }
   * Retorna: AbonoResponseDto
   */
  editarAbono(idPedido: number, idPago: number, data: {
    monto: number;
    metodoPago: 'EFECTIVO' | 'TRANSFERENCIA';
    referenciaComprobante?: string;
  }): Observable<any> {
    return this.http.put<any>(`${this.abonosBase}/${idPedido}/abonos/${idPago}`, data);
  }

  /**
   * DELETE /api/pedidos/{idPedido}/abonos/{idPago}
   * Retorna: SaldoActualizadoResponseDto { nuevoSaldoPendientePedido, mensaje }
   */
  eliminarAbono(idPedido: number, idPago: number): Observable<any> {
    return this.http.delete<any>(`${this.abonosBase}/${idPedido}/abonos/${idPago}`);
  }

  // ─── REPORTES ─────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/reportes/ingresos?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD
   * Retorna: ReporteIngresosResponseDto {
   *   totalGeneral, totalEfectivo, totalTransferencia, cantidadAbonos,
   *   detalles: [{ idPago, fechaPago, monto, metodoPago, codigoPedido, nombreCliente }]
   * }
   */
  getReporteIngresos(fechaInicio: string, fechaFin: string): Observable<any> {
    const params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);
    return this.http.get<any>(`${this.reportesUrl}/ingresos`, { params });
  }

  /**
   * GET /api/v1/reportes/ingresos/exportar?fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD
   * Retorna: archivo .xlsx (blob)
   */
  exportarReporteIngresos(fechaInicio: string, fechaFin: string): Observable<Blob> {
    const params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);
    return this.http.get(`${this.reportesUrl}/ingresos/exportar`, {
      params,
      responseType: 'blob'
    });
  }

  /**
   * GET /api/v1/reportes/saldos-pendientes
   * Retorna: ReporteSaldosPendientesResponseDto {
   *   totalPorCobrar, cantidadPedidosPendientes,
   *   pedidos: [{ idPedido, codigoPedido, nombreCliente, fechaEntrega, montoTotal, saldoPendiente }]
   * }
   */
  getSaldosPendientes(): Observable<any> {
    return this.http.get<any>(`${this.reportesUrl}/saldos-pendientes`);
  }

  /**
   * GET /api/v1/reportes/saldos-pendientes/exportar
   * Retorna: archivo .xlsx (blob)
   */
  exportarSaldosPendientes(): Observable<Blob> {
    return this.http.get(`${this.reportesUrl}/saldos-pendientes/exportar`, {
      responseType: 'blob'
    });
  }

  // ─── Compatibilidad hacia atrás ───────────────────────────────────────────────

  /** @deprecated Usar registrarAbono() con idPedido. */
  create(data: any): Observable<any> {
    const idPedido = data.idPedido ?? data.pedidoId;
    if (!idPedido) {
      console.error('PaymentService.create(): se requiere idPedido en el payload.');
      return new Observable(obs => obs.error('idPedido requerido'));
    }
    return this.registrarAbono(Number(idPedido), data);
  }

  /** @deprecated Usar eliminarAbono() con idPedido e idPago. */
  delete(id: string | number): Observable<void> {
    console.warn('PaymentService.delete(): usa eliminarAbono(idPedido, idPago) en su lugar.');
    return new Observable(obs => obs.error('Usa eliminarAbono(idPedido, idPago)'));
  }

  getPayments(page: number = 0, size: number = 10): Observable<PaginatedResponse<PaymentListItemDTO>> {
    // Set up query parameters (?page=0&size=10)
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PaginatedResponse<PaymentListItemDTO>>(this.paymentUrl, { params });
  }

  getUnifiedSaldos(): Observable<any[]> {
    return this.http.get<any>(`${this.reportesUrl}/saldos-pendientes`).pipe(
      map(res => (res.pedidos || []).map((p: any) => ({
        id: p.idPedido,
        code: p.codigoPedido || String(p.idPedido),
        client: p.nombreCliente,
        date: p.fechaEntrega,
        total: p.montoTotal,
        pending: p.saldoPendiente
      })))
    );
  }
}
