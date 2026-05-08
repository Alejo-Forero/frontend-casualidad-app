import { Component, inject, OnInit, AfterViewInit, ChangeDetectorRef, DestroyRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderSummaryDTO, OrderDetailDTO, CreateOrderDTO } from '../core/models/order.dto';
import { ProductDTO } from '../core/models/inventory.dto';
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
import { STATUS_MAP } from '../shared/constants/ui-constants';
import { ListHelper } from '../shared/utils/list-helper';
import { BaseTableComponent } from '../shared/components/base-table.component';
import { ScreenSizeService } from '../core/services/screen-size.service';
import { UIService } from '../core/services/ui.service';
import { Observable } from 'rxjs';

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
export class PedidosComponent extends BaseTableComponent<OrderSummaryDTO> implements OnInit, AfterViewInit {
  ordersData: OrderSummaryDTO[] = [];
  dataSource = new MatTableDataSource<OrderSummaryDTO>([]);
  displayedColumns: string[] = ['codigo', 'cliente', 'estado', 'fecha', 'saldo', 'acciones'];

  @ViewChild('formalizePaginator') formalizePaginator?: MatPaginator;
  formalizeDataSource = new MatTableDataSource<any>([]);

  searchTerm = '';

  // Listas cargadas del backend
  clientsList: { id: number; nombre: string }[] = [];
  productsList: ProductDTO[] = [];

  selectedOrder: OrderSummaryDTO | null = null;

  // Activar producción result
  activarProduccionResult: { codigoUnico: string; estado: string } | null = null;

  // Mapa de estado para UI — incluye valores del backend (EstadoPedido) y aliases legacy
  statusMap = STATUS_MAP;

  // Forms state
  viewMode: 'list' | 'add' | 'edit' | 'detail' | 'formalize' = 'list';
  orderForm: FormGroup;
  currentOrderClientName = '';
  selectedOrderDetails: OrderDetailDTO | null = null;
  pendingViewOrderId: string | null = null;
  formalizeList: OrderSummaryDTO[] = [];
  formalizeFilter: 'TODOS' | 'PENDIENTES' | 'PRODUCCION' = 'TODOS';
  totalPendienteFormalizar = 0;
  ordenesCriticas = 0;

  errorMessage = '';

