import { Component, OnInit, ViewChild, ChangeDetectorRef, DestroyRef, inject, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IncomeReportDTO, PendingBalanceDTO, TopProductDTO } from '../core/models/report.dto';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { PaymentService } from '../core/services/payment.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatPaginatorModule, MatSortModule],
  templateUrl: './reportes.html',
  styleUrls: ['./reportes.css']
})
export class ReportesComponent implements OnInit, AfterViewInit {
  private readonly paymentService = inject(PaymentService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  incomeReport: IncomeReportDTO = {
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    totalIncome: 0,
    cashTotal: 0,
    transferTotal: 0,
    breakdown: []
  };

  dataSource = new MatTableDataSource<PendingBalanceDTO>([]);
  displayedColumns: string[] = ['cliente', 'codigo', 'fechaEntrega', 'montoTotal', 'pendiente'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  topProducts: TopProductDTO[] = [];

  ngOnInit() {
    this.fetchIngresos();
    this.fetchSaldos();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  get cashPercentage(): number {
    if (this.incomeReport.totalIncome === 0) return 0;
    return (this.incomeReport.cashTotal / this.incomeReport.totalIncome) * 100;
  }

  get transferPercentage(): number {
    if (this.incomeReport.totalIncome === 0) return 0;
    return (this.incomeReport.transferTotal / this.incomeReport.totalIncome) * 100;
  }

  onDateChange() {
    this.fetchIngresos();
  }

  fetchIngresos() {
    this.paymentService.getReporteIngresos(this.incomeReport.dateFrom, this.incomeReport.dateTo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.incomeReport.totalIncome = res?.totalGeneral || 0;
          this.incomeReport.cashTotal = res?.totalEfectivo || 0;
          this.incomeReport.transferTotal = res?.totalTransferencia || 0;
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Error fetching ingresos:', err)
      });
  }

  fetchSaldos() {
    this.paymentService.getUnifiedSaldos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any[]) => {
          this.dataSource.data = res.map(p => {
             const deliveryDate = new Date(p.date);
             const diffTime = deliveryDate.getTime() - Date.now();
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
             return {
               orderId: String(p.id),
               orderCode: p.code,
               clientName: p.client,
               deliveryDate: p.date,
               totalAmount: p.total,
               pendingBalance: p.pending,
               daysUntilDelivery: diffDays
             };
          });
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Error fetching saldos:', err)
      });
  }

  exportExcel() {
    this.paymentService.exportarSaldosPendientes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (blob: Blob) => {
        const url = globalThis.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Saldos_Pendientes_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        globalThis.URL.revokeObjectURL(url);
      },
      error: (err: any) => console.error('Error exportando:', err)
    });
  }

  // Ranking colors
  getRankColorClass(rank: number): string {
    switch (rank) {
      case 1: return 'bg-primary text-on-primary';
      case 2: return 'bg-secondary text-on-secondary';
      case 3: return 'bg-tertiary-fixed-dim text-on-tertiary';
      default: return 'bg-neutral-200 text-neutral-600';
    }
  }

  getRankProgressClass(rank: number): string {
    switch (rank) {
      case 1: return 'bg-primary';
      case 2: return 'bg-secondary';
      case 3: return 'bg-tertiary-fixed-dim';
      default: return 'bg-neutral-300';
    }
  }
}
