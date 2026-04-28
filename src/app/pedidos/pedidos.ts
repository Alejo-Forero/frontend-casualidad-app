import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { PaginationComponent } from '../shared/pagination/pagination';
import { OrderSummaryDTO, OrderStatus } from '../core/models/order.dto';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './pedidos.html',
  styleUrls: ['./pedidos.css']
})
export class PedidosComponent implements OnInit {
  ordersData: OrderSummaryDTO[] = [];
  filteredOrders: OrderSummaryDTO[] = [];
  paginatedOrders: OrderSummaryDTO[] = [];

  searchTerm = '';
  currentPage = 1;
  pageSize = 5;

  currentSort: { column: string | null, direction: 'asc' | 'desc' } = { column: null, direction: 'asc' };

  // Modals state
  showDeleteModal = false;
  showSuccessModal = false;
  selectedOrder: OrderSummaryDTO | null = null;

  // Mapa de estado para UI
  statusMap: Record<OrderStatus, { text: string, css: string }> = {
    'PENDING_ACCEPTANCE': { text: 'Pendiente de Aceptación', css: 'bg-orange-100 text-orange-700' },
    'PENDING_PAYMENT': { text: 'Pendiente de Pago', css: 'bg-orange-100 text-orange-700' },
    'EN_PRODUCCION': { text: 'En Producción', css: 'bg-blue-100 text-blue-700' },
    'IN_PRODUCTION': { text: 'En Producción', css: 'bg-blue-100 text-blue-700' },
    'DONE': { text: 'Terminado', css: 'bg-green-100 text-green-700' },
    'DELIVERED': { text: 'Entregado', css: 'bg-green-100 text-green-700' },
    'CANCELLED': { text: 'Cancelado', css: 'bg-red-100 text-red-700' }
  };

  // Forms state
  viewMode: 'list' | 'add' | 'edit' | 'view' | 'formalize' = 'list';
  orderForm: FormGroup;
  showFormSuccessModal = false;

  // Mock data for dropdowns
  clients = ['Sofía Martínez', 'Mariana López', 'Empresa Soluciones IT', 'Carlos Restrepo'];
  productsList = [
    { id: '1', name: 'Crónicas de Casualidad', price: 24.99 },
    { id: '2', name: 'El Arte del Azar', price: 55 },
    { id: '3', name: 'Revista Mensual Ed. 12', price: 12.5 },
    { id: '4', name: 'Kit Creativo Transformado', price: 89.99 }
  ];

  private readonly fb = inject(FormBuilder);

  constructor() {
    this.orderForm = this.fb.group({
      id: [''],
      clientId: ['', Validators.required],
      eventType: [''],
      forWhom: [''],
      deliveryDate: ['', Validators.required],
      status: ['PENDING_ACCEPTANCE', Validators.required],
      finalPrice: [0, [Validators.min(0)]],
      specifications: [''],
      items: this.fb.array([])
    });

    // Auto-calculate total
    this.itemsFormArray.valueChanges.subscribe(items => {
      // Implementation pending
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

  addItem() {
    this.itemsFormArray.push(this.fb.group({
      productId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      customization: ['']
    }));
  }

  removeItem(index: number) {
    this.itemsFormArray.removeAt(index);
  }

  onProductSelect(index: number) {
    const itemGroup = this.itemsFormArray.at(index) as FormGroup;
    const productId = itemGroup.get('productId')?.value;
    const prod = this.productsList.find(p => p.id === productId || p.name === productId);
    if (prod) {
      itemGroup.patchValue({ unitPrice: prod.price });
    }
  }

  ngOnInit() {
    this.applyFiltersAndSort();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.applyFiltersAndSort();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.applyFiltersAndSort();
  }

  handleSort(column: string) {
    if (this.currentSort.column === column) {
      this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSort.column = column;
      this.currentSort.direction = 'asc';
    }
    this.applyFiltersAndSort();
  }

  getSortIcon(column: string): string {
    if (this.currentSort.column !== column) return 'unfold_more';
    return this.currentSort.direction === 'asc' ? 'expand_less' : 'expand_more';
  }

  private applyFiltersAndSort() {
    let result = [...this.ordersData];

    // Filter
    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(o => 
        (o.idPedido ? String(o.idPedido).includes(term) : false) ||
        (o.codigoUnico ? o.codigoUnico.toLowerCase().includes(term) : false) ||
        (o.cliente?.nombreCompleto ? o.cliente.nombreCompleto.toLowerCase().includes(term) : false)
      );
    }

    // Sort
    if (this.currentSort.column) {
      result.sort((a, b) => {
        let valA: any, valB: any;
        switch (this.currentSort.column) {
          case 'id':
            valA = a.code || a.id;
            valB = b.code || b.id;
            break;
          case 'cliente':
            valA = a.clientName;
            valB = b.clientName;
            break;
          case 'estado':
            valA = a.status;
            valB = b.status;
            break;
          case 'fecha':
            valA = a.fechaEntrega ? new Date(a.fechaEntrega).getTime() : 0;
            valB = b.fechaEntrega ? new Date(b.fechaEntrega).getTime() : 0;
            break;
          case 'saldo':
            valA = a.pendingBalance;
            valB = b.pendingBalance;
            break;
          default:
            return 0;
        }

        if (valA < valB) return this.currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return this.currentSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    this.filteredOrders = result;

    // Paginate
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedOrders = this.filteredOrders.slice(start, end);

    if (this.paginatedOrders.length === 0 && this.currentPage > 1) {
      this.currentPage = 1;
      this.applyFiltersAndSort();
    }
  }

  openDeleteModal(order: OrderSummaryDTO) {
    this.selectedOrder = order;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedOrder = null;
  }

  confirmDelete() {
    if (this.selectedOrder) {
      this.ordersData = this.ordersData.filter(o => o.id !== this.selectedOrder!.id);
      this.applyFiltersAndSort();
      this.closeDeleteModal();
      this.showSuccessModal = true;
    }
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
  }

  // --- FORM ACTIONS ---
  openAddForm() {
    this.orderForm.reset({
      status: 'PENDING_ACCEPTANCE',
      finalPrice: 0,
      deliveryDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString().split('T')[0]
    });
    this.itemsFormArray.clear();
    this.addItem(); // default 1 empty item
    this.viewMode = 'add';
  }

  openEditForm(order: OrderSummaryDTO) {
    this.orderForm.patchValue({
      idPedido: order.idPedido || 0,
      codigoUnico: order.codigoUnico || '',
      estadoPedido: order.estadoPedido,
      fechaEntrega: order.fechaEntrega ? order.fechaEntrega.split('T')[0] : '',
      total: order.total,
      saldoPendiente: order.saldoPendiente,
      cliente: order.cliente
    });
    this.itemsFormArray.clear();
    // Normally we would populate items from order details.
    // For now add one dummy item since it's a summary list.
    this.addItem();
    
    this.viewMode = 'edit';
  }

  closeForm() {
    this.viewMode = 'list';
  }

  saveOrder() {
    if (this.orderForm.valid) {
      this.showFormSuccessModal = true;
    } else {
      this.orderForm.markAllAsTouched();
    }
  }

  closeFormSuccessModal(goToList: boolean) {
    this.showFormSuccessModal = false;
    if (goToList) {
      this.viewMode = 'list';
    } else if (this.viewMode === 'add') {
      this.openAddForm();
    }
  }
}
