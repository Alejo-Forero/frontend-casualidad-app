import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PagosComponent } from './pagos';

describe('PagosComponent', () => {
  let component: PagosComponent;
  let fixture: ComponentFixture<PagosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
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
      { id: '1', amount: 100, type: 'CASH', status: 'COMPLETED', orderId: 'O1', clientName: 'C1', createdAt: '2026', voucherUrl: null, exceptionalAuth: false, registeredBy: { id: '1', name: 'Admin' } },
      { id: '2', amount: 50, type: 'TRANSFER', status: 'COMPLETED', orderId: 'O2', clientName: 'C2', createdAt: '2026', voucherUrl: null, exceptionalAuth: false, registeredBy: { id: '1', name: 'Admin' } },
      { id: '3', amount: 200, type: 'CASH', status: 'PENDING', orderId: 'O3', clientName: 'C3', createdAt: '2026', voucherUrl: null, exceptionalAuth: false, registeredBy: { id: '1', name: 'Admin' } },
    ];
    expect(component.totalMonthlyBalance).toBe(150);
  });

  it('should filter payments correctly', () => {
    component.paymentsData = [
      { id: '1', amount: 100, type: 'CASH', status: 'COMPLETED', orderId: 'O1', clientName: 'A', createdAt: '2026', voucherUrl: null, exceptionalAuth: false, registeredBy: { id: '1', name: 'Admin' } },
      { id: '2', amount: 50, type: 'TRANSFER', status: 'PENDING', orderId: 'O2', clientName: 'B', createdAt: '2026', voucherUrl: null, exceptionalAuth: false, registeredBy: { id: '1', name: 'Admin' } }
    ];
    
    component.setFilter('COMPLETED');
    expect(component.filteredPayments.length).toBe(1);
    
    component.setFilter('ALL');
    component.searchTerm = 'B';
    component.onSearchChange();
    expect(component.filteredPayments.length).toBe(1);
    expect(component.filteredPayments[0].clientName).toBe('B');
  });

  it('should handle pagination', () => {
    component.paymentsData = Array(10).fill({ id: '1', amount: 100, type: 'CASH', status: 'COMPLETED', orderId: 'O1', clientName: 'A', date: '2026' });
    component.pageSize = 5;
    component.setFilter('ALL');
    
    component.onPageChange(2);
    expect(component.currentPage).toBe(2);
    expect(component.paginatedPayments.length).toBe(5);
  });

  it('should handle view modal', () => {
    const p = { id: '1', amount: 100, type: 'CASH', status: 'COMPLETED', orderId: 'O1', clientName: 'A', date: '2026' } as any;
    component.openViewModal(p);
    expect(component.showViewModal).toBe(true);
    expect(component.selectedPayment).toBe(p);
    
    component.closeViewModal();
    expect(component.showViewModal).toBe(false);
    expect(component.selectedPayment).toBeNull();
  });

  it('should handle delete modal and confirm', () => {
    component.paymentsData = [{ id: '1', amount: 100, type: 'CASH', status: 'COMPLETED', orderId: 'O1', clientName: 'A', createdAt: '2026', voucherUrl: null, exceptionalAuth: false, registeredBy: { id: '1', name: 'Admin' } }];
    const p = component.paymentsData[0];
    
    component.openDeleteModal(p);
    expect(component.showDeleteModal).toBe(true);
    
    component.confirmDelete();
    expect(component.paymentsData.length).toBe(0);
    expect(component.showDeleteModal).toBe(false);
    expect(component.showSuccessModal).toBe(true);
    
    component.closeSuccessModal();
    expect(component.showSuccessModal).toBe(false);
  });
});
