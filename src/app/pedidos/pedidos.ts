import { Component, inject, OnInit, AfterViewInit, ChangeDetectorRef, DestroyRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderSummaryDTO } from '../core/models/order.dto';
import { OrderService } from '../core/services/order.service';
import { ClientService } from '../core/services/client.service';
import { InventoryService } from '../core/services/inventory.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog';
import { SuccessDialogComponent } from '../shared/components/success-dialog/success-dialog';
import { STATUS_MAP } from '../shared/constants/ui-constants';
import { ListHelper } from '../shared/utils/list-helper';
@Component({
  selector: 'app-pedidos',
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
  templateUrl: './pedidos.html',
  styleUrls: ['./pedidos.css']
})
export class PedidosComponent implements OnInit, AfterViewInit {
  ordersData: OrderSummaryDTO[] = [];
  dataSource = new MatTableDataSource<OrderSummaryDTO>([]);
  displayedColumns: string[] = ['codigo', 'cliente', 'estado', 'fecha', 'saldo', 'acciones'];

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;
  
  @ViewChild('formalizePaginator') formalizePaginator?: MatPaginator;
  formalizeDataSource = new MatTableDataSource<any>([]);

  searchTerm = '';

  // Listas cargadas del backend
  clientsList: { id: number; nombre: string }[] = [];
  productsList: { id: number; nombre: string }[] = [];

  selectedOrder: OrderSummaryDTO | null = null;

  // Activar producción result
  activarProduccionResult: { codigoUnico: string; estado: string } | null = null;

  // Mapa de estado para UI — incluye valores del backend (EstadoPedido) y aliases legacy
  statusMap = STATUS_MAP;

  // Forms state
  viewMode: 'list' | 'add' | 'edit' | 'detail' | 'formalize' = 'list';
  orderForm: FormGroup;
  currentOrderClientName = '';
  selectedOrderDetails: any = null;
  formalizeList: any[] = [];
  formalizeFilter: 'TODOS' | 'PENDIENTES' | 'PRODUCCION' = 'TODOS';
  totalPendienteFormalizar = 0;
  ordenesCriticas = 0;

  showDeleteModal = false;
  showSuccessModal = false;
  showErrorModal = false;
  showProductionModal = false;
  errorMessage = '';

  private readonly fb = inject(FormBuilder);
  private readonly orderService = inject(OrderService);
  private readonly clientService = inject(ClientService);
  private readonly inventoryService = inject(InventoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  isMobile = false;
  private readonly breakpointObserver = inject(BreakpointObserver);

  constructor() {
    this.breakpointObserver.observe([Breakpoints.Handset, Breakpoints.TabletPortrait]).subscribe(result => {
      this.isMobile = result.matches;
      this.cdr.markForCheck();
    });

    this.orderForm = this.fb.group({
      id: [''],
      status: [''],
      clientId: [null, Validators.required],
      deliveryDate: ['', Validators.required],
      eventType: [''],
      eventFor: [''],
      specifications: [''],
      items: this.fb.array([])
    });
  }

  get itemsFormArray(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

  get subtotalEstimate(): number {
    return this.itemsFormArray.controls.reduce((acc, ctrl) => {
      const q = ctrl.get('quantity')?.value || 0;
      const p = ctrl.get('unitPrice')?.value || 0;
      return acc + (q * p);
    }, 0);
  }

  get selectedClientName(): string {
    const id = this.orderForm.get('clientId')?.value;
    if (!id) return this.currentOrderClientName || 'Cliente Desconocido';
    const client = this.clientsList.find(c => Number(c.id) === Number(id));
    return client ? client.nombre : (this.currentOrderClientName || 'Cliente Desconocido');
  }

  addItem(): void {
    this.itemsFormArray.push(this.fb.group({
      idDetalle: [null],
      productId: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      observaciones: [''],
      unitPrice: null
    }));
  }

  removeItem(index: number): void {
    this.itemsFormArray.removeAt(index);
  }

  ngOnInit(): void {
    this.loadOrders();
    this.loadClients();
    this.loadProducts();

    // Abrir formulario directamente si viene con ?new=true (desde boton Nuevo Pedido del sidebar)
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params['new'] === 'true') {
        this.openAddForm();
      }
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'codigo': return item.codigoUnico || item.idPedido || '';
        case 'cliente': return item.nombreCliente || item.clientName || '';
        case 'estado': return item.estadoPedido || '';
        case 'fecha': return item.fechaEntrega ? new Date(item.fechaEntrega).getTime() : 0;
        case 'saldo': return item.saldoPendiente || 0;
        default: return item[property as keyof OrderSummaryDTO] as string | number ?? '';
      }
    };

