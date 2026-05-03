export type PaymentType = 'CASH' | 'TRANSFER';
export type PaymentStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED';

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
