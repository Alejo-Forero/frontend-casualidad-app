export interface MesIngresoDTO {
  etiqueta: string;
  total: number;
}

export interface DashboardDTO {
  pendingOrders: number;
  ordersInProduction: number;
  ordersWithDebt: number;
  overdueOrders: number;
  lowStockCount: number;
  ingresosMesActual?: number;
  ingresosMesAnterior?: number;
  ingresosPorMes?: MesIngresoDTO[];
  // Estructura heredada para el gráfico
  profitVsExpense: {
    months: string[];
    profit: number[];
    expense: number[];
  };
}
