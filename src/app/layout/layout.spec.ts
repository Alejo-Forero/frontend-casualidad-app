import { ComponentFixture, TestBed } from '@angular/core/testing';
import { jest } from '@jest/globals';
import { LayoutComponent } from './layout';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

describe('LayoutComponent', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [
        {
          provide: Router,
          useValue: { navigate: jest.fn() }
        },
        {
          provide: ActivatedRoute,
          useValue: {}
        },
        {
          provide: AuthService,
          useValue: {
            getUser: jest.fn(() => ({ id: '1', nombre: 'Test', email: 'test@test.com', rol: 'ADMIN' })),
            clearSession: jest.fn()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle profile dropdown on button click', () => {
    const mockEvent = { stopPropagation: () => { } } as unknown as Event;

    component.toggleProfileDropdown(mockEvent);
    expect(component.showProfileDropdown).toBe(true);

    component.toggleProfileDropdown(mockEvent);
    expect(component.showProfileDropdown).toBe(false);
  });

  it('should close profile dropdown only when open', () => {
    component.showProfileDropdown = false;
    component.closeProfileDropdown(); // should not throw, no-op
    expect(component.showProfileDropdown).toBe(false);

    component.showProfileDropdown = true;
    component.closeProfileDropdown();
    expect(component.showProfileDropdown).toBe(false);
  });

  it('should open and close config modal', () => {
    const mockEvent = { stopPropagation: () => { } } as unknown as Event;

    component.openConfigModal(mockEvent);
    expect(component.showConfigModal).toBe(true);
    expect(component.showProfileDropdown).toBe(false);

    component.closeConfigModal();
    expect(component.showConfigModal).toBe(false);

    // Without event
    component.openConfigModal();
    expect(component.showConfigModal).toBe(true);
  });

  it('should open and close delete modal', () => {
    const mockEvent = { stopPropagation: () => { }, preventDefault: () => { } } as unknown as Event;

    component.openDeleteModal(mockEvent);
    expect(component.showDeleteModal).toBe(true);
    expect(component.showConfigModal).toBe(false);

    component.closeDeleteModal();
    expect(component.showDeleteModal).toBe(false);

    // Without event
    component.openDeleteModal();
    expect(component.showDeleteModal).toBe(true);
  });

  it('should confirm delete and close modal', () => {
    component.showDeleteModal = true;
    component.confirmDelete();
    expect(component.showDeleteModal).toBe(false);
  });

  it('should close profile dropdown on document click', () => {
    component.showProfileDropdown = true;
    component.onDocumentClick();
    expect(component.showProfileDropdown).toBe(false);
  });

  it('should navigate to nuevo pedido', () => {
    const router = TestBed.inject(Router);
    const spy = jest.spyOn(router, 'navigate');
    component.navigateToNuevoPedido();
    expect(spy).toHaveBeenCalledWith(['/pedidos'], { queryParams: { new: 'true' } });
  });

  it('should open and close logout modal', () => {
    const mockEvent = { stopPropagation: () => { }, preventDefault: () => { } } as any;
    component.openLogoutModal(mockEvent);
    expect(component.showLogoutModal).toBe(true);
    expect(component.showProfileDropdown).toBe(false);
    
    component.closeLogoutModal();
    expect(component.showLogoutModal).toBe(false);
  });

  it('should confirm logout', () => {
    const authService = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const spyClear = jest.spyOn(authService, 'clearSession');
    const spyNav = jest.spyOn(router, 'navigate');
    
    component.confirmLogout();
    expect(spyClear).toHaveBeenCalled();
    expect(spyNav).toHaveBeenCalledWith(['/login']);
    expect(component.showLogoutModal).toBe(false);
  });
});

