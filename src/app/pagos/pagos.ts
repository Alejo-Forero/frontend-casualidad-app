import { Component, inject, OnInit, ChangeDetectorRef, DestroyRef, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PaymentService } from '../core/services/payment.service';
import { PaymentListItemDTO } from '../core/models/payment.dto';
import { Observable, EMPTY } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SuccessDialogComponent, SuccessDialogResult } from '../shared/components/success-dialog/success-dialog';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog';
import { STATUS_MAP } from '../shared/constants/ui-constants';
import { ListHelper } from '../shared/utils/list-helper';
import { BaseTableComponent } from '../shared/components/base-table.component';
import { ScreenSizeService } from '../core/services/screen-size.service';
import { UIService } from '../core/services/ui.service';

/** Shape normalizada para la tabla — compatible con el HTML existente */
interface PaymentRow {
  id: string;           // String(idPedido)
  orderId: string;      // codigoPedido
  clientName: string;
  amount: number;       // saldoPendiente
  type: 'EFECTIVO' | 'TRANSFERENCIA';
  status: 'PENDIENTE' | 'EN_PRODUCCION' | 'LISTO' | 'ENTREGADO' | 'CANCELADO' | 'TERMINADO';
  createdAt: string;    // fechaEntrega como ISO string
  voucherUrl: string | null;
  registeredBy: { id: string; name: string };
  exceptionalAuth: boolean;
  // extra para operaciones
  idPedido: number;
}

export type PaymentStatus = 'PENDIENTE' | 'EN_PRODUCCION' | 'LISTO' | 'ENTREGADO' | 'CANCELADO' | 'TERMINADO';
export type PaymentType = 'EFECTIVO' | 'TRANSFERENCIA';

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
    MatSortModule,
    MatDialogModule
  ],
  templateUrl: './pagos.html',
  styleUrls: ['./pagos.css']
})
export class PagosComponent extends BaseTableComponent<PaymentListItemDTO> implements OnInit, AfterViewInit {

  // ─── Estado principal ─────────────────────────────────────────────────────
  paymentsData: PaymentRow[] = [];
  paymentsListed: PaymentListItemDTO[] = [];

  dataSource = new MatTableDataSource<PaymentListItemDTO>([]);
  displayedColumns: string[] = ['idPago', 'cliente', 'estado', 'fecha', 'metodo', 'monto', 'acciones'];

  searchTerm = '';
  currentFilter: 'ALL' | PaymentStatus = 'ALL';

  // ─── Mapas de UI ──────────────────────────────────────────────────────────
  statusMap = STATUS_MAP;

  typeMap: Record<string, { text: string; icon: string }> = {
    'EFECTIVO': { text: 'Efectivo', icon: 'payments' },
    'TRANSFERENCIA': { text: 'Transferencia', icon: 'account_balance' },
    // aliases por compatibilidad con datos históricos
    'CASH': { text: 'Efectivo', icon: 'payments' },
    'TRANSFER': { text: 'Transferencia', icon: 'account_balance' }
  };

  // ─── Modals ───────────────────────────────────────────────────────────────
  errorMessage = '';
  showViewModal = false;
  selectedPayment: PaymentListItemDTO | null = null;
  readonly screenSize = inject(ScreenSizeService);

  // ─── Formulario ───────────────────────────────────────────────────────────
  viewMode: 'list' | 'add' | 'edit' = 'list';
  paymentForm: FormGroup;

  /** Lista de pedidos disponibles para el select del formulario */
  orders: string[] = [];

  // ─── Computed ─────────────────────────────────────────────────────────────
  get totalMonthlyBalance(): number {
    const ESTADOS_CON_SALDO = ['PENDIENTE', 'EN_PRODUCCION', 'LISTO'];
    return this.paymentsListed
      .filter(p => ESTADOS_CON_SALDO.includes(p.estadoPedido))
      .reduce((acc, p) => acc + (p.monto ?? 0), 0);
  }

  private readonly fb = inject(FormBuilder);
  private readonly paymentService = inject(PaymentService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly uiService = inject(UIService);

  constructor() {
    super();

    // Campos que acepta el backend: monto, metodoPago (EFECTIVO|TRANSFERENCIA), referenciaComprobante
    this.paymentForm = this.fb.group({
      id: [''],
      idPedido: [null, Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      type: ['EFECTIVO', Validators.required],
      referenciaComprobante: ['']
    });
  }

  ngOnInit(): void {
    this.loadPayments();
    this.fetchPayments();
  }

  ngAfterViewInit() {
    this.dataSource.filterPredicate = (data, filter) => {
      const dataStr = `${data.idPago} ${data.nombreCliente} ${data.estadoPedido} ${data.fechaPago} ${data.metodoPago}`.toLowerCase();
      const matchSearch = dataStr.includes(this.searchTerm.trim().toLowerCase());
      const matchFilter = this.currentFilter === 'ALL' ||
        data.estadoPedido === this.currentFilter ||
        // Compatibilidad: LISTO y TERMINADO son equivalentes en el filtro
        (this.currentFilter === 'LISTO' && (data.estadoPedido === 'LISTO' || data.estadoPedido === 'TERMINADO'));
      return matchSearch && matchFilter;
    };

    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'idPago': return item.idPago || '';
        case 'cliente': return item.nombreCliente || '';
        case 'estado': return item.estadoPedido || '';
        case 'fecha': return item.fechaPago ? new Date(item.fechaPago).getTime() : 0;
        case 'metodo': return item.metodoPago || '';
        case 'monto': return item.monto || 0;
        default: return (item as any)[property] || '';
      }
    };
  }

