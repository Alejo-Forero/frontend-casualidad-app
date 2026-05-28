import { Component, inject, OnInit, AfterViewInit, ChangeDetectorRef, DestroyRef, ViewChild } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderSummaryDTO, OrderDetailDTO, CreateOrderDTO } from '../core/models/order.dto';
import { ProductDTO, DisponibilidadProductoDto, ComposicionProductoDto } from '../core/models/inventory.dto';
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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { STATUS_MAP } from '../shared/constants/ui-constants';
import { ListHelper } from '../shared/utils/list-helper';
import { diffDaysFromToday, parseLocalDate } from '../shared/utils/date-helpers';
import { BaseTableComponent } from '../shared/components/base-table.component';
import { ScreenSizeService } from '../core/services/screen-size.service';
import { UIService } from '../core/services/ui.service';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
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
    MatDialogModule,
    MatAutocompleteModule
  ],
  templateUrl: './pedidos.html',
  styleUrls: ['./pedidos.css']
})
export class PedidosComponent extends BaseTableComponent<OrderSummaryDTO> implements OnInit, AfterViewInit {
  ordersData: OrderSummaryDTO[] = [];
  dataSource = new MatTableDataSource<OrderSummaryDTO>([]);
  displayedColumns: string[] = ['cliente', 'estado', 'fecha', 'saldo', 'acciones'];

  @ViewChild('formalizePaginator') formalizePaginator?: MatPaginator;
  formalizeDataSource = new MatTableDataSource<any>([]);

  searchTerm = '';

  selectedOrder: OrderSummaryDTO | null = null;

  activarProduccionResult: { codigoUnico: string; estado: string } | null = null;

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

  // Autocomplete: cliente
  clientSearchCtrl = new FormControl<any>('');
  filteredClients$: Observable<any[]> = of([]);

  // Autocomplete: productos por índice de la FormArray
  productSearchCtrls: FormControl[] = [];
  filteredProductGroups$: Observable<{ tipo: string; label: string; items: ProductDTO[] }[]>[] = [];

  // Disponibilidad y composición por índice del FormArray
  disponibilidadPorIndex: (DisponibilidadProductoDto | null)[] = [];
  composicionPorIndex: (ComposicionProductoDto | null)[] = [];
  detalleAbierto: boolean[] = [];

