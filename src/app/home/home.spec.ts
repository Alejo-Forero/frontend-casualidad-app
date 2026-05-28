import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home';
import { jest } from '@jest/globals';
import { of } from 'rxjs';
import { PaymentService } from '../core/services/payment.service';
import { RouterModule } from '@angular/router';

const mockDashboard = {
  ingresosMesActual: 1000,
  ingresosMesAnterior: 800,
  ingresosPorMes: [
    { etiqueta: 'Ene', total: 500 },
    { etiqueta: 'Feb', total: 600 },
    { etiqueta: 'Mar', total: 700 },
    { etiqueta: 'Abr', total: 800 },
    { etiqueta: 'May', total: 900 },
    { etiqueta: 'Jun', total: 1000 }
  ],
  pedidosPendientes: 3,
  pedidosEnProduccion: 2,
  pedidosVencidos: 1,
  pedidosConSaldo: 5,
  stockCritico: 2
};

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  const mockPaymentService = {
    getDashboard: jest.fn().mockReturnValue(of(mockDashboard))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterModule.forRoot([])],
      providers: [
        { provide: PaymentService, useValue: mockPaymentService }
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
    const mockCtx = { canvas: {}, clearRect: jest.fn(), fillRect: jest.fn() };
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

  it('should handle null dashboard response gracefully', () => {
    mockPaymentService.getDashboard.mockReturnValue(of(null));
    (component as any).loadData();
    expect(component.dashboardData.overdueOrders).toBe(0);
  });

  it('should update chart if instance exists when data is loaded', () => {
    const updateSpy = jest.fn();
    component.chartInstance = {
      data: { labels: [], datasets: [{ data: [] }, { data: [] }] },
      update: updateSpy
    } as any;

    mockPaymentService.getDashboard.mockReturnValue(of(mockDashboard));
    (component as any).loadData();

    expect(updateSpy).toHaveBeenCalled();
  });
});
