import { ListHelper } from '../shared/utils/list-helper';
import { Component, inject, OnInit, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { PaymentService } from '../core/services/payment.service';
import { PaymentListItemDTO } from '../core/models/payment.dto';
import { Observable } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { AfterViewInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

/** Shape normalizada para la tabla — compatible con el HTML existente */
interface PaymentRow {
  id: string;           // String(idPedido)
  orderId: string;      // codigoPedido
  clientName: string;
  amount: number;       // saldoPendiente
  type: 'EFECTIVO' | 'TRANSFERENCIA';
  status: 'TERMINADO' | 'PENDIENTE' | 'CANCELADO' | 'EN_PRODUCCION';
  createdAt: string;    // fechaEntrega como ISO string
  voucherUrl: string | null;
  registeredBy: { id: string; name: string };
  exceptionalAuth: boolean;
  // extra para operaciones
  idPedido: number;
}

export type PaymentStatus = 'TERMINADO' | 'PENDIENTE' | 'CANCELADO' | 'EN_PRODUCCION';
export type PaymentType   = 'EFECTIVO' | 'TRANSFERENCIA';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule
  ],
  templateUrl: './pagos.html',
  styleUrls: ['./pagos.css']
})
export class PagosComponent implements OnInit, AfterViewInit {

  // ─── Estado principal ─────────────────────────────────────────────────────
  paymentsData:     PaymentRow[] = [];
  paymentsListed: PaymentListItemDTO[] = [];
  
  dataSource = new MatTableDataSource<PaymentListItemDTO>([]);
  displayedColumns: string[] = ['idPago', 'cliente', 'estado', 'fecha', 'metodo', 'monto', 'acciones'];

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  searchTerm    = '';
  currentFilter: 'ALL' | PaymentStatus = 'ALL';

  // ─── Mapas de UI ──────────────────────────────────────────────────────────
  statusMap: Record<string, { text: string; css: string }> = {
    'TERMINADO': { text: 'Completado',  css: 'bg-green-100 text-green-700' },
    'EN_PRODUCCION': { text: 'En Producción',  css: 'bg-blue-100 text-blue-700' },
    'PENDIENTE':   { text: 'Pendiente',   css: 'bg-orange-100 text-orange-700' },
    'CANCELADO': { text: 'Cancelado',   css: 'bg-red-100 text-red-700' }
  };

  typeMap: Record<string, { text: string; icon: string }> = {
    'EFECTIVO':      { text: 'Efectivo',      icon: 'payments' },
    'TRANSFERENCIA': { text: 'Transferencia', icon: 'account_balance' },
    // aliases por compatibilidad con datos históricos
    'CASH':     { text: 'Efectivo',      icon: 'payments' },
    'TRANSFER': { text: 'Transferencia', icon: 'account_balance' }
  };

  // ─── Modals ───────────────────────────────────────────────────────────────
  showDeleteModal      = false;
  showSuccessModal     = false;
  showErrorModal       = false;
  errorMessage         = '';
  showViewModal        = false;
  showFormSuccessModal = false;
  selectedPayment: PaymentListItemDTO | null = null;
  isMobile = false;

  // ─── Formulario ───────────────────────────────────────────────────────────
  viewMode: 'list' | 'add' | 'edit' = 'list';
  paymentForm: FormGroup;

  /** Lista de pedidos disponibles para el select del formulario */
  orders: string[] = [];

  // ─── Computed ─────────────────────────────────────────────────────────────
  get totalMonthlyBalance(): number {
    return this.paymentsListed
      .filter(p => p.estadoPedido === 'PENDIENTE')
      .reduce((acc, p) => acc + (p.monto ?? 0), 0);
  }