  // Cache de composición por idProducto para no repetir llamadas
  private composicionCache = new Map<number, ComposicionProductoDto>();

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
    return this.currentOrderClientName || 'Cliente Desconocido';
  }

  // ---- Helpers autocomplete ----

  displayClient = (c: any): string => c?.nombre || c || '';

  displayProduct = (p: ProductDTO | null): string => p?.nombre || '';

  tipoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      ELABORADO: 'Elaborado',
      TRANSFORMADO: 'Transformado',
      REVENTA: 'Reventa'
    };
    return labels[tipo] || tipo;
  }

  getProductSearchCtrl(index: number): FormControl {
    return this.productSearchCtrls[index];
  }

  private createProductSearchObservable(ctrl: FormControl): Observable<{ tipo: string; label: string; items: ProductDTO[] }[]> {
    return ctrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        const searchTerm = typeof term === 'string' ? term : '';
        return this.inventoryService.searchProductos(searchTerm).pipe(
          catchError(() => of([] as ProductDTO[]))
        );
      }),
      switchMap(productos => of(this.agruparPorTipo(productos))),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  private agruparPorTipo(productos: ProductDTO[]): { tipo: string; label: string; items: ProductDTO[] }[] {
    const grupos: Record<string, { tipo: string; label: string; items: ProductDTO[] }> = {
      ELABORADO: { tipo: 'ELABORADO', label: 'Productos Elaborados', items: [] },
      TRANSFORMADO: { tipo: 'TRANSFORMADO', label: 'Productos Transformados', items: [] },
      REVENTA: { tipo: 'REVENTA', label: 'Reventa', items: [] }
    };

    for (const p of productos) {
      if (grupos[p.tipo]) {
        grupos[p.tipo].items.push(p);
      }
    }

    return Object.values(grupos).filter(g => g.items.length > 0);
  }

  esInsumoFaltante(disp: DisponibilidadProductoDto, idInsumo: number): boolean {
    return disp.insumosFaltantes.some(f => f.idInsumo === idInsumo);
  }

  toggleDetalle(index: number): void {
    this.detalleAbierto[index] = !this.detalleAbierto[index];
    this.cdr.detectChanges();
  }

  // ---- Selección cliente ----

  onClientSelected(event: any): void {
    const client = event.option.value;
    this.orderForm.patchValue({ clientId: client.idCliente });
    this.currentOrderClientName = client.nombre;
    this.cdr.detectChanges();
  }

  private setupClientAutocomplete(): void {
    this.filteredClients$ = this.clientSearchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        const searchTerm = typeof term === 'string' ? term : '';
        return this.clientService.search(searchTerm).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  // ---- Selección producto ----

  onProductSelected(index: number, product: ProductDTO): void {
    const itemGroup = this.itemsFormArray.at(index);
    itemGroup.patchValue({
      productId: product.idProducto,
      unitPrice: product.precioVenta || 0
    });

    // Limpiar disponibilidad anterior para este índice
    this.disponibilidadPorIndex[index] = null;
    this.composicionPorIndex[index] = null;
    this.detalleAbierto[index] = false;

    const qty = itemGroup.get('quantity')?.value || 1;
    this.cargarDisponibilidad(index, product.idProducto, qty);

    if (product.tipo === 'ELABORADO' || product.tipo === 'TRANSFORMADO') {
      this.cargarComposicion(index, product.idProducto);
    }

    this.cdr.detectChanges();
  }

  onQuantityChange(index: number): void {
    const itemGroup = this.itemsFormArray.at(index);
    const productId = itemGroup.get('productId')?.value;
    const qty = itemGroup.get('quantity')?.value || 1;

    if (productId) {
      this.cargarDisponibilidad(index, productId, qty);
    }
  }

  private cargarDisponibilidad(index: number, idProducto: number, cantidad: number): void {
    this.inventoryService.getDisponibilidad(idProducto, Math.max(1, cantidad))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: disp => {
          this.disponibilidadPorIndex[index] = disp;
          // Actualizar validación del grupo
          this.itemsFormArray.at(index).updateValueAndValidity();
          this.cdr.detectChanges();
        },
        error: () => {
          this.disponibilidadPorIndex[index] = null;
          this.cdr.detectChanges();
        }
      });
  }

  private cargarComposicion(index: number, idProducto: number): void {
    if (this.composicionCache.has(idProducto)) {
      this.composicionPorIndex[index] = this.composicionCache.get(idProducto)!;
      this.cdr.detectChanges();
      return;
    }

    this.inventoryService.getComposicion(idProducto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: comp => {
          this.composicionCache.set(idProducto, comp);
          this.composicionPorIndex[index] = comp;
          this.cdr.detectChanges();
        },
        error: () => {
          this.composicionPorIndex[index] = null;
          this.cdr.detectChanges();
        }
      });
  }

  // ---- Items FormArray ----

  addItem(): void {
    const group = this.fb.group({
      idDetalle: [null],
      productId: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      observaciones: [''],
      unitPrice: [null]
    }, { validators: [this.duplicateProductValidator.bind(this)] });

    const newIndex = this.itemsFormArray.length;
    this.itemsFormArray.push(group);
    const searchCtrl = new FormControl('');
    this.productSearchCtrls[newIndex] = searchCtrl;
    this.filteredProductGroups$[newIndex] = this.createProductSearchObservable(searchCtrl);
    this.disponibilidadPorIndex[newIndex] = null;
    this.composicionPorIndex[newIndex] = null;
    this.detalleAbierto[newIndex] = false;
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

  removeItem(index: number): void {
    this.itemsFormArray.removeAt(index);
    this.productSearchCtrls.splice(index, 1);
    this.filteredProductGroups$.splice(index, 1);
    this.disponibilidadPorIndex.splice(index, 1);
    this.composicionPorIndex.splice(index, 1);
    this.detalleAbierto.splice(index, 1);
  }

  private clearItemArrays(): void {
    this.itemsFormArray.clear();
    this.productSearchCtrls = [];
    this.filteredProductGroups$ = [];
    this.disponibilidadPorIndex = [];
    this.composicionPorIndex = [];
    this.detalleAbierto = [];
    this.composicionCache.clear();
  }

  ngOnInit(): void {
    this.loadOrders();
    this.setupClientAutocomplete();

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

  onSearchChange(): void {
    ListHelper.handleSearch(this.dataSource, this.searchTerm);
  }

  // --- BADGE VENCIDO ---
  isVencido(order: OrderSummaryDTO): boolean {
    const estado = order.estadoPedido || order.status;
    if (['ENTREGADO', 'CANCELADO', 'DELIVERED', 'CANCELLED'].includes(estado)) return false;
    const diff = diffDaysFromToday(order.fechaEntrega ?? order.deliveryDate);
    return diff !== null && diff < 0;
  }

  // --- MARCAR LISTO ---
  openMarcarListoModal(order: OrderSummaryDTO): void {
    this.uiService.showConfirm({
      title: '¿Marcar como Listo?',
      message: 'Confirmas que la producción del pedido ',
      highlightText: order.codigoUnico || String(order.idPedido),
      warningText: 'ha finalizado y está listo para entrega.',
      confirmLabel: 'Sí, marcar como listo',
      icon: 'check_circle',
      accentColor: 'primary'
    }).subscribe(result => {
      if (result) {
        this.orderService.marcarListo(Number(order.idPedido)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            this.loadOrders();
            this.uiService.showSuccess({ title: '¡Listo para entrega!', message: 'El pedido fue marcado como listo.', icon: 'check_circle' });
          },
          error: (err: any) => {
            console.error('Error marcando como listo', err);
            this.uiService.showError('No se pudo actualizar el estado del pedido.');
          }
        });
      }
    });
  }

  // --- MARCAR ENTREGADO ---
  openMarcarEntregadoModal(order: OrderSummaryDTO): void {
    this.uiService.showConfirm({
      title: '¿Marcar como Entregado?',
      message: 'Confirmas que el pedido ',
      highlightText: order.codigoUnico || String(order.idPedido),
      warningText: 'fue entregado físicamente al cliente.',
      confirmLabel: 'Sí, confirmar entrega',
      icon: 'local_shipping',
      accentColor: 'primary'
    }).subscribe(result => {
      if (result) {
        this.orderService.marcarEntregado(Number(order.idPedido)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            this.loadOrders();
            this.uiService.showSuccess({ title: '¡Pedido Entregado!', message: 'El pedido fue marcado como entregado.', icon: 'local_shipping' });
          },
          error: (err: any) => {
            console.error('Error marcando como entregado', err);
            this.uiService.showError('No se pudo registrar la entrega del pedido.');
          }
        });
      }
    });
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
    this.orderService.clearOrderDraft();
    this.orderForm.reset({
      deliveryDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0]
    });
    this.clearItemArrays();
    this.clientSearchCtrl.setValue('');
    this.currentOrderClientName = '';
    this.addItem();
    this.viewMode = 'add';
    this.cdr.detectChanges();
  }

  private restoreDraft(draft: CreateOrderDTO | any): void {
    this.orderForm.reset();
    this.clearItemArrays();

    if (draft.items && draft.items.length > 0) {
      draft.items.forEach(() => this.addItem());
    } else {
      this.addItem();
    }

    this.orderForm.patchValue(draft);

    // Restaurar display del cliente en el autocomplete
    if (draft.clientId) {
      this.clientService.search('', 200).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(clients => {
        const found = clients.find((c: any) => String(c.idCliente) === String(draft.clientId));
        if (found) {
          this.clientSearchCtrl.setValue(found, { emitEvent: false });
          this.currentOrderClientName = found.nombre;
          this.cdr.detectChanges();
        }
      });
    }

    this.orderService.clearOrderDraft();
    this.viewMode = 'add';
    this.cdr.detectChanges();
  }

  crearCliente(): void {
    this.orderService.setOrderDraft(this.orderForm.getRawValue());
    this.router.navigate(['/clientes'], { queryParams: { from: 'pedidos' } });
  }

  openEditForm(order: OrderSummaryDTO): void {
    const id = order.idPedido ?? order.id;
    const status = order.estadoPedido || order.status;

    if (status === 'LISTO' || status === 'ENTREGADO' || status === 'TERMINADO' ||
      status === 'DONE' || status === 'DELIVERED' ||
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

    const ESTADOS_FINALES = ['ENTREGADO', 'CANCELADO', 'DONE', 'DELIVERED', 'CANCELLED'];

    if (this.formalizeFilter === 'PENDIENTES') {
      list = list.filter(o => o.estadoPedido === 'PENDIENTE' || o.estadoPedido === 'PENDING_ACCEPTANCE' || o.estadoPedido === 'PENDING_PAYMENT');
    } else if (this.formalizeFilter === 'PRODUCCION') {
      list = list.filter(o => o.estadoPedido === 'IN_PRODUCTION' || o.estadoPedido === 'EN_PRODUCCION' || o.estadoPedido === 'LISTO');
    } else {
      list = list.filter(o => !ESTADOS_FINALES.includes(o.estadoPedido));
    }

    this.formalizeList = list;
    this.formalizeDataSource.data = list;

    setTimeout(() => {
      if (this.formalizePaginator) {
        this.formalizeDataSource.paginator = this.formalizePaginator;
        this.cdr.detectChanges();
      }
    });

    const abiertos = this.dataSource.data.filter(o => !ESTADOS_FINALES.includes(o.estadoPedido));
    this.totalPendienteFormalizar = abiertos.reduce((sum, order) => {
      return sum + (Number(order.saldoPendiente) || Number(order.pendingBalance) || 0);
    }, 0);

    this.ordenesCriticas = abiertos.filter(order => {
      const diff = diffDaysFromToday(order.fechaEntrega ?? order.deliveryDate);
      return diff !== null && diff >= 0 && diff <= 5;
    }).length;

    this.cdr.detectChanges();
  }

  openEditFromDetail(): void {
    if (this.selectedOrderDetails) {
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

    this.currentOrderClientName = targetClientName;

    setTimeout(() => {
      this.orderForm.reset();
      this.clearItemArrays();

      this.orderForm.patchValue({
        id: detail.idPedido || detail.id,
        status: detail.estadoPedido || detail.status || order.estadoPedido,
        clientId: targetClientId,
        deliveryDate: detail.fechaEntrega ? detail.fechaEntrega.split('T')[0] : '',
        specifications: detail.productos && detail.productos.length > 0 ? detail.productos[0].observaciones : ''
      });

      // Hidratar el autocomplete de cliente con el nombre
      if (targetClientName) {
        this.clientSearchCtrl.setValue({ nombre: targetClientName, idCliente: targetClientId }, { emitEvent: false });
      }

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
    for (let i = 0; i < productos.length; i++) {
      const p = productos[i];

      const group = this.fb.group({
        idDetalle: [p.idDetalle],
        productId: [p.idProducto || null, Validators.required],
        quantity: [p.cantidad, [Validators.required, Validators.min(1)]],
        observaciones: [p.observaciones || ''],
        unitPrice: [p.precioUnitario || 0]
      }, { validators: [this.duplicateProductValidator.bind(this)] });

      this.itemsFormArray.push(group);
      const searchCtrl = new FormControl(p.nombreProducto || '');
      this.productSearchCtrls[i] = searchCtrl;
      this.filteredProductGroups$[i] = this.createProductSearchObservable(searchCtrl);
      this.disponibilidadPorIndex[i] = null;
      this.composicionPorIndex[i] = null;
      this.detalleAbierto[i] = false;

      // Cargar disponibilidad para los ítems existentes
      if (p.idProducto) {
        this.cargarDisponibilidad(i, p.idProducto, p.cantidad || 1);
      }
    }
  }

  closeForm(): void {
    this.orderForm.reset();
    this.clearItemArrays();
    this.clientSearchCtrl.setValue('');
    this.currentOrderClientName = '';
    this.orderService.clearOrderDraft();
    this.viewMode = 'list';
    this.selectedOrderDetails = null;
    this.cdr.detectChanges();
  }

  get formHasStockError(): boolean {
    return this.disponibilidadPorIndex.some(d => d !== null && !d.puedeFabricar);
  }

  saveOrder(): void {
    if (!this.orderForm.valid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    if (this.formHasStockError) {
      this.uiService.showError('Hay productos sin stock suficiente. Corrige las cantidades antes de guardar.');
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
      error: (err: any) => {
        const mensaje = err?.error?.mensaje ?? err?.message ?? 'No se pudo guardar el pedido. Intenta de nuevo.';
        this.uiService.showError(mensaje);
      }
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
