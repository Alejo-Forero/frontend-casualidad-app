import { OrderClientDTO } from './client.dto';

export type OrderStatus = 'PENDING_ACCEPTANCE' | 'PENDING_PAYMENT' | 'EN_PRODUCCION' | 'IN_PRODUCTION' | 'DONE' | 'DELIVERED' | 'CANCELLED' | 'PENDIENTE' | 'TERMINADO' | 'CANCELADO';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export interface OrderProductDTO {
  idDetalle: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  observaciones?: string;
}

export interface OrderSummaryDTO {
  idPedido:       number;
  codigoUnico:    string;
  nombreCliente:  string;
  estadoPedido:   OrderStatus;
  fechaEntrega:   string;
  total:          number | null;
  saldoPendiente: number | null;

  // Campos opcionales para detalle
  cliente?:   OrderClientDTO;
  idCliente?: number;

  // Aliases legacy
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
  productId:     string | number;
  productName:   string;
  quantity:      number;
  unitPrice:     number;
  subtotal:      number;
  customization?: string | null;
  observaciones?: string | null;
  idDetalle?:     number | null;
}

export interface OrderDetailDTO extends OrderSummaryDTO {
  productos: OrderProductDTO[];
  client?:          OrderClientDTO;
  items?:           OrderItemDTO[];
  historialAbonos?: {
    data: any[];
    totalElements: number;
  };
  paymentsHistory?: any[];
}

export interface CreateOrderDTO {
  idCliente:    number;
  idUsuario:    number;
  fechaEntrega: string;
  detalles: {
    idProducto:    number;
    cantidad:      number;
    observaciones: string;
  }[];
}

export interface UpdateOrderDTO {
  fechaEntrega?: string;
  detalles: {
    idDetalle?:    number | null;
    idProducto:    number;
    cantidad:      number;
    observaciones: string;
  }[];
}
