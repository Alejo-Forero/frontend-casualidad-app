import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerfilComponent } from './perfil';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PerfilService } from '../core/services/perfil.service';
import { AuthService } from '../core/services/auth.service';
import { of, throwError } from 'rxjs';
import { jest } from '@jest/globals';

describe('PerfilComponent', () => {
  let component: PerfilComponent;
  let fixture: ComponentFixture<PerfilComponent>;
  let mockPerfilService: jest.Mocked<Partial<PerfilService>>;
  let mockAuthService: jest.Mocked<Partial<AuthService>>;
  let mockRouter: { navigate: jest.Mock };

  beforeEach(async () => {
    mockPerfilService = {
      actualizarPerfil: jest.fn(() => of({}))
    };
    mockAuthService = {
      getUser: jest.fn(() => ({ id: '1', nombre: 'Juan Perez', correo: 'juan@test.com', rol: 'ADMIN' })),
      updateUser: jest.fn()
    };
    mockRouter = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [PerfilComponent, ReactiveFormsModule],
      providers: [
        { provide: PerfilService, useValue: mockPerfilService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PerfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize form with user data', () => {
      expect(component.perfilForm.value).toEqual({
        nombre: 'Juan',
        apellidos: 'Perez',
        telefono: ''
      });
    });

    it('should handle user without space in name', () => {
      (mockAuthService.getUser as jest.Mock).mockReturnValue({ id: '1', nombre: 'Juan', correo: 'juan@test.com', rol: 'ADMIN' });
      component.ngOnInit();
      expect(component.perfilForm.value).toEqual({
        nombre: 'Juan',
        apellidos: '',
        telefono: ''
      });
    });

    it('should handle user with empty nombre', () => {
      (mockAuthService.getUser as jest.Mock).mockReturnValue({ id: '1', nombre: '', correo: 'juan@test.com', rol: 'ADMIN' });
      component.ngOnInit();
      expect(component.perfilForm.value).toEqual({
        nombre: '',
        apellidos: '',
        telefono: ''
      });
    });

    it('should handle null user gracefully', () => {
      (mockAuthService.getUser as jest.Mock).mockReturnValue(null);
      component.perfilForm.reset();
      component.ngOnInit();
      expect(component.perfilForm.value.nombre).toBeNull();
    });
  });

  describe('actualizarPerfil', () => {
    beforeEach(() => {
      component.perfilForm.patchValue({
        nombre: 'Carlos',
        apellidos: 'Lopez',
        telefono: '1234567890'
      });
    });

    it('should not call service if form is invalid', () => {
      component.perfilForm.patchValue({ telefono: '123' }); // Invalid
      component.actualizarPerfil();
      expect(mockPerfilService.actualizarPerfil).not.toHaveBeenCalled();
    });

    it('should call service and update state on success', () => {
      component.actualizarPerfil();
      expect(mockPerfilService.actualizarPerfil).toHaveBeenCalledWith({
        nombre: 'Carlos',
        apellidos: 'Lopez',
        telefono: '1234567890'
      });
      expect(component.successMessage).toBe('Datos de perfil actualizados exitosamente.');
      expect(component.isLoading).toBe(false);
      expect(mockAuthService.updateUser).toHaveBeenCalledWith(expect.objectContaining({
        nombre: 'Carlos Lopez'
      }));
    });

    it('should handle missing user on success without crashing', () => {
      (mockAuthService.getUser as jest.Mock).mockReturnValue(null);
      component.actualizarPerfil();
      expect(component.successMessage).toBe('Datos de perfil actualizados exitosamente.');
    });

    it('should set error on failure', () => {
      (mockPerfilService.actualizarPerfil as jest.Mock).mockReturnValue(throwError(() => ({ error: { message: 'Database error' } })));
      component.actualizarPerfil();
      expect(component.errorMessage).toBe('Database error');
      expect(component.isLoading).toBe(false);
    });

    it('should set fallback error on failure', () => {
      (mockPerfilService.actualizarPerfil as jest.Mock).mockReturnValue(throwError(() => ({})));
      component.actualizarPerfil();
      expect(component.errorMessage).toBe('Error al actualizar el perfil.');
    });
  });

  describe('navigation', () => {
    it('should navigate home on goBack', () => {
      component.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });
  });

  describe('getters', () => {
    it('should return controls', () => {
      expect(component.nombreControl).toBeTruthy();
      expect(component.apellidosControl).toBeTruthy();
      expect(component.telefonoControl).toBeTruthy();
    });
  });
});
