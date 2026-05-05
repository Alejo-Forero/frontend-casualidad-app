import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportesComponent } from './reportes';

import { PaymentService } from '../core/services/payment.service';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('ReportesComponent', () => {
  let component: ReportesComponent;
  let fixture: ComponentFixture<ReportesComponent>;
  let mockPaymentService: any;

  beforeEach(async () => {
    mockPaymentService = {
      getReporteIngresos: jest.fn(() => of({ totalGeneral: 1000, totalEfectivo: 250, totalTransferencia: 750 })),
      getSaldosPendientes: jest.fn(() => of({ pedidos: [] })),
      getUnifiedSaldos: jest.fn(() => of([])),
      exportarSaldosPendientes: jest.fn(() => of(new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))),
    };

    await TestBed.configureTestingModule({
      imports: [ReportesComponent, NoopAnimationsModule],
      providers: [
        { provide: PaymentService, useValue: mockPaymentService },
      ],
    }).compileComponents();

    // Mock URL functions
    if (!(window.URL as any).createObjectURL) {
      Object.defineProperty(window.URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:url') });
    }
    if (!(window.URL as any).revokeObjectURL) {
      Object.defineProperty(window.URL, 'revokeObjectURL', { writable: true, value: jest.fn() });
    }

    fixture = TestBed.createComponent(ReportesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate cashPercentage correctly', () => {
    component.incomeReport.totalIncome = 1000;
    component.incomeReport.cashTotal = 250;
    expect(component.cashPercentage).toBe(25);
    
    component.incomeReport.totalIncome = 0;
    expect(component.cashPercentage).toBe(0);
  });

  it('should calculate transferPercentage correctly', () => {
    component.incomeReport.totalIncome = 1000;
    component.incomeReport.transferTotal = 750;
    expect(component.transferPercentage).toBe(75);
    
    component.incomeReport.totalIncome = 0;
    expect(component.transferPercentage).toBe(0);
  });

  it('should fetch ingresos on date change', () => {
    component.onDateChange();
    expect(mockPaymentService.getReporteIngresos).toHaveBeenCalledWith(component.incomeReport.dateFrom, component.incomeReport.dateTo);
  });

  it('should fetch saldos and map correctly', () => {
    const mockRes = [{
      id: 1,
      code: 'COD1',
      client: 'Juan',
      date: new Date(new Date().getTime() + 86400000 * 2).toISOString(), // 2 days from now
      total: 500,
      pending: 100
    }];
    (mockPaymentService.getUnifiedSaldos as jest.Mock).mockReturnValue(of(mockRes));
    
    component.fetchSaldos();
    
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].clientName).toBe('Juan');
    expect(component.dataSource.data[0].daysUntilDelivery).toBe(2);
  });

  it('should export excel', () => {
    const clickSpy = jest.fn();
    const createSpy = jest.spyOn(document, 'createElement').mockImplementation(() => ({
      click: clickSpy,
      href: '',
      download: ''
    } as any));

    component.exportExcel();
    expect(mockPaymentService.exportarSaldosPendientes).toHaveBeenCalled();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    
    createSpy.mockRestore();
  });

  it('should return correct rank color class', () => {
    expect(component.getRankColorClass(1)).toBe('bg-primary text-on-primary');
    expect(component.getRankColorClass(2)).toBe('bg-secondary text-on-secondary');
    expect(component.getRankColorClass(3)).toBe('bg-tertiary-fixed-dim text-on-tertiary');
    expect(component.getRankColorClass(4)).toBe('bg-neutral-200 text-neutral-600');
  });

  it('should return correct rank progress class', () => {
    expect(component.getRankProgressClass(1)).toBe('bg-primary');
    expect(component.getRankProgressClass(2)).toBe('bg-secondary');
    expect(component.getRankProgressClass(3)).toBe('bg-tertiary-fixed-dim');
    expect(component.getRankProgressClass(4)).toBe('bg-neutral-300');
  });
});