  fetchPayments(): void {
    this.paymentService.getPayments(0, 1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
    this.paymentService.getUnifiedSaldos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any[]) => {
          this.paymentsData = res.map(s => ({
            idPedido: s.id,
            id: String(s.id),
            orderId: s.code,
            clientName: s.client ?? 'Desconocido',
            amount: Number(s.pending) || 0,
            type: 'EFECTIVO' as PaymentType,
            status: 'PENDIENTE' as PaymentStatus,
            createdAt: s.date ?? new Date().toISOString(),
            voucherUrl: null,
            registeredBy: { id: '', name: 'N/A' },
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
    this.dataSource.filter = Date.now().toString();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // ─── Modals de vista ─────────────────────────────────────────────────────

  openViewModal(payment: PaymentListItemDTO): void {
    this.selectedPayment = payment;
    this.showViewModal = true;
    this.cdr.detectChanges();
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedPayment = null;
    this.cdr.detectChanges();
  }

  openDeleteModal(payment: PaymentListItemDTO): void {
    this.uiService.showConfirm({
      title: '¿Eliminar pago?',
      message: '¿Estás seguro de que deseas eliminar este registro de pago de ',
      highlightText: `$${payment.monto}`,
      warningText: 'Esta acción eliminará el abono permanentemente y ',
      confirmLabel: 'Sí, eliminar pago',
      icon: 'delete_forever',
      accentColor: 'error'
    }).subscribe(result => {
      if (result) {
        this.confirmDelete(payment);
      }
    });
  }

  confirmDelete(payment: PaymentListItemDTO): void {
    this.paymentService.eliminarAbono(payment.idPedido, payment.idPago)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadPayments();
          this.fetchPayments();
          this.uiService.showSuccess({
            title: '¡Pago Eliminado!',
            message: 'El registro de pago ha sido eliminado exitosamente.'
          });
        },
        error: (err) => {
          console.error('Error eliminando pago', err);
          this.uiService.showError('No se pudo eliminar el abono. Verifica si el abono aún existe.');
        }
      });
  }



  // ─── Formulario de abono ─────────────────────────────────────────────────

  openAddForm(): void {
    this.paymentForm.reset({
      id: '',
      idPedido: null,
      amount: null,
      type: 'EFECTIVO',
      referenciaComprobante: ''
    });
    this.viewMode = 'add';
    this.cdr.detectChanges();
  }

  openEditForm(payment: PaymentListItemDTO): void {
    this.selectedPayment = payment;
    this.paymentForm.patchValue({
      id: payment.idPago,
      idPedido: payment.idPedido,
      amount: payment.monto,
      type: this.mapPaymentType(payment.metodoPago),
      referenciaComprobante: ''
    });
    this.viewMode = 'edit';
    this.cdr.detectChanges();
  }

  closeForm(): void {
    this.viewMode = 'list';
    this.selectedPayment = null;
    this.cdr.detectChanges();
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

    const { id, idPedido, amount, type, referenciaComprobante } = this.paymentForm.value;
    // El backend acepta: { monto, metodoPago: EFECTIVO|TRANSFERENCIA, referenciaComprobante? }
    const payload = {
      monto: Number(amount),
      metodoPago: type as 'EFECTIVO' | 'TRANSFERENCIA',
      referenciaComprobante: referenciaComprobante || undefined
    };
    let request$: Observable<any> = EMPTY;
    if (this.viewMode === 'edit' && id) {
      request$ = this.paymentService.editarAbono(Number(idPedido), Number(id), payload);
    } else if (this.viewMode === 'add' && idPedido) {
      request$ = this.paymentService.registrarAbono(Number(idPedido), payload);
    }


    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loadPayments();
        this.fetchPayments();
        const isEdit = this.viewMode === 'edit';
        this.uiService.showSuccess({
          title: isEdit ? '¡Abono Actualizado!' : '¡Abono Registrado!',
          message: isEdit ? 'Los detalles del pago han sido modificados.' : 'El movimiento ha sido registrado correctamente.',
          primaryActionLabel: 'Ir a Pagos',
          secondaryActionLabel: isEdit ? 'Seguir editando' : 'Registrar otro pago'
        }).subscribe((result: any) => {
          if (!result || result.action === 'primary' || result.action === 'close') {
            this.viewMode = 'list';
          } else if (result.action === 'secondary' && !isEdit) {
            this.openAddForm();
          }
          this.cdr.detectChanges();
        });
      },
      error: (err: unknown) => console.error('Error guardando abono', err)
    });
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
