import { PaymentService } from '../core/services/payment.service';
import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PagosComponent } from './pagos';

const mockPaymentService = {
  getSaldosPendientes: () => of({ pedidos: [] }),
  registrarAbono: () => of({})
};

const mockPayment = {
  id: '1', idPedido: 1, orderId: 'P001', clientName: 'Alpha',
  amount: 100, type: 'CASH', status: 'PENDING',
  createdAt: '2026-01-01', voucherUrl: null,
  registeredBy: { id: '1', name: 'Admin' }, exceptionalAuth: false
} as any;

describe('PagosComponent', () => {
  let component: PagosComponent;
  let fixture: ComponentFixture<PagosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [{ provide: PaymentService, useValue: mockPaymentService }],
      imports: [PagosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PagosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should compute totalMonthlyBalance correctly', () => {
    component.paymentsData = [
      { ...mockPayment, id: '1', amount: 100, status: 'PENDING' },
      { ...mockPayment, id: '2', amount: 50,  status: 'COMPLETED' },
      { ...mockPayment, id: '3', amount: 200, status: 'PENDING' },
    ];
    expect(component.totalMonthlyBalance).toBe(300);
  });

  it('should filter payments by status', () => {
    component.paymentsData = [
      { ...mockPayment, id: '1', status: 'COMPLETED', clientName: 'A' },
      { ...mockPayment, id: '2', status: 'PENDING',   clientName: 'B' }
    ];
    component.setFilter('COMPLETED');
    expect(component.filteredPayments.length).toBe(1);
    expect(component.filteredPayments[0].clientName).toBe('A');
  });

  it('should filter payments by search term', () => {
    component.paymentsData = [
      { ...mockPayment, id: '1', status: 'COMPLETED', clientName: 'Alpha', orderId: 'O1' },
      { ...mockPayment, id: '2', status: 'PENDING',   clientName: 'Beta',  orderId: 'O2' }
    ];
    component.setFilter('ALL');
    component.searchTerm = 'Alpha';
    component.onSearchChange();
    expect(component.filteredPayments.length).toBe(1);
    expect(component.filteredPayments[0].clientName).toBe('Alpha');
  });

  it('should handle pagination', () => {
    component.paymentsData = Array(10).fill(mockPayment);
    component.pageSize = 5;
    component.setFilter('ALL');
    component.onPageChange(2);
    expect(component.currentPage).toBe(2);
    expect(component.paginatedPayments.length).toBe(5);
  });

  it('should handle openViewModal and closeViewModal', () => {
    component.openViewModal(mockPayment);
    expect(component.showViewModal).toBe(true);
    expect(component.selectedPayment).toBe(mockPayment);
    component.closeViewModal();
    expect(component.showViewModal).toBe(false);
  });

  it('should handle openDeleteModal and confirmDelete', () => {
    component.paymentsData = [{ ...mockPayment, id: '1' }];
    component.openDeleteModal(component.paymentsData[0]);
    expect(component.showDeleteModal).toBe(true);
    component.confirmDelete();
    expect(component.showSuccessModal).toBe(true);
    component.closeSuccessModal();
    expect(component.showSuccessModal).toBe(false);
  });

  it('should handle openAddForm and closeForm', () => {
    component.openAddForm();
    expect(component.viewMode).toBe('add');
    component.closeForm();
    expect(component.viewMode).toBe('list');
  });

  it('should handle savePayment with invalid form', () => {
    component.openAddForm();
    component.savePayment();
    expect(component.showFormSuccessModal).toBe(false);
  });

  it('should handle handleSort and getSortIcon', () => {
    component.handleSort('amount');
    expect(component.currentSort.column).toBe('amount');
    expect(component.currentSort.direction).toBe('asc');
    component.handleSort('amount');
    expect(component.currentSort.direction).toBe('desc');
    expect(component.getSortIcon('amount')).toBeDefined();
    expect(component.getSortIcon('other')).toBeDefined();
  });

  it('should handle closeFormSuccessModal branches', () => {
    component.viewMode = 'add';
    component.showFormSuccessModal = true;
    component.closeFormSuccessModal(true);
    expect(component.viewMode).toBe('list');

    component.openAddForm();
    component.showFormSuccessModal = true;
    component.closeFormSuccessModal(false);
    expect(component.viewMode).toBe('add');
  });
});
