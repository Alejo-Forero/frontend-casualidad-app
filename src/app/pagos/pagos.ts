import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaginationComponent } from '../shared/pagination/pagination';
import { PaymentDTO, PaymentStatus, PaymentType } from '../core/models/payment.dto';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
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

  currentSort = { column: '', direction: 'asc' as 'asc' | 'desc' };

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

  // Forms state
  viewMode: 'list' | 'add' | 'edit' = 'list';
  paymentForm: FormGroup;
  showFormSuccessModal = false;

  // Mocks
  orders = ['#CL-1024 - Sofía Martínez', '#CL-1025 - Julian Castro', '#CL-1026 - Elena Pardo'];

  private fb = inject(FormBuilder);

  constructor() {
    this.paymentForm = this.fb.group({
      id: [''],
      orderId: ['', Validators.required],
      date: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      type: ['', Validators.required],
      evidence: [''], // Optional
      status: ['COMPLETED', Validators.required]
    });
  }

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
        p.clientName?.toLowerCase().includes(term) ||
        p.orderId.toLowerCase().includes(term)
      );
    }

    // Sort
    if (this.currentSort.column) {
      result.sort((a, b) => {
        const valA = (a as any)[this.currentSort.column];
        const valB = (b as any)[this.currentSort.column];
        if (valA < valB) return this.currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return this.currentSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
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

  handleSort(column: string) {
    if (this.currentSort.column === column) {
      this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSort.column = column;
      this.currentSort.direction = 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(column: string): string {
    if (this.currentSort.column !== column) return 'unfold_more';
    return this.currentSort.direction === 'asc' ? 'expand_less' : 'expand_more';
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

  // --- FORM ACTIONS ---
  openAddForm() {
    this.paymentForm.reset({
      date: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
      status: 'COMPLETED'
    });
    this.viewMode = 'add';
  }

  openEditForm(payment: PaymentDTO) {
    this.paymentForm.patchValue({
      id: payment.id,
      orderId: payment.orderId, // We assume matching mock strings or similar logic
      date: payment.createdAt.slice(0, 16), // Strip milliseconds/Z if needed for datetime-local
      amount: payment.amount,
      type: payment.type,
      status: payment.status
    });
    this.viewMode = 'edit';
  }

  closeForm() {
    this.viewMode = 'list';
  }

  savePayment() {
    if (this.paymentForm.valid) {
      this.showFormSuccessModal = true;
    } else {
      this.paymentForm.markAllAsTouched();
    }
  }

  closeFormSuccessModal(goToList: boolean) {
    this.showFormSuccessModal = false;
    if (goToList) {
      this.viewMode = 'list';
    } else {
      if (this.viewMode === 'add') {
        this.openAddForm();
      }
    }
  }
}