    this.dataSource.filterPredicate = (data, filter) => {
      const dataStr = `${data.idPedido} ${data.codigoUnico} ${data.nombreCliente} ${data.clientName}`.toLowerCase();
      return dataStr.includes(filter);
    };
  }

  loadOrders(): void {
    this.orderService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.ordersData = data;
        this.dataSource.data = this.ordersData;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading orders', err)
    });
  }

  loadClients(): void {
    this.clientService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.clientsList = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading clients', err)
    });
  }

  loadProducts(): void {
    this.inventoryService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.productsList = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading products', err)
    });
  }

  onSearchChange(): void {
    ListHelper.handleSearch(this.dataSource, this.searchTerm);
  }

  // --- ACTIVAR PRODUCCIÓN ---
  openActivarProduccionModal(order: OrderSummaryDTO): void {
    this.selectedOrder = order;
    this.showProductionModal = true;
    this.cdr.detectChanges();
  }

  closeProductionModal(): void {
    this.showProductionModal = false;
    this.cdr.detectChanges();
  }

  confirmActivarProduccion(): void {
    if (!this.selectedOrder) { return; }
    const id = this.selectedOrder.idPedido ?? this.selectedOrder.id;
    this.orderService.activarProduccion(Number(id)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.closeProductionModal();
        this.showSuccessModal = true;
        this.loadOrders();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error activando producci\u00f3n', err);
        this.errorMessage = 'No se pudo activar la producci\u00f3n. Verifica que el pedido est\u00e9 en estado PENDIENTE.';
        this.closeProductionModal();
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  // --- DELETE ---
  openDeleteModal(order: OrderSummaryDTO): void {
    this.selectedOrder = order;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.cdr.detectChanges();
  }

  confirmDelete(): void {
    if (!this.selectedOrder) return;
    const id = this.selectedOrder.idPedido ?? this.selectedOrder.id;
    this.orderService.cancelar(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.showSuccessModal = true;
        this.loadOrders();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error eliminando pedido', err);
        this.errorMessage = 'No se pudo cancelar el pedido. Es posible que el pedido ya esté terminado, cancelado o en un estado donde no permite cancelación.';
        this.closeDeleteModal();
        this.showErrorModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.selectedOrder = null;
    this.cdr.detectChanges();
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  // --- FORM ACTIONS ---
  openAddForm(): void {
    this.orderForm.get('clientId')?.setValidators([Validators.required]);
    this.orderForm.get('clientId')?.updateValueAndValidity();

    this.orderForm.reset({
      deliveryDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0]
    });
    this.itemsFormArray.clear();
    this.addItem();
    this.viewMode = 'add';
    this.cdr.detectChanges();
  }

  crearCliente(): void {
    this.router.navigate(['/clientes'], { queryParams: { from: 'pedidos' } });
  }

  openEditForm(order: OrderSummaryDTO): void {
    const id = order.idPedido ?? order.id;
    if (!id) return;

    this.orderService.getById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (detail) => {
        this.populateOrderForm(detail, order);
        this.viewMode = 'edit';
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading order details', err)
    });
  }

  openDetail(order: OrderSummaryDTO): void {
    const id = order.idPedido ?? order.id;
    if (!id) return;

    this.orderService.getById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (detail) => {
        this.selectedOrderDetails = detail;
        this.viewMode = 'detail';
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading order details', err)
    });
  }

  openFormalizeView(): void {
    this.viewMode = 'formalize';
    this.applyFormalizeFilter();
  }

  setFormalizeFilter(filter: 'TODOS' | 'PENDIENTES' | 'PRODUCCION'): void {
    this.formalizeFilter = filter;
    this.applyFormalizeFilter();
  }

  private applyFormalizeFilter(): void {
    let list = this.dataSource.data;

    if (this.formalizeFilter === 'PENDIENTES') {
      list = list.filter(o => o.estadoPedido === 'PENDIENTE' || o.estadoPedido === 'PENDING_ACCEPTANCE' || o.estadoPedido === 'PENDING_PAYMENT');
    } else if (this.formalizeFilter === 'PRODUCCION') {
      list = list.filter(o => o.estadoPedido === 'IN_PRODUCTION' || o.estadoPedido === 'EN_PRODUCCION');
    } else {
      // TODOS - Por defecto en la cola de formalización vemos los que no están terminados o cancelados
      list = list.filter(o => o.estadoPedido !== 'DONE' && o.estadoPedido !== 'DELIVERED' && o.estadoPedido !== 'CANCELLED');
    }

    this.formalizeList = list;
    this.formalizeDataSource.data = list;
    
    // Usar setTimeout para esperar a que el paginator se renderice si acabamos de cambiar el viewMode
    setTimeout(() => {
      if (this.formalizePaginator) {
        this.formalizeDataSource.paginator = this.formalizePaginator;
        this.cdr.detectChanges();
      }
    });

    // Calcular métricas (siempre sobre los pendientes de inicio)
    const pendientes = this.dataSource.data.filter(o => o.estadoPedido === 'PENDIENTE' || o.estadoPedido === 'PENDING_ACCEPTANCE' || o.estadoPedido === 'PENDING_PAYMENT');
    this.totalPendienteFormalizar = pendientes.reduce((sum, order) => {
      return sum + (Number(order.totalAmount) || Number(order.total) || Number(order.saldoPendiente) || 0);
    }, 0);

    const today = new Date();
    today.setHours(0,0,0,0);
    this.ordenesCriticas = pendientes.filter(order => {
      if (!order.fechaEntrega) return false;
      const deliveryDate = new Date(order.fechaEntrega);
      const diffTime = Math.abs(deliveryDate.getTime() - today.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) <= 5;
    }).length;

    this.cdr.detectChanges();
  }

  openEditFromDetail(): void {
    if (this.selectedOrderDetails) {
      // Create a mock OrderSummaryDTO from details to use in openEditForm
      const orderSummary: any = {
        idPedido: this.selectedOrderDetails.idPedido,
        idCliente: this.selectedOrderDetails.cliente?.idCliente
      };
      this.populateOrderForm(this.selectedOrderDetails, orderSummary);
      this.viewMode = 'edit';
      this.cdr.detectChanges();
    }
  }

  getPaymentPercentage(total: number, saldoPendiente: number): number {
    if (!total || total <= 0) return 0;
    const pagado = total - saldoPendiente;
    return Math.round((pagado / total) * 100);
  }

  private populateOrderForm(detail: any, order: OrderSummaryDTO): void {
    const targetClientId = detail.cliente?.idCliente ?? detail.idCliente ?? order.idCliente;
    const targetClientName = detail.cliente?.nombreCompleto ?? order.clientName ?? order.nombreCliente;
    const matchingClient = this.clientsList.find(c => c.id === Number(targetClientId) || c.nombre === targetClientName);

    this.currentOrderClientName = targetClientName;

    setTimeout(() => {
      this.orderForm.get('clientId')?.clearValidators();
      this.orderForm.get('clientId')?.updateValueAndValidity();

      this.orderForm.patchValue({
        id: detail.idPedido || detail.id,
        status: detail.estadoPedido || detail.status || order.estadoPedido,
        clientId: matchingClient ? matchingClient.id : null,
        deliveryDate: detail.fechaEntrega ? detail.fechaEntrega.split('T')[0] : '',
        specifications: detail.productos && detail.productos.length > 0 ? detail.productos[0].observaciones : ''
      });

      this.itemsFormArray.clear();
      if (detail.productos && detail.productos.length > 0) {
        this.buildItemsFromProducts(detail.productos);
      } else {
        this.addItem();
      }

      this.viewMode = 'edit';
      this.cdr.detectChanges();
    });
  }

  private buildItemsFromProducts(productos: any[]): void {
    for (const p of productos) {
      const matchingProduct = this.productsList.find(prod => prod.nombre === p.nombreProducto);
      this.itemsFormArray.push(this.fb.group({
        idDetalle: [p.idDetalle],
        productId: [matchingProduct ? matchingProduct.id : null, Validators.required],
        quantity: [p.cantidad, [Validators.required, Validators.min(1)]],
        observaciones: [p.observaciones || ''],
        unitPrice: [p.precioUnitario || 0]
      }));
    }
  }

  closeForm(): void {
    this.viewMode = 'list';
    this.selectedOrderDetails = null;
    ListHelper.setupTable(this.dataSource, this.paginator, this.sort, this.cdr);
  }

  saveOrder(): void {
    if (!this.orderForm.valid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    const orderData = this.orderForm.value;
    const id = orderData.id;

    this.processOrderSpecifications(orderData);

    const request$ = id
      ? this.orderService.update(id, orderData)
      : this.orderService.create(orderData);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.handleSaveSuccess(id),
      error: (err) => console.error('Error saving order', err)
    });
  }

  private processOrderSpecifications(orderData: any): void {
    if (!orderData.items || orderData.items.length === 0) return;

    const globalSpec = [];
    if (orderData.eventType) globalSpec.push(`Evento: ${orderData.eventType}`);
    if (orderData.eventFor) globalSpec.push(`Para: ${orderData.eventFor}`);
    if (orderData.specifications) globalSpec.push(`Specs: ${orderData.specifications}`);
    const concatSpec = globalSpec.join(' | ');

    if (concatSpec) {
      orderData.items[0].observaciones = orderData.items[0].observaciones
        ? orderData.items[0].observaciones + ' \n' + concatSpec
        : concatSpec;
    }
  }

  private handleSaveSuccess(id: any): void {
    this.loadOrders();
    const dialogRef = this.dialog.open(SuccessDialogComponent, {
      panelClass: 'casualidad-dialog',
      data: {
        title: id ? '¡Pedido Actualizado!' : '¡Pedido Creado!',
        message: id ? 'Los detalles del pedido han sido modificados.' : 'El pedido ha sido registrado correctamente.',
        icon: 'check_circle',
        accentColor: 'success',
        primaryActionLabel: 'Ir a Pedidos',
        secondaryActionLabel: id ? 'Seguir editando' : 'Crear otro pedido'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result || result.action === 'primary' || result.action === 'close') {
        this.closeForm();
      } else if (result.action === 'secondary' && !id) {
        this.openAddForm();
      }
      this.cdr.detectChanges();
    });
  }
}
