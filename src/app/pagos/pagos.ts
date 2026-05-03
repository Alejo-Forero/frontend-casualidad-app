import { ListHelper } from '../shared/utils/list-helper';
import { Component, inject, OnInit, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaginationComponent } from '../shared/pagination/pagination';
import { PaymentService } from '../core/services/payment.service';

/** Shape normalizada para la tabla — compatible con el HTML existente */
interface PaymentRow {
  id: string;           // String(idPedido)
  orderId: string;      // codigoPedido
  clientName: string;
  amount: number;       // saldoPendiente
  type: 'CASH' | 'TRANSFER';
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  createdAt: string;    // fechaEntrega como ISO string
  voucherUrl: string | null;
  registeredBy: { id: string; name: string };
  exceptionalAuth: boolean;
  // extra para operaciones
  idPedido: number;
}

type PaymentStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED';
type PaymentType   = 'CASH' | 'TRANSFER';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './pagos.html',
  styleUrls: ['./pagos.css']
})
export class PagosComponent implements OnInit {

  // ─── Estado principal ─────────────────────────────────────────────────────
  paymentsData:     PaymentRow[] = [];
  filteredPayments: PaymentRow[] = [];
  paginatedPayments: PaymentRow[] = [];

  searchTerm    = '';
  currentFilter: 'ALL' | PaymentStatus = 'ALL';
  currentPage   = 1;
  pageSize      = 5;
  currentSort   = { column: '', direction: 'asc' as 'asc' | 'desc' };

  // ─── Mapas de UI ──────────────────────────────────────────────────────────
  statusMap: Record<PaymentStatus, { text: string; css: string }> = {
    'COMPLETED': { text: 'Completado',  css: 'bg-green-100 text-green-700' },
    'PENDING':   { text: 'Pendiente',   css: 'bg-orange-100 text-orange-700' },
    'CANCELLED': { text: 'Cancelado',   css: 'bg-red-100 text-red-700' }
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
  showViewModal        = false;
  showFormSuccessModal = false;
  selectedPayment: PaymentRow | null = null;

  // ─── Formulario ───────────────────────────────────────────────────────────
  viewMode: 'list' | 'add' | 'edit' = 'list';
  paymentForm: FormGroup;

  /** Lista de pedidos disponibles para el select del formulario */
  orders: string[] = [];

  // ─── Computed ─────────────────────────────────────────────────────────────
  get totalMonthlyBalance(): number {
    return this.paymentsData
      .filter(p => p.status === 'PENDING')
      .reduce((acc, p) => acc + (p.amount ?? 0), 0);
  }

  private readonly fb           = inject(FormBuilder);
  private readonly paymentService = inject(PaymentService);
  private readonly cdr           = inject(ChangeDetectorRef);
  private readonly destroyRef    = inject(DestroyRef);

  constructor() {
    // Campos que acepta el backend: monto, metodoPago (EFECTIVO|TRANSFERENCIA), referenciaComprobante
    this.paymentForm = this.fb.group({
      id:                    [''],
      idPedido:              [null, Validators.required],
      amount:                [0, [Validators.required, Validators.min(0.01)]],
      type:                  ['EFECTIVO', Validators.required],
      referenciaComprobante: ['']
    });
  }

  ngOnInit(): void {
    this.loadPayments();
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
            type:          'CASH' as PaymentType,
            status:        'PENDING' as PaymentStatus,
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
    this.currentPage   = 1;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyFilters();
  }

  handleSort(column: string): void {
    ListHelper.handleSort(this.currentSort as any, column);
    this.applyFilters();
  }

  getSortIcon(column: string): string {
    return ListHelper.getSortIcon(this.currentSort as any, column);
  }

  applyFilters(): void {
    let result = [...this.paymentsData];

    if (this.currentFilter !== 'ALL') {
      result = result.filter(p => p.status === this.currentFilter);
    }

    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(p =>
        p.id.toLowerCase().includes(term) ||
        (p.clientName?.toLowerCase().includes(term)) ||
        p.orderId.toLowerCase().includes(term)
      );
    }

    ListHelper.sortArray(result, this.currentSort as any);
    this.filteredPayments = result;

    const start = (this.currentPage - 1) * this.pageSize;
    const end   = start + this.pageSize;
    this.paginatedPayments = this.filteredPayments.slice(start, end);

    if (this.paginatedPayments.length === 0 && this.currentPage > 1) {
      this.currentPage = 1;
      this.applyFilters();
    }
  }

  // ─── Modals de vista ─────────────────────────────────────────────────────

  openViewModal(payment: PaymentRow): void {
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

  openDeleteModal(payment: PaymentRow): void {
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
    // El backend requiere idPedido + idPago. Como aquí solo tenemos el saldo
    // (no un pago individual), llamamos a getSaldosPendientes para refrescar.
    // Si se quiere eliminar un abono específico usar openDeleteAbonoModal(saldo, abono).
    console.warn('Para eliminar un abono específico, usa la vista de detalle del pedido.');
    this.closeDeleteModal();
    this.showSuccessModal = true;
    this.cdr.detectChanges();
  }

  closeSuccessModal(): void {
    this.showSuccessModal  = false;
    this.selectedPayment   = null;
    this.cdr.detectChanges();
  }

  // ─── Formulario de abono ─────────────────────────────────────────────────

  openAddForm(): void {
    this.paymentForm.reset({
      id:                    '',
      idPedido:              null,
      amount:                0,
      type:                  'EFECTIVO',
      referenciaComprobante: ''
    });
    this.viewMode = 'add';
    this.cdr.detectChanges();
  }

  openEditForm(payment: PaymentRow): void {
    this.selectedPayment = payment;
    this.paymentForm.patchValue({
      id:                    payment.id,
      idPedido:              payment.idPedido,
      amount:                payment.amount,
      type:                  this.mapPaymentType(payment.type),
      referenciaComprobante: ''
    });
    this.viewMode = 'edit';
    this.cdr.detectChanges();
  }

  closeForm(): void {
    this.viewMode        = 'list';
    this.selectedPayment = null;
    this.cdr.detectChanges();
  }

  savePayment(): void {
    if (!this.paymentForm.valid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const { idPedido, amount, type, referenciaComprobante } = this.paymentForm.value;
    // El backend acepta: { monto, metodoPago: EFECTIVO|TRANSFERENCIA, referenciaComprobante? }
    const payload = {
      monto:                Number(amount),
      metodoPago:           type as 'EFECTIVO' | 'TRANSFERENCIA',
      referenciaComprobante: referenciaComprobante || undefined
    };

    const request$ = this.paymentService.registrarAbono(Number(idPedido), payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.showFormSuccessModal = true;
        this.cdr.detectChanges();
        this.loadPayments();
      },
      error: (err: unknown) => console.error('Error guardando abono', err)
    });
  }

  closeFormSuccessModal(goToList: boolean): void {
    this.showFormSuccessModal = false;
    if (goToList) {
      this.viewMode = 'list';
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
}
