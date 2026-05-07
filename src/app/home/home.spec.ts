import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home';
import { jest } from '@jest/globals';
import { of } from 'rxjs';
import { PaymentService } from '../core/services/payment.service';
import { InventoryService } from '../core/services/inventory.service';
import { OrderService } from '../core/services/order.service';
import { RouterModule } from '@angular/router';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  const mockPaymentService = {
    getSaldosPendientes: jest.fn().mockReturnValue(of({ cantidadPedidosPendientes: 5, pedidos: [] })),
    getReporteIngresos: jest.fn().mockReturnValue(of({ totalGeneral: 1000, totalEfectivo: 600, totalTransferencia: 400 }))
  };

  const mockInventoryService = {
    getAll: jest.fn().mockReturnValue(of([
      { id: '1', isLowStock: true },
      { id: '2', isLowStock: false }
    ]))
  };

  const mockOrderService = {
    getAll: jest.fn().mockReturnValue(of([
      { id: '1', status: 'PENDIENTE' },
      { id: '2', status: 'TERMINADO' }
    ]))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterModule.forRoot([])],
      providers: [
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: OrderService, useValue: mockOrderService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate getters correctly', () => {
    component.dashboardData.profitVsExpense.profit = [100, 200];
    component.dashboardData.profitVsExpense.expense = [50, 50];
    
    expect(component.totalProfit).toBe(300);
    expect(component.totalExpense).toBe(100);
    expect(component.netBalance).toBe(200);
  });

  it('should initialize chart with context', () => {
    const mockCtx = {
      canvas: {},
      clearRect: jest.fn(),
      fillRect: jest.fn()
    };
    component.chartCanvas = { nativeElement: { getContext: () => mockCtx } } as any;
    
    component.dashboardData.profitVsExpense.months = ['Ene', 'Feb'];
    component.dashboardData.profitVsExpense.profit = [1000, 2000];
    
    component.ngAfterViewInit();
    expect(component.chartInstance).toBeDefined();
  });

  it('should handle missing context gracefully', () => {
    component.chartCanvas = { nativeElement: { getContext: () => null } } as any;
    component.ngAfterViewInit();
    expect(component.chartInstance).toBeUndefined();
  });

  it('should handle null/undefined service responses gracefully', () => {
    mockPaymentService.getSaldosPendientes.mockReturnValue(of(null));
    mockPaymentService.getReporteIngresos.mockReturnValue(of(undefined));
    
    // Trigger loadData again
    (component as any).loadData();
    
    expect(component.dashboardData.ordersWithDebt).toBe(0);
    expect(component.monthlyIncome).toBe(0);
  });

  it('should update chart if instance exists when data is loaded', () => {
    // 1. Create a mock chart instance
    const updateSpy = jest.fn();
    component.chartInstance = {
      data: { datasets: [{ data: [] }, { data: [] }] },
      update: updateSpy
    } as any;

    mockPaymentService.getReporteIngresos.mockReturnValue(of({ totalGeneral: 5000 }));
    
    // 2. Trigger data load
    (component as any).loadData();
    
    expect(updateSpy).toHaveBeenCalled();
    expect(component.chartInstance?.data.datasets[0].data[5]).toBe(5000);
  });
});
