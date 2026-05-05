import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home';
import { jest } from '@jest/globals';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
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
});
