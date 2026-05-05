export const STATUS_MAP: Record<string, { text: string, css: string }> = {
  'PENDIENTE': { text: 'Pendiente de Abono', css: 'bg-orange-100 text-orange-700' },
  'EN_PRODUCCION': { text: 'En Producción', css: 'bg-blue-100 text-blue-700' },
  'TERMINADO': { text: 'Terminado', css: 'bg-green-100 text-green-700' },
  'CANCELADO': { text: 'Cancelado', css: 'bg-red-100 text-red-700' },
  // Aliases legacy
  'PENDING_ACCEPTANCE': { text: 'Pendiente de Aceptación', css: 'bg-orange-100 text-orange-700' },
  'PENDING_PAYMENT': { text: 'Pendiente de Pago', css: 'bg-orange-100 text-orange-700' },
  'IN_PRODUCTION': { text: 'En Producción', css: 'bg-blue-100 text-blue-700' },
  'DONE': { text: 'Terminado', css: 'bg-green-100 text-green-700' },
  'DELIVERED': { text: 'Entregado', css: 'bg-green-100 text-green-700' },
  'CANCELLED': { text: 'Cancelado', css: 'bg-red-100 text-red-700' }
};
