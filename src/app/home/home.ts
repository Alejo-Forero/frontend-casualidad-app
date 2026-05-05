import { Component, AfterViewInit, ElementRef, ViewChild, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { DashboardDTO } from '../core/models/dashboard.dto';

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
    ordersWithDebt: 0,
    profitVsExpense: {
      months: [],
      profit: [],
      expense: []
    },
    lowStockCount: 0
  };

  constructor() {
    Chart.register(...registerables);
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
            label: 'Ganancias',
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
