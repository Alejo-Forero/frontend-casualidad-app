export type PaymentType = 'EFECTIVO' | 'TRANSFERENCIA';
export type PaymentStatus = 'PENDIENTE' | 'EN_PRODUCCION' | 'LISTO' | 'ENTREGADO' | 'CANCELADO' | 'TERMINADO';

export interface PaymentDTO {
  id: string;
  orderId: string;
  amount: number;
  type: PaymentType;
  status: PaymentStatus;
  voucherUrl: string | null;
  exceptionalAuth: boolean;
  registeredBy: { id: string; name: string };
  createdAt: string;

  clientName?: string;
}


export interface PaymentListItemDTO {
  idPago: number;
  monto: number;
  metodoPago: PaymentType;
  fechaPago: string;
  tipoPago: string;
  saldoPendiente: number;
  nombreCliente: string;
  idPedido: number;
  codigoPedido: string | null;
  estadoPedido: PaymentStatus;
}

export interface PaginatedResponse<T> {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  data: T[];
}
