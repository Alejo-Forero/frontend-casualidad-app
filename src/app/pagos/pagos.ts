import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../shared/pagination/pagination';
import { PaymentDTO, PaymentStatus, PaymentType } from '../core/models/payment.dto';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './pagos.html',
  styleUrls: ['./pagos.css']
})
export class PagosComponent implements OnInit {
  paymentsData: PaymentDTO[] = [];
  filteredPayments: PaymentDTO[] = [];
  paginatedPayments: PaymentDTO[] = [];

  searchTerm = '';
  currentFilter: 'ALL' | PaymentStatus = 'ALL';
  
  currentPage = 1;
  pageSize = 5;

  // Modals state
  showDeleteModal = false;
  showSuccessModal = false;
  showViewModal = false;
  selectedPayment: PaymentDTO | null = null;

  statusMap: Record<PaymentStatus, { text: string, css: string }> = {
    'COMPLETED': { text: 'Completado', css: 'bg-green-100 text-green-700' },
    'PENDING': { text: 'Pendiente', css: 'bg-orange-100 text-orange-700' },
    'CANCELLED': { text: 'Cancelado', css: 'bg-red-100 text-red-700' }
  };

  typeMap: Record<PaymentType, { text: string, icon: string }> = {
    'CASH': { text: 'Efectivo', icon: 'payments' },
    'TRANSFER': { text: 'Transferencia', icon: 'account_balance' }
  };

  ngOnInit() {
    this.applyFilters();
  }

  setFilter(filter: 'ALL' | PaymentStatus) {
    this.currentFilter = filter;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.applyFilters();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.applyFilters();
  }

  private applyFilters() {
    let result = this.paymentsData;

    // Apply Type Filter
    if (this.currentFilter !== 'ALL') {
      result = result.filter(p => p.status === this.currentFilter);
    }

    // Apply Search
    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(p => 
        p.id.toLowerCase().includes(term) ||
        (p.clientName && p.clientName.toLowerCase().includes(term)) ||
        p.orderId.toLowerCase().includes(term)
      );
    }

    this.filteredPayments = result;

    // Paginate
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedPayments = this.filteredPayments.slice(start, end);

    if (this.paginatedPayments.length === 0 && this.currentPage > 1) {
      this.currentPage = 1;
      this.applyFilters();
    }
  }

  get totalMonthlyBalance(): number {
    return this.paymentsData
      .filter(p => p.status === 'COMPLETED')
      .reduce((acc, p) => acc + p.amount, 0);
  }

  // View Actions
  openViewModal(payment: PaymentDTO) {
    this.selectedPayment = payment;
    this.showViewModal = true;
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedPayment = null;
  }

  // Delete Actions
  openDeleteModal(payment: PaymentDTO) {
    this.selectedPayment = payment;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    if (!this.showViewModal) {
      this.selectedPayment = null;
    }
  }

  confirmDelete() {
    if (this.selectedPayment) {
      this.paymentsData = this.paymentsData.filter(p => p.id !== this.selectedPayment!.id);
      this.applyFilters();
      this.closeDeleteModal();
      this.showSuccessModal = true;
    }
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.selectedPayment = null;
  }
}