  private readonly fb = inject(FormBuilder);
  private readonly orderService = inject(OrderService);
  private readonly clientService = inject(ClientService);
  private readonly inventoryService = inject(InventoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly uiService = inject(UIService);
  private readonly router = inject(Router);

  readonly screenSize = inject(ScreenSizeService);

  constructor() {
    super();

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
    const group = this.fb.group({
      idDetalle: [null],
      productId: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      observaciones: [''],
      unitPrice: null
    }, { validators: [this.duplicateProductValidator.bind(this), this.stockAvailabilityValidator.bind(this)] });

    this.itemsFormArray.push(group);
  }

  private duplicateProductValidator(group: AbstractControl): ValidationErrors | null {
    const productId = group.get('productId')?.value;
    if (!productId) return null;
    const controls = this.itemsFormArray.controls;
    const index = controls.indexOf(group);
    const isDuplicate = controls.some((ctrl, i) =>
      i !== index && String(ctrl.get('productId')?.value) === String(productId)
    );
    return isDuplicate ? { duplicateProduct: true } : null;
  }

  private stockAvailabilityValidator(group: AbstractControl): ValidationErrors | null {
    const productId = group.get('productId')?.value;
    const quantity = group.get('quantity')?.value;
    if (!productId || !quantity) return null;

    const product = this.productsList.find(p => String(p.idProducto) === String(productId));
    if (product && quantity > product.cantidadDisponible) {
      return { exceedStock: true };
    }
    return null;
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
        const draft = this.orderService.getOrderDraft();
        if (draft) {
          this.restoreDraft(draft);
        } else {
          this.openAddForm();
        }
      }
      if (params['view']) {
        this.pendingViewOrderId = String(params['view']);
        this.checkPendingViewOrder();
      }
    });
  }

  ngAfterViewInit() {
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
        this.checkPendingViewOrder();
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error loading orders', err)
    });
  }

  private checkPendingViewOrder(): void {
    if (this.pendingViewOrderId && this.ordersData.length > 0) {
      const order = this.ordersData.find(o => String(o.idPedido || o.id) === this.pendingViewOrderId);
      if (order) {
        this.openDetail(order);
        this.pendingViewOrderId = null;
      }
    }
  }

  loadClients(): void {
    this.clientService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.clientsList = data;
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error loading clients', err)
    });
  }

  loadProducts(): void {
    this.inventoryService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        // Filtrar para mostrar solo ELABORADO, REVENTA y TRANSFORMADO
        this.productsList = data.filter(p =>
          p.tipo === 'ELABORADO' || p.tipo === 'REVENTA' || p.tipo === 'TRANSFORMADO'
        );
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error loading products', err)
    });
  }

  onProductChange(index: number): void {
    const itemGroup = this.itemsFormArray.at(index);
    const productId = itemGroup.get('productId')?.value;

    if (productId) {
      this.inventoryService.getById(productId).subscribe({
        next: (product) => {
          // El precio unitario del producto es su precio de venta
          itemGroup.patchValue({
            unitPrice: product.precioVenta
          });
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error fetching product price', err)
      });
    }
  }

  onSearchChange(): void {
    ListHelper.handleSearch(this.dataSource, this.searchTerm);
  }

  // --- ACTIVAR PRODUCCIÓN ---
  openActivarProduccionModal(order: OrderSummaryDTO): void {
    this.uiService.showConfirm({
      title: '¿Activar Producción?',
      message: 'Se generará una orden de producción para el pedido ',
      highlightText: order.code,
      warningText: 'Esto notificará al taller y no se podrá revertir fácilmente.',
      confirmLabel: 'Sí, activar producción',
      icon: 'precision_manufacturing',
      accentColor: 'primary'
    }).subscribe(result => {
      if (result) {
        this.confirmActivarProduccion(order);
      }
    });
  }

  confirmActivarProduccion(order: OrderSummaryDTO): void {
    this.orderService.activarProduccion(Number(order.id)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res: any) => {
        this.loadOrders();
        this.activarProduccionResult = res;
        this.uiService.showSuccess({
          title: '¡Producción Activada!',
          message: `Se ha generado el código único: ${res.codigoUnico}`
        });
      },
      error: (err: any) => {
        console.error('Error activando producción', err);
        this.uiService.showError('No se pudo activar la producción. Revisa el stock de insumos.');
      }
    });
  }

  // --- DELETE ---
  openDeleteModal(order: OrderSummaryDTO): void {
    this.uiService.showConfirm({
      title: '¿Eliminar pedido?',
      message: '¿Estás seguro de que deseas eliminar el pedido ',
      highlightText: `#${order.codigoUnico || order.idPedido}`,
      warningText: 'Esta acción no se puede deshacer y ',
      confirmLabel: 'Sí, eliminar pedido',
      icon: 'delete_forever',
      accentColor: 'error'
    }).subscribe(result => {
      if (result) {
        this.confirmDelete(order);
      }
    });
  }

  confirmDelete(order: OrderSummaryDTO): void {
    const id = order.idPedido ?? order.id;
    this.orderService.cancelar(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loadOrders();
        this.uiService.showSuccess({
          title: '¡Pedido Eliminado!',
          message: 'El pedido ha sido eliminado correctamente del sistema.'
        });
      },
      error: (err: any) => {
        console.error('Error eliminando pedido', err);
        this.uiService.showError('No se pudo cancelar el pedido. Es posible que ya esté en un estado que no permite cancelación.');
      }
    });
  }



  // --- FORM ACTIONS ---
  openAddForm(): void {
    this.orderService.clearOrderDraft(); // In any normal entry, we clear draft
    this.orderForm.reset({
      deliveryDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0]
    });
    this.itemsFormArray.clear();
    this.addItem();
    this.viewMode = 'add';
    this.cdr.detectChanges();
  }

  private restoreDraft(draft: CreateOrderDTO | any): void {
    this.orderForm.reset();
    this.itemsFormArray.clear();

    // Restore items
    if (draft.items && draft.items.length > 0) {
      draft.items.forEach(() => this.addItem());
    } else {
      this.addItem();
    }

    this.orderForm.patchValue(draft);
    this.orderService.clearOrderDraft();
    this.viewMode = 'add';
    this.cdr.detectChanges();
  }

  crearCliente(): void {
    // Save current form state as draft
    this.orderService.setOrderDraft(this.orderForm.getRawValue());
    this.router.navigate(['/clientes'], { queryParams: { from: 'pedidos' } });
  }

  openEditForm(order: OrderSummaryDTO): void {
    const id = order.idPedido ?? order.id;
    const status = order.estadoPedido || order.status;

    // Validar si el pedido se puede editar
    if (status === 'TERMINADO' || status === 'DONE' || status === 'DELIVERED' ||
      status === 'CANCELADO' || status === 'CANCELLED') {
      this.uiService.showSuccess({
        title: 'Acción No Permitida',
        message: `No es posible editar un pedido que se encuentra en estado `,
        highlightText: (this.statusMap[status]?.text || status).toUpperCase(),
        message2: '.',
        icon: 'lock',
        accentColor: 'warning',
        primaryActionLabel: 'Entendido'
      });
      return;
    }

    if (!id) return;

    this.orderService.getById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (detail) => {
        this.populateOrderForm(detail, order);
        this.viewMode = 'edit';
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error loading order details', err)
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
      error: (err: any) => console.error('Error loading order details', err)
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
    today.setHours(0, 0, 0, 0);
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
      const orderSummary: OrderSummaryDTO = {
        ...this.selectedOrderDetails,
        idPedido: this.selectedOrderDetails.idPedido,
        idCliente: this.selectedOrderDetails.cliente?.idCliente
      } as OrderSummaryDTO;
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

  private populateOrderForm(detail: OrderDetailDTO, order: OrderSummaryDTO): void {
    const targetClientId = detail.cliente?.idCliente ?? detail.idCliente ?? order.idCliente;
    const targetClientName = detail.cliente?.nombreCompleto ?? order.clientName ?? order.nombreCliente;
    const matchingClient = this.clientsList.find(c => c.id === Number(targetClientId) || c.nombre === targetClientName);

    this.currentOrderClientName = targetClientName;

    setTimeout(() => {
      // RESET BEFORE PATCH - This fixes the 'not cleaning' bug
      this.orderForm.reset();
      this.itemsFormArray.clear();

      this.orderForm.patchValue({
        id: detail.idPedido || detail.id,
        status: detail.estadoPedido || detail.status || order.estadoPedido,
        clientId: matchingClient ? matchingClient.id : null,
        deliveryDate: detail.fechaEntrega ? detail.fechaEntrega.split('T')[0] : '',
        specifications: detail.productos && detail.productos.length > 0 ? detail.productos[0].observaciones : ''
      });

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
        productId: [matchingProduct ? matchingProduct.idProducto : null, Validators.required],
        quantity: [p.cantidad, [Validators.required, Validators.min(1)]],
        observaciones: [p.observaciones || ''],
        unitPrice: [p.precioUnitario || 0]
      }));
    }
  }

  closeForm(): void {
    this.orderForm.reset();
    this.itemsFormArray.clear();
    this.orderService.clearOrderDraft();
    this.viewMode = 'list';
    this.selectedOrderDetails = null;
    this.cdr.detectChanges();
  }

  saveOrder(): void {
    if (!this.orderForm.valid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    const orderData = this.orderForm.value;
    const id = orderData.id;

    this.processOrderSpecifications(orderData);

    const request$: Observable<any> = id
      ? this.orderService.update(id, orderData)
      : this.orderService.create(orderData);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.orderService.clearOrderDraft();
        this.handleSaveSuccess(id);
      },
      error: (err: any) => console.error('Error saving order', err)
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

  private handleSaveSuccess(id: string | number | null): void {
    this.loadOrders();
    this.uiService.showSuccess({
      title: id ? '¡Pedido Actualizado!' : '¡Pedido Creado!',
      message: id ? 'Los detalles del pedido han sido modificados.' : 'El pedido ha sido registrado correctamente.',
      icon: 'check_circle',
      accentColor: 'success',
      primaryActionLabel: 'Ir a Pedidos',
      secondaryActionLabel: id ? 'Seguir editando' : 'Crear otro pedido'
    }).subscribe(result => {
      if (!result || result.action === 'primary' || result.action === 'close') {
        this.closeForm();
      } else if (result.action === 'secondary' && !id) {
        this.openAddForm();
      }
      this.cdr.detectChanges();
    });
  }
}
