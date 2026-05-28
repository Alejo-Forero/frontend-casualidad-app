import { Component, AfterViewInit, ElementRef, ViewChild, PLATFORM_ID, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { DashboardDTO } from '../core/models/dashboard.dto';
import { PaymentService } from '../core/services/payment.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements AfterViewInit {
  @ViewChild('casualChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private readonly platformId = inject(PLATFORM_ID);
  chartInstance: Chart | undefined;

  dashboardData: DashboardDTO = {
    pendingOrders: 0,
    ordersInProduction: 0,
    ordersWithDebt: 0,
    overdueOrders: 0,
    lowStockCount: 0,
    ingresosMesActual: 0,
    ingresosMesAnterior: 0,
    ingresosPorMes: [],
    profitVsExpense: {
      months: [],
      profit: [],
      expense: []
    }
  };

  private readonly paymentService = inject(PaymentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  dashboardCards: any[] = [];

  constructor() {
    Chart.register(...registerables);
    this.initDashboardCards();
    this.loadData();
  }

  private initDashboardCards(): void {
    this.dashboardCards = [
      {
        title: 'Ingresos de este Mes',
        value: this.dashboardData.ingresosMesActual ?? 0,
        isCurrency: true,
        icon: 'trending_up',
        iconClass: 'text-orange-600',
        trend: '—',
        trendText: 'vs mes pasado',
        link: '/reportes'
      },
      {
        title: 'Por Entregar',
        value: this.dashboardData.pendingOrders,
        isCurrency: false,
        icon: 'pending_actions',
        iconClass: 'text-blue-500',
        link: '/pedidos',
        footer: 'Pedidos en estado pendiente'
      },
      {
        title: 'Con Saldo Pendiente',
        value: this.dashboardData.ordersWithDebt,
        isCurrency: false,
        icon: 'money_off',
        iconClass: 'text-orange-500',
        link: '/pagos',
        footer: 'Requieren gestión de cobro'
      },
      {
        title: 'Pedidos Vencidos',
        value: this.dashboardData.overdueOrders,
        isCurrency: false,
        icon: 'event_busy',
        iconClass: 'text-red-600',
        link: '/pedidos',
        footer: 'Fecha de entrega superada'
      },
      {
        title: 'Stock Crítico',
        value: this.dashboardData.lowStockCount,
        isCurrency: false,
        icon: 'inventory_2',
        iconClass: 'text-red-500',
        link: '/inventario',
        footer: 'Insumos bajo el mínimo'
      }
    ];
  }

  private updateDashboardCards(): void {
    const actual = this.dashboardData.ingresosMesActual ?? 0;
    const anterior = this.dashboardData.ingresosMesAnterior ?? 0;
    const trend = anterior > 0
      ? ((actual - anterior) / anterior * 100).toFixed(1) + '%'
      : '—';

    this.dashboardCards[0].value = actual;
    this.dashboardCards[0].trend = trend;
    this.dashboardCards[1].value = this.dashboardData.pendingOrders;
    this.dashboardCards[2].value = this.dashboardData.ordersWithDebt;
    this.dashboardCards[3].value = this.dashboardData.overdueOrders;
    this.dashboardCards[4].value = this.dashboardData.lowStockCount;
  }

  private loadData(): void {
    this.paymentService.getDashboard().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.dashboardData.ingresosMesActual   = Number(res?.ingresosMesActual ?? 0);
        this.dashboardData.ingresosMesAnterior = Number(res?.ingresosMesAnterior ?? 0);
        this.dashboardData.pendingOrders       = res?.pedidosPendientes ?? 0;
        this.dashboardData.ordersInProduction  = res?.pedidosEnProduccion ?? 0;
        this.dashboardData.ordersWithDebt      = res?.pedidosConSaldo ?? 0;
        this.dashboardData.overdueOrders       = res?.pedidosVencidos ?? 0;
        this.dashboardData.lowStockCount       = res?.stockCritico ?? 0;
        this.dashboardData.ingresosPorMes      = res?.ingresosPorMes ?? [];

        // Actualizar datos del gráfico con los últimos 6 meses reales
        if (res?.ingresosPorMes?.length) {
          this.dashboardData.profitVsExpense.months = res.ingresosPorMes.map((m: any) => m.etiqueta);
          this.dashboardData.profitVsExpense.profit  = res.ingresosPorMes.map((m: any) => Number(m.total));
          this.dashboardData.profitVsExpense.expense = new Array(res.ingresosPorMes.length).fill(0);
        }

        this.updateDashboardCards();

        if (this.chartInstance) {
          this.chartInstance.data.labels = this.dashboardData.profitVsExpense.months;
          this.chartInstance.data.datasets[0].data = this.dashboardData.profitVsExpense.profit;
          this.chartInstance.data.datasets[1].data = this.dashboardData.profitVsExpense.expense;
          this.chartInstance.update();
        }

        this.cdr.detectChanges();
      },
      error: () => {
        // Si el endpoint aún no está disponible, no romper la UI
        this.cdr.detectChanges();
      }
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId) && this.chartCanvas) {
      this.initChart();
    }
  }

  get totalProfit(): number {
    return this.dashboardData.profitVsExpense.profit.reduce((a, b) => a + b, 0);
  }

  get totalExpense(): number {
    return this.dashboardData.profitVsExpense.expense.reduce((a, b) => a + b, 0);
  }

  get netBalance(): number {
    return this.totalProfit - this.totalExpense;
  }

  private initChart(): void {
    const ctx = this.chartCanvas?.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.dashboardData.profitVsExpense.months,
        datasets: [
          {
            label: 'Ingresos',
            data: this.dashboardData.profitVsExpense.profit,
            backgroundColor: '#fd8e4a',
            borderColor: '#974300',
            borderWidth: 0,
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.8
          },
          {
            label: 'Gastos',
            data: this.dashboardData.profitVsExpense.expense,
            backgroundColor: '#d6d3d1',
            borderColor: '#a8a29e',
            borderWidth: 0,
            borderRadius: 4,
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 11, weight: 'bold' },
              color: '#a8a29e'
            },
            border: { display: false }
          },
          y: {
            grid: { color: '#f5f5f4', lineWidth: 1 },
            border: { display: false },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 11, weight: 'bold' },
              color: '#a8a29e',
              callback: function (value) {
                return '$' + (Number(value) / 1000) + 'k';
              }
            },
            beginAtZero: true
          }
        }
      }
    });
  }
}
