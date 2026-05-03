import { OrderClientDTO } from './client.dto';

export type OrderStatus = 'PENDING_ACCEPTANCE' | 'PENDING_PAYMENT' | 'EN_PRODUCCION' | 'IN_PRODUCTION' | 'DONE' | 'DELIVERED' | 'CANCELLED' | 'PENDIENTE' | 'TERMINADO' | 'CANCELADO';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export interface OrderProductDTO {
  idDetalle: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

/**
 * Mapea PedidoResumenDto del backend (GET /api/v1/pedidos):
 *   { idPedido, codigoUnico, nombreCliente, estadoPedido, fechaEntrega, total, saldoPendiente }
 *
 * El campo `cliente` (objeto) solo viene en PedidoDetalleCompletoDto (GET /api/v1/pedidos/{id}).
 */
export interface OrderSummaryDTO {
  // ─── Campos PedidoResumenDto (listado) ───────────────────────────────────
  idPedido:       number;
  codigoUnico:    string;
  nombreCliente:  string;         // campo directo en PedidoResumenDto
  estadoPedido:   OrderStatus;
  fechaEntrega:   string;
  total:          number | null;
  saldoPendiente: number | null;

  // ─── Campos PedidoDetalleCompletoDto (detalle) ───────────────────────────
  cliente?:   OrderClientDTO;     // solo viene en /pedidos/{id}
  idCliente?: number;             // puede venir en el cliente anidado

  // ─── Aliases legacy para compatibilidad con templates ────────────────────
  id:             string;
  code:           string | null;
  clientName:     string;
  status:         OrderStatus;
  paymentStatus:  PaymentStatus;
  totalAmount:    number;
  pendingBalance: number;
  deliveryDate:   string;
}

export interface OrderItemDTO {
  productId:     string;
  productName:   string;
  quantity:      number;
  unitPrice:     number;
  subtotal:      number;
  customization: string | null;
}

export interface OrderDetailDTO extends OrderSummaryDTO {
  productos: OrderProductDTO[];
  // Legacy fields
  client?:          any;
  items?:           OrderItemDTO[];
  paymentsHistory?: any[];
}

