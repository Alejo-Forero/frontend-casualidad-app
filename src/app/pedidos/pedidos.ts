import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../shared/pagination/pagination';
import { OrderSummaryDTO, OrderStatus } from '../core/models/order.dto';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
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
    'PENDING_ACCEPTANCE': { text: 'Pendiente Aceptación', css: 'bg-orange-100 text-orange-700' },
    'PENDING_PAYMENT': { text: 'Pendiente Pago', css: 'bg-orange-100 text-orange-700' },
    'IN_PRODUCTION': { text: 'En producción', css: 'bg-blue-100 text-blue-700' },
    'DONE': { text: 'Terminado', css: 'bg-green-100 text-green-700' },
    'DELIVERED': { text: 'Entregado', css: 'bg-emerald-100 text-emerald-800' },
    'CANCELLED': { text: 'Cancelado', css: 'bg-red-100 text-red-700' }
  };

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
        (o.code && o.code.toLowerCase().includes(term)) ||
        o.id.toLowerCase().includes(term) ||
        o.clientName.toLowerCase().includes(term)
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
            // Order defined logically if needed, fallback to string sorting
            valA = a.status;
            valB = b.status;
            break;
          case 'fecha':
            valA = new Date(a.deliveryDate).getTime();
            valB = new Date(b.deliveryDate).getTime();
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
}
