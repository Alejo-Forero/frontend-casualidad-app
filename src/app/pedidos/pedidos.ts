import { Component, inject, OnInit, AfterViewInit, ChangeDetectorRef, DestroyRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
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

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  searchTerm = '';

  // Listas cargadas del backend
  clientsList: { id: number; nombre: string }[] = [];
  productsList: { id: number; nombre: string }[] = [];

  selectedOrder: OrderSummaryDTO | null = null;

  // Activar producción result
  activarProduccionResult: { codigoUnico: string; estado: string } | null = null;

  // Mapa de estado para UI — incluye valores del backend (EstadoPedido) y aliases legacy
  statusMap: Record<string, { text: string, css: string }> = {
    // Valores reales del backend (EstadoPedido enum)
    'PENDIENTE':       { text: 'Pendiente de Abono', css: 'bg-orange-100 text-orange-700' },
    'EN_PRODUCCION':   { text: 'En Producción',       css: 'bg-blue-100 text-blue-700' },
    'TERMINADO':       { text: 'Terminado',             css: 'bg-green-100 text-green-700' },
    'CANCELADO':       { text: 'Cancelado',             css: 'bg-red-100 text-red-700' },
    // Aliases legacy del frontend
    'PENDING_ACCEPTANCE': { text: 'Pendiente de Aceptación', css: 'bg-orange-100 text-orange-700' },
    'PENDING_PAYMENT':    { text: 'Pendiente de Pago',        css: 'bg-orange-100 text-orange-700' },
    'IN_PRODUCTION':      { text: 'En Producción',             css: 'bg-blue-100 text-blue-700' },
    'DONE':               { text: 'Terminado',                 css: 'bg-green-100 text-green-700' },
    'DELIVERED':          { text: 'Entregado',                 css: 'bg-green-100 text-green-700' },
    'CANCELLED':          { text: 'Cancelado',                 css: 'bg-red-100 text-red-700' }
  };

  // Forms state
  viewMode: 'list' | 'add' | 'edit' = 'list';
  orderForm: FormGroup;
  currentOrderClientName = '';

  private readonly fb = inject(FormBuilder);
  private readonly orderService = inject(OrderService);
  private readonly clientService = inject(ClientService);
  private readonly inventoryService = inject(InventoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);

  constructor() {
    this.orderForm = this.fb.group({
      id: [''],
      clientId: [null, Validators.required],
      deliveryDate: ['', Validators.required],
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
      unitPrice: [0]
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
      switch(property) {
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
        this.clientsList = data.map((c: any) => ({ id: Number(c.idCliente), nombre: c.nombre }));
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading clients', err)
    });
  }

  loadProducts(): void {
    this.inventoryService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.productsList = data.map((p: any) => ({ id: Number(p.idProducto), nombre: p.nombre }));
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading products', err)
    });
  }

  onSearchChange(): void {
    this.dataSource.filter = this.searchTerm.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // --- ACTIVAR PRODUCCIÓN ---
  openActivarProduccionModal(order: OrderSummaryDTO): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      panelClass: 'casualidad-dialog',
      data: {
        title: '¿Activar Producci\u00f3n?',
        message: `Pedido: `,
        highlightText: order.codigoUnico || '#' + order.idPedido,
        warningText: 'El pedido pasar\u00e1 al estado En Producci\u00f3n y se generar\u00e1 un c\u00f3digo \u00fanico de seguimiento. Esta acci\u00f3n ',
        confirmLabel: 'S\u00ed, activar producci\u00f3n',
        cancelLabel: 'Cancelar',
        icon: 'play_circle',
        iconStyle: "font-variation-settings:'FILL' 1",
        accentColor: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.selectedOrder = order;
        this.confirmActivarProduccion();
      }
    });
  }

  confirmActivarProduccion(): void {
    if (!this.selectedOrder?.idPedido) { return; }
    this.orderService.activarProduccion(this.selectedOrder.idPedido).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.loadOrders();
        this.dialog.open(SuccessDialogComponent, {
          panelClass: 'casualidad-dialog',
          data: {
            title: '\u00a1En Producci\u00f3n!',
            message: 'El pedido ha sido activado y est\u00e1 en producci\u00f3n.',
            icon: 'verified',
            accentColor: 'primary',
            primaryActionLabel: 'Continuar',
            detailLabel: res?.codigoUnico ? 'C\u00f3digo de seguimiento' : undefined,
            detailValue: res?.codigoUnico
          }
        });
      },
      error: (err) => console.error('Error activando producci\u00f3n', err)
    });
  }

  // --- DELETE ---
  openDeleteModal(order: OrderSummaryDTO): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      panelClass: 'casualidad-dialog',
      data: {
        title: '\u00bfEliminar pedido?',
        message: '\u00bfEst\u00e1s seguro de que deseas eliminar el pedido ',
        highlightText: '#' + (order.codigoUnico || order.idPedido),
        warningText: 'Esta acci\u00f3n ',
        confirmLabel: 'S\u00ed, eliminar pedido',
        icon: 'delete_forever',
        accentColor: 'error'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.selectedOrder = order;
        this.orderService.cancelar(order.idPedido ?? order.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            this.loadOrders();
            this.dialog.open(SuccessDialogComponent, {
              panelClass: 'casualidad-dialog',
              data: {
                title: '\u00a1Pedido Eliminado!',
                message: 'El pedido ha sido eliminado correctamente del sistema.',
                icon: 'check_circle',
                accentColor: 'success',
                primaryActionLabel: 'Continuar'
              }
            });
          },
          error: (err) => console.error('Error cancelando pedido', err)
        });
      }
    });
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

  openEditForm(order: OrderSummaryDTO): void {
    const id = order.idPedido ?? order.id;
    if (!id) return;

    this.orderService.getById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (detail) => this.populateOrderForm(detail, order),
      error: (err) => console.error('Error loading order details', err)
    });
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
        id: detail.idPedido,
        clientId: matchingClient ? matchingClient.id : null,
        deliveryDate: detail.fechaEntrega ? detail.fechaEntrega.split('T')[0] : ''
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
    this.cdr.detectChanges();
  }

  saveOrder(): void {
    if (this.orderForm.valid) {
      const orderData = this.orderForm.value;
      const id = orderData.id;
      
      const request$ = id 
        ? this.orderService.update(id, orderData) 
        : this.orderService.create(orderData);

      request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (res) => {
          this.loadOrders();
          const dialogRef = this.dialog.open(SuccessDialogComponent, {
            panelClass: 'casualidad-dialog',
            data: {
              title: id ? '\u00a1Pedido Actualizado!' : '\u00a1Pedido Creado!',
              message: id ? 'Los detalles del pedido han sido modificados.' : 'El pedido ha sido registrado correctamente.',
              icon: 'check_circle',
              accentColor: 'primary',
              primaryActionLabel: 'Ir a Pedidos',
              secondaryActionLabel: id ? 'Seguir editando' : 'Crear otro pedido'
            }
          });

          dialogRef.afterClosed().subscribe(result => {
            if (!result || result.action === 'primary' || result.action === 'close') {
              this.viewMode = 'list';
            } else if (result.action === 'secondary' && !id) {
              this.openAddForm();
            }
            this.cdr.detectChanges();
          });
        },
        error: (err) => console.error('Error saving order', err)
      });
    } else {
      this.orderForm.markAllAsTouched();
    }
  }
}
