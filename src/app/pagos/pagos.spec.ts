import { PaymentService } from '../core/services/payment.service';
import { of, throwError, Subject } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PagosComponent } from './pagos';
import { MatDialog } from '@angular/material/dialog';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { UIService } from '../core/services/ui.service';
import { Router } from '@angular/router';

const mockPayment = {
  id: '1', idPago: 1, idPedido: 1, orderId: 'P001', clientName: 'Alpha',
  monto: 100, amount: 100, type: 'CASH', status: 'PENDING',
  createdAt: '2026-01-01', voucherUrl: null,
  registeredBy: { id: '1', name: 'Admin' }, exceptionalAuth: false
} as any;

describe('PagosComponent', () => {
  let component: PagosComponent;
  let fixture: ComponentFixture<PagosComponent>;
  let mockPaymentService: any;
  let mockDialog: { open: jest.Mock };
  let mockUIService: { showSuccess: jest.Mock, showConfirm: jest.Mock, showError: jest.Mock };
  let mockRouter: any;

  const dialogRefStub = (result: any) => ({
    afterClosed: () => of(result),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPaymentService = {
      getSaldosPendientes: jest.fn(() => of({ data: { content: [mockPayment] } })),
      getUnifiedSaldos: jest.fn(() => of([])),
      registrarAbono: jest.fn(() => of({ id: 1 })),
      getHistorialPagos: jest.fn(() => of({ data: { content: [] } })),
      getPayments: jest.fn(() => of({
        pageNumber: 1,
        pageSize: 5,
        totalElements: 1,
        totalPages: 1,
        data: []
      })),
      eliminarAbono: jest.fn(() => of({})),
      editarAbono: jest.fn(() => of({}))
    };

    mockDialog = { open: jest.fn(() => dialogRefStub({ action: 'primary' })) };
    mockUIService = {
      showSuccess: jest.fn(() => of({ action: 'primary' })),
      showConfirm: jest.fn(() => of(true)),
      showError: jest.fn(() => of(true))
    };

    mockRouter = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: UIService, useValue: mockUIService }
      ],
      imports: [PagosComponent],
    }).overrideProvider(MatDialog, { useValue: mockDialog })
      .overrideProvider(UIService, { useValue: mockUIService })
      .compileComponents();

    fixture = TestBed.createComponent(PagosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });

  it('should compute totalMonthlyBalance correctly', () => {
    component.paymentsListed = [
      { ...mockPayment, monto: 100, estadoPedido: 'PENDIENTE' },
      { ...mockPayment, monto: 50, estadoPedido: 'TERMINADO' }
    ];
    expect(component.totalMonthlyBalance).toBe(100);
  });

  describe('savePayment', () => {
    it('should call registrarAbono on add mode', () => {
      component.viewMode = 'add';
      component.paymentForm.patchValue({ idPedido: 50, amount: 100, type: 'EFECTIVO' });
      component.savePayment();
      expect(mockPaymentService.registrarAbono).toHaveBeenCalledWith(50, expect.objectContaining({ monto: 100 }));
    });

    it('debería llamar a editarAbono cuando viewMode es "edit" y el id existe', () => {
      component.viewMode = 'edit';
      component.paymentForm.setValue({
        id: 10,
        idPedido: 50,
        amount: 250.50,
        type: 'TRANSFERENCIA',
        referenciaComprobante: 'REF-123'
      });

      const payloadEsperado = {
        monto: 250.50,
        metodoPago: 'TRANSFERENCIA',
        referenciaComprobante: 'REF-123'
      };

      component.savePayment();

      expect(mockPaymentService.editarAbono).toHaveBeenCalledTimes(1);
      expect(mockPaymentService.editarAbono).toHaveBeenCalledWith(50, 10, payloadEsperado);
    });

    it('should log error when saving fails', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => { });
      mockPaymentService.registrarAbono.mockReturnValue(throwError(() => new Error('Err')));
      component.viewMode = 'add';
      component.paymentForm.patchValue({ idPedido: 1, amount: 50 });
      component.savePayment();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  it('should handle delete lifecycle', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => { });
    component.openDeleteModal(mockPayment);
    expect(mockUIService.showConfirm).toHaveBeenCalled();

    mockPaymentService.eliminarAbono.mockReturnValue(throwError(() => 'Error'));
    component.confirmDelete(mockPayment);
    expect(mockUIService.showError).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should handle view modal', () => {
    component.openViewModal(mockPayment);
    expect(component.showViewModal).toBe(true);
    component.closeViewModal();
    expect(component.showViewModal).toBe(false);
  });

  it('should filter correctly', () => {
    const item = { idPago: 1, nombreCliente: 'Juan', estadoPedido: 'PENDIENTE' } as any;
    component.searchTerm = 'juan';
    component.setFilter('PENDIENTE');
    expect(component.dataSource.filterPredicate(item, '')).toBe(true);

    component.searchTerm = 'pedro';
    expect(component.dataSource.filterPredicate(item, '')).toBe(false);
  });

  it('should not save if form is invalid', () => {
    component.paymentForm.patchValue({ idPedido: null });
    component.savePayment();
    expect(mockPaymentService.registrarAbono).not.toHaveBeenCalled();
  });

  it('should sort correctly', () => {
    const item = { idPago: 5, nombreCliente: 'Alpha', monto: 100 } as any;
    expect(component.dataSource.sortingDataAccessor(item, 'idPago')).toBe(5);
    expect(component.dataSource.sortingDataAccessor(item, 'monto')).toBe(100);
    expect(component.dataSource.sortingDataAccessor(item, 'cliente')).toBe('Alpha');
  });

  it('should cover router navigation', () => {
    component.verReportes();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/reportes']);
  });

  it('should cover paginator branches', () => {
    const mockPaginator = { firstPage: jest.fn(), page: new Subject(), initialized: of(true) };
    component.dataSource.paginator = mockPaginator as any;
    component.applyFilters();
    expect(mockPaginator.firstPage).toHaveBeenCalled();
  });
  it('should apply filters when search changes', () => {
    const spy = jest.spyOn(component.dataSource, 'filter', 'set');
    component.onSearchChange();
    expect(spy).toHaveBeenCalled();
  });

  it('should return max amount for selected order', () => {
    component.paymentsData = [{ idPedido: 123, amount: 500 } as any];
    component.paymentForm.patchValue({ idPedido: 123 });
    expect(component.getMaxAmount()).toBe(500);
  });

  it('should handle amount error when exceeding max', () => {
    component.paymentsData = [{ idPedido: 123, amount: 500 } as any];
    component.paymentForm.patchValue({ idPedido: 123, amount: 600 });
    expect(component.hasAmountError()).toBe(true);
    
    component.paymentForm.patchValue({ amount: 400 });
    expect(component.hasAmountError()).toBe(false);
  });

  it('should open edit form and patch values', () => {
    const payment = { ...mockPayment, idPago: 10, idPedido: 5, monto: 150, metodoPago: 'CASH' };
    component.openEditForm(payment);
    expect(component.viewMode).toBe('edit');
    expect(component.selectedPayment).toBe(payment);
    expect(component.paymentForm.get('id')?.value).toBe(10);
    expect(component.paymentForm.get('idPedido')?.value).toBe(5);
  });

  it('should close form and return to list', () => {
    component.viewMode = 'add';
    component.closeForm();
    expect(component.viewMode).toBe('list');
    expect(component.selectedPayment).toBeNull();
  });

  it('should call editarAbono on edit mode', () => {
    component.openEditForm({ ...mockPayment, idPago: 10, idPedido: 5, metodoPago: 'CASH' });
    component.paymentForm.patchValue({ amount: 200 });
    component.savePayment();
    expect(mockPaymentService.editarAbono).toHaveBeenCalled();
  });

  it('should handle savePayment with primary action result', () => {
    component.viewMode = 'add';
    component.paymentForm.patchValue({ idPedido: 50, amount: 100 });
    mockUIService.showSuccess.mockReturnValue(of({ action: 'primary' }));
    
    component.savePayment();
    
    expect(component.viewMode).toBe('list');
  });

  it('should open and close view modal', () => {
    const payment = { ...mockPayment };
    component.openViewModal(payment);
    expect(component.selectedPayment).toBe(payment);
    expect(component.showViewModal).toBe(true);

    component.closeViewModal();
    expect(component.selectedPayment).toBeNull();
    expect(component.showViewModal).toBe(false);
  });

  it('should handle fetchPayments error', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    mockPaymentService.getPayments.mockReturnValue(throwError(() => new Error('Fetch error')));
    component.fetchPayments();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle loadPayments error', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    mockPaymentService.getUnifiedSaldos.mockReturnValue(throwError(() => new Error('Load error')));
    component.loadPayments();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('openDeleteModal should show confirm and call confirmDelete if confirmed', () => {
    const spy = jest.spyOn(component, 'confirmDelete');
    mockUIService.showConfirm.mockReturnValue(of(true));
    component.openDeleteModal(mockPayment);
    expect(mockUIService.showConfirm).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(mockPayment);
  });

  it('openDeleteModal should NOT call confirmDelete if cancelled', () => {
    const spy = jest.spyOn(component, 'confirmDelete');
    mockUIService.showConfirm.mockReturnValue(of(false));
    component.openDeleteModal(mockPayment);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should handle savePayment with secondary action to add another', () => {
    component.viewMode = 'add';
    component.paymentForm.patchValue({ idPedido: 50, amount: 100, type: 'EFECTIVO' });
    mockUIService.showSuccess.mockReturnValue(of({ action: 'secondary' }));
    const spy = jest.spyOn(component, 'openAddForm');
    
    component.savePayment();
    
    expect(spy).toHaveBeenCalled();
  });

  it('should map payment types correctly', () => {
    expect((component as any).mapPaymentType('CASH')).toBe('EFECTIVO');
    expect((component as any).mapPaymentType('TRANSFER')).toBe('TRANSFERENCIA');
    expect((component as any).mapPaymentType('OTHER')).toBe('OTHER');
  });

  it('should handle savePayment error', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    component.viewMode = 'add';
    component.paymentForm.patchValue({ idPedido: 50, amount: 100 });
    mockPaymentService.registrarAbono.mockReturnValue(throwError(() => new Error('Save error')));
    
    component.savePayment();
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should show error when delete fails', () => {
    mockPaymentService.eliminarAbono.mockReturnValue(throwError(() => new Error('Error')));
    component.confirmDelete({ idPedido: 1, idPago: '1' } as any);
    expect(mockUIService.showError).toHaveBeenCalled();
  });
});
