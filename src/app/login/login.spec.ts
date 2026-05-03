import { AuthService } from '../core/services/auth.service';
import { of, throwError } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { jest } from '@jest/globals';
import { LoginComponent } from './login';
import { Router } from '@angular/router';

const mockAuthService = {
  login: () => of({ accessToken: 'tok', refreshToken: 'ref', usuario: { id: '1', nombre: 'A', correo: 'a@b.com', rol: 'ADMIN' } }),
  setSession: () => {},
  getAccessToken: () => null,
  isAuthenticated: () => false,
  clearSession: () => {},
  getUser: () => null,
  getRefreshToken: () => null
};

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let routerSpy: { navigate: ReturnType<typeof jest.fn> };

  beforeEach(async () => {
    routerSpy = { navigate: jest.fn() };
    jest.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate on successful login', () => {
    component.loginForm.controls['email'].setValue('admin@casualidad.com');
    component.loginForm.controls['password'].setValue('admin123');

    component.onSubmit();

    // Because mock is synchronous, isLoading is false after subscribe completes
    expect(component.isLoading).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should show error modal on failed login', () => {
    const authSvc = TestBed.inject(AuthService);
    jest.spyOn(authSvc, 'login').mockReturnValue(throwError(() => new Error('Unauthorized')));

    component.loginForm.controls['email'].setValue('bad@bad.com');
    component.loginForm.controls['password'].setValue('wrongpass');

    component.onSubmit();

    expect(component.showErrorModal).toBe(true);
    expect(component.isLoading).toBe(false);

    component.closeErrorModal();
    expect(component.showErrorModal).toBe(false);
  });

  it('should mark form as touched when invalid', () => {
    // Empty form is invalid
    component.onSubmit();
    expect(component.loginForm.touched).toBe(true);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should toggle help modal', () => {
    expect(component.showHelpModal).toBe(false);
    component.toggleHelpModal();
    expect(component.showHelpModal).toBe(true);
    component.toggleHelpModal();
    expect(component.showHelpModal).toBe(false);
  });

  it('should expose email and password getters', () => {
    expect(component.emailControl).toBeTruthy();
    expect(component.passwordControl).toBeTruthy();
  });
});

