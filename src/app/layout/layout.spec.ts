import { ComponentFixture, TestBed } from '@angular/core/testing';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { LayoutComponent } from './layout';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { OrderService } from '../core/services/order.service';
import { InventoryService } from '../core/services/inventory.service';
import { of, BehaviorSubject } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ScreenSizeService } from '../core/services/screen-size.service';

describe('LayoutComponent', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;
  let mockDialog: any;
  let mockAuthService: any;
  let mockOrderService: any;
  let mockInventoryService: any;
  let screenSizeSubject: BehaviorSubject<boolean>;

  beforeEach(async () => {
    mockDialog = {
      open: jest.fn()
    };

    mockAuthService = {
      getUser: jest.fn(() => ({ id: '1', nombre: 'Test', email: 'test@test.com', rol: 'ADMIN' })),
      clearSession: jest.fn()
    };

    mockOrderService = {
      getAll: jest.fn(() => of([]))
    };

    mockInventoryService = {
      getAll: jest.fn(() => of([]))
    };

    screenSizeSubject = new BehaviorSubject<boolean>(false);

    await TestBed.configureTestingModule({
      imports: [LayoutComponent, NoopAnimationsModule],
      providers: [
        {
          provide: Router,
          useValue: { navigate: jest.fn() }
        },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({}) }
        },
        {
          provide: AuthService,
          useValue: mockAuthService
        },
        {
          provide: MatDialog,
          useValue: mockDialog
        },
        {
          provide: OrderService,
          useValue: mockOrderService
        },
        {
          provide: InventoryService,
          useValue: mockInventoryService
        },
        {
          provide: ScreenSizeService,
          useValue: { isBelowDesktop$: screenSizeSubject.asObservable() }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    
    fixture.detectChanges();
    
    // Mock sidenav AFTER detectChanges so Angular doesn't overwrite it
    component.sidenav = {
      open: jest.fn(),
      close: jest.fn(),
      toggle: jest.fn()
    } as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle mobile view transition and auto-open sidenav on desktop', () => {
    // 1. Ir a móvil
    screenSizeSubject.next(true);
    fixture.detectChanges();
    
    // 2. Volver a escritorio
    screenSizeSubject.next(false);
    fixture.detectChanges();
    expect(component.sidenav.open).toHaveBeenCalled();
  });

  it('should filter and sort notifications correctly', () => {
    const today = new Date();
    const in3Days = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
    const in6Days = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6);
    const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const mockOrders = [
      { idPedido: 1, status: 'PENDIENTE',     deliveryDate: toISO(in6Days) },
      { idPedido: 2, status: 'ENTREGADO',     deliveryDate: toISO(in3Days) },
      { idPedido: 3, status: 'EN_PRODUCCION', deliveryDate: toISO(in3Days) }
    ];
    mockOrderService.getAll.mockReturnValue(of(mockOrders));

    component.loadNotifications();
    // idPedido 2 es ENTREGADO → excluido; idPedido 1 y 3 son activos dentro de 7 días
    expect(component.expiringOrders.length).toBe(2);
    expect(component.expiringOrders[0].idPedido).toBe(3); // in3Days antes que in6Days
  });

  it('should toggle profile dropdown on button click', () => {
    const mockEvent = { stopPropagation: jest.fn() } as any;
    component.toggleProfileDropdown(mockEvent);
    expect(component.showProfileDropdown).toBe(true);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();

    component.toggleProfileDropdown(mockEvent);
    expect(component.showProfileDropdown).toBe(false);
  });

  it('should toggle notifications dropdown and handle both branches', () => {
    const mockEvent = { stopPropagation: jest.fn() } as any;
    
    // Toggle ON
    component.toggleNotificationsDropdown(mockEvent);
    expect(component.showNotificationsDropdown).toBe(true);
    expect(mockInventoryService.getAll).toHaveBeenCalled();

    // Toggle OFF
    component.toggleNotificationsDropdown(mockEvent);
    expect(component.showNotificationsDropdown).toBe(false);
  });

  it('should open config modal and close others', () => {
    const mockEvent = { stopPropagation: jest.fn() } as any;
    component.showProfileDropdown = true;
    component.openConfigModal(mockEvent);
    expect(component.showConfigModal).toBe(true);
    expect(component.showProfileDropdown).toBe(false);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();

    component.closeConfigModal();
    expect(component.showConfigModal).toBe(false);
  });

  it('should handle missing user data gracefully', () => {
    mockAuthService.getUser.mockReturnValue(null);
    const newComponent = TestBed.createComponent(LayoutComponent).componentInstance;
    expect(newComponent.currentUser.nombre).toBe('Usuario');
  });

  it('should handle document click to close dropdowns', () => {
    component.showProfileDropdown = true;
    component.showNotificationsDropdown = true;
    component.onDocumentClick();
    expect(component.showProfileDropdown).toBe(false);
    expect(component.showNotificationsDropdown).toBe(false);
  });

  it('should open various dialogs with event prevention', () => {
    const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() } as any;
    
    component.openLogoutDialog(event);
    expect(event.preventDefault).toHaveBeenCalled();
    
    component.openDeleteUserDialog(event);
    expect(event.stopPropagation).toHaveBeenCalled();
    
    component.openHelpDialog(event);
    expect(mockDialog.open).toHaveBeenCalledTimes(3);
  });

  it('should navigate to nuevo pedido', () => {
    const router = TestBed.inject(Router);
    const spy = jest.spyOn(router, 'navigate');
    component.navigateToNuevoPedido();
    expect(spy).toHaveBeenCalledWith(['/pedidos'], { queryParams: { new: 'true' } });
  });
});