  private readonly fb           = inject(FormBuilder);
  private readonly paymentService = inject(PaymentService);
  private readonly cdr           = inject(ChangeDetectorRef);
  private readonly destroyRef    = inject(DestroyRef);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);

  constructor() {
    this.breakpointObserver.observe([Breakpoints.Handset, Breakpoints.TabletPortrait]).subscribe(result => {
      this.isMobile = result.matches;
      this.cdr.markForCheck();
    });

    // Campos que acepta el backend: monto, metodoPago (EFECTIVO|TRANSFERENCIA), referenciaComprobante
    this.paymentForm = this.fb.group({
      id:                    [''],
      idPedido:              [null, Validators.required],
      amount:                [null, [Validators.required, Validators.min(0.01)]],
      type:                  ['EFECTIVO', Validators.required],
      referenciaComprobante: ['']
    });
  }

  ngOnInit(): void {
    this.loadPayments();
    this.fetchPayments();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator || null;
    this.dataSource.sort = this.sort || null;
    
    this.dataSource.filterPredicate = (data, filter) => {
      const dataStr = `${data.idPago} ${data.nombreCliente} ${data.estadoPedido} ${data.fechaPago} ${data.metodoPago}`.toLowerCase();
      const matchSearch = dataStr.includes(this.searchTerm.trim().toLowerCase());
      const matchFilter = this.currentFilter === 'ALL' || data.estadoPedido === this.currentFilter;
      return matchSearch && matchFilter;
    };

    this.dataSource.sortingDataAccessor = (item, property) => {
      switch(property) {
        case 'idPago': return item.idPago || '';
        case 'cliente': return item.nombreCliente || '';
        case 'estado': return item.estadoPedido || '';
        case 'fecha': return item.fechaPago ? new Date(item.fechaPago).getTime() : 0;
        case 'metodo': return item.metodoPago || '';
        case 'monto': return item.monto || 0;
        default: return (item as any)[property] as string | number ?? '';
      }
    };
  }

  fetchPayments(): void {
    this.paymentService.getPayments(0, 1000).subscribe({
      next: (response: any) => {
        this.paymentsListed = response.data;
        this.dataSource.data = this.paymentsListed;
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error fetching payments from the backend', err);
      }
    });
  }

  // ─── Carga ────────────────────────────────────────────────────────────────

  loadPayments(): void {
    this.paymentService.getSaldosPendientes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          const pedidos: any[] = res.pedidos ?? [];
          this.paymentsData = pedidos.map(s => ({
            idPedido:      s.idPedido,
            id:            String(s.idPedido),
            orderId:       s.codigoPedido ?? String(s.idPedido),
            clientName:    s.nombreCliente ?? 'Desconocido',
            amount:        Number(s.saldoPendiente) || 0,
            type:          'EFECTIVO' as PaymentType,
            status:        'PENDIENTE' as PaymentStatus,
            createdAt:     s.fechaEntrega ?? new Date().toISOString(),
            voucherUrl:    null,
            registeredBy:  { id: '', name: 'N/A' },
            exceptionalAuth: false
          }));
          // Poblar el select de pedidos en el formulario
          this.orders = this.paymentsData.map(p => `${p.orderId} - ${p.clientName}`);
          this.applyFilters();
          this.cdr.detectChanges();
        },
        error: (err: unknown) => console.error('Error loading saldos pendientes', err)
      });
  }

  // ─── Filtros y paginación ─────────────────────────────────────────────────

  setFilter(filter: 'ALL' | PaymentStatus): void {
    this.currentFilter = filter;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    // Al setear el filter con Math.random() forzamos la reevaluación del filterPredicate
    this.dataSource.filter = Math.random().toString();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // ─── Modals de vista ─────────────────────────────────────────────────────

  openViewModal(payment: PaymentListItemDTO): void {
    this.selectedPayment = payment;
    this.showViewModal   = true;
    this.cdr.detectChanges();
  }

  closeViewModal(): void {
    this.showViewModal = false;
    if (!this.showDeleteModal) { this.selectedPayment = null; }
    this.cdr.detectChanges();
  }

  // ─── Eliminar ────────────────────────────────────────────────────────────

  openDeleteModal(payment: PaymentListItemDTO): void {
    this.selectedPayment = payment;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    if (!this.showViewModal) { this.selectedPayment = null; }
    this.cdr.detectChanges();
  }

  confirmDelete(): void {
    if (!this.selectedPayment) { return; }
    this.paymentService.eliminarAbono(this.selectedPayment.idPedido, this.selectedPayment.idPago).subscribe({
      next: () => {
         console.warn('Para eliminar un abono específico, usa la vista de detalle del pedido.');
        this.closeDeleteModal();
        this.showSuccessModal = true;
        this.loadPayments();
        this.fetchPayments();
        this.cdr.detectChanges();

      },
      error: (err) => {
        console.error('Error eliminando pago', err);
        this.errorMessage = 'No se pudo eliminar el abono. Verifica si el abono aún existe o si tienes permisos.';
        this.closeDeleteModal();
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
    // El backend requiere idPedido + idPago. Como aquí solo tenemos el saldo
    // (no un pago individual), llamamos a getSaldosPendientes para refrescar.
    // Si se quiere eliminar un abono específico usar openDeleteAbonoModal(saldo, abono).

  }

  closeSuccessModal(): void {
    this.showSuccessModal  = false;
    this.selectedPayment   = null;
    this.cdr.detectChanges();
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  // ─── Formulario de abono ─────────────────────────────────────────────────

  openAddForm(): void {
    this.paymentForm.reset({
      id:                    '',
      idPedido:              null,
      amount:                null,
      type:                  'EFECTIVO',
      referenciaComprobante: ''
    });
    this.viewMode = 'add';
    this.cdr.detectChanges();
  }

  openEditForm(payment: PaymentListItemDTO): void {
    this.selectedPayment = payment;
    this.paymentForm.patchValue({
      id:                    payment.idPago,
      idPedido:              payment.idPedido,
      amount:                payment.monto,
      type:                  this.mapPaymentType(payment.metodoPago),
      referenciaComprobante: ''
    });
    this.viewMode = 'edit';
    this.cdr.detectChanges();
  }

  closeForm(): void {
    this.viewMode        = 'list';
    this.selectedPayment = null;
    setTimeout(() => {
      this.dataSource.paginator = this.paginator || null;
      this.dataSource.sort = this.sort || null;
      this.cdr.detectChanges();
    }, 0);
  }

  getMaxAmount(): number {
    const idPedido = this.paymentForm.get('idPedido')?.value;
    if (!idPedido) return 0;
    const pedido = this.paymentsData.find(p => p.idPedido === Number(idPedido));
    return pedido ? pedido.amount : 0;
  }

  hasAmountError(): boolean {
    const max = this.getMaxAmount();
    const current = this.paymentForm.get('amount')?.value;
    if (current === null || current === undefined || current === '') return false;
    return Number(current) > max;
  }

  savePayment(): void {
    if (!this.paymentForm.valid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const { id,idPedido, amount, type, referenciaComprobante } = this.paymentForm.value;
    // El backend acepta: { monto, metodoPago: EFECTIVO|TRANSFERENCIA, referenciaComprobante? }
    const payload = {
      monto:                Number(amount),
      metodoPago:           type as 'EFECTIVO' | 'TRANSFERENCIA',
      referenciaComprobante: referenciaComprobante || undefined
    };
    let request$ ={} as Observable<any>;
    if (this.viewMode === 'edit' && id) {
       request$ = this.paymentService.editarAbono(Number(idPedido), Number(id), payload);
    }
    if (this.viewMode === 'add' && idPedido) {
        request$ = this.paymentService.registrarAbono(Number(idPedido), payload);
    }


    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.showFormSuccessModal = true;
        this.cdr.detectChanges();
        this.loadPayments();
        this.fetchPayments();
      },
      error: (err: unknown) => console.error('Error guardando abono', err)
    });
  }

  closeFormSuccessModal(goToList: boolean): void {
    this.showFormSuccessModal = false;
    if (goToList) {
      this.viewMode = 'list';
      setTimeout(() => {
        this.dataSource.paginator = this.paginator || null;
        this.dataSource.sort = this.sort || null;
        this.cdr.detectChanges();
      }, 0);
    } else if (this.viewMode === 'add') {
      this.openAddForm();
    }
    this.cdr.detectChanges();
  }

  private mapPaymentType(type: string): string {
    if (type === 'CASH') { return 'EFECTIVO'; }
    if (type === 'TRANSFER') { return 'TRANSFERENCIA'; }
    return type;
  }

  verReportes() {
    this.router.navigate(['/reportes']);
  }
}
