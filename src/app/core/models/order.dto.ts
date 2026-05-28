import { OrderClientDTO } from './client.dto';

export type OrderStatus =
  | 'PENDIENTE' | 'EN_PRODUCCION' | 'LISTO' | 'ENTREGADO' | 'CANCELADO'
  // Aliases legacy
  | 'PENDING_ACCEPTANCE' | 'PENDING_PAYMENT' | 'IN_PRODUCTION' | 'DONE' | 'DELIVERED' | 'CANCELLED' | 'TERMINADO';

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export interface HistorialEstadoDTO {
  estadoAnterior: OrderStatus | null;
  estadoNuevo: OrderStatus;
  fechaCambio: string;
  usuarioResponsable: string;
}

export interface ResumenDisponibilidadDTO {
  nombreInsumo: string;
  unidad: string;
  requerido: number;
  disponible: number;
  esSuficiente: boolean;
}

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
  code:           string | undefined;
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
  customization?: string;
  observaciones?: string | null;
  idDetalle?:     number | null;
}

export interface OrderDetailDTO extends OrderSummaryDTO {
  productos: OrderProductDTO[];
  fechaEntregaReal?: string | null;
  client?:          OrderClientDTO;
  items?:           OrderItemDTO[];
  historialAbonos?: {
    data: any[];
    totalElements: number;
  };
  paymentsHistory?: any[];
  historialEstados?: HistorialEstadoDTO[];
  disponibilidadInsumos?: ResumenDisponibilidadDTO[];
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
