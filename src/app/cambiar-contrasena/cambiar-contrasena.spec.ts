import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CambiarContrasenaComponent } from './cambiar-contrasena';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PerfilService } from '../core/services/perfil.service';
import { of, throwError } from 'rxjs';
import { jest } from '@jest/globals';

describe('CambiarContrasenaComponent', () => {
  let component: CambiarContrasenaComponent;
  let fixture: ComponentFixture<CambiarContrasenaComponent>;
  let mockPerfilService: jest.Mocked<Partial<PerfilService>>;
  let mockRouter: { navigate: jest.Mock };

  beforeEach(async () => {
    mockPerfilService = {
      solicitarCodigoPassword: jest.fn(() => of({})),
      cambiarPassword: jest.fn(() => of({}))
    };
    mockRouter = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [CambiarContrasenaComponent, ReactiveFormsModule],
      providers: [
        { provide: PerfilService, useValue: mockPerfilService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CambiarContrasenaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have invalid form initially', () => {
    expect(component.passwordForm.invalid).toBe(true);
  });

  describe('solicitarCodigo', () => {
    it('should set state correctly on success', () => {
      component.solicitarCodigo();
      expect(component.isLoading).toBe(false);
      expect(component.codeSent).toBe(true);
      expect(component.step).toBe(2);
      expect(component.successMessage).toBe('Código enviado a tu correo electrónico.');
      expect(mockPerfilService.solicitarCodigoPassword).toHaveBeenCalled();
    });

    it('should handle error', () => {
      (mockPerfilService.solicitarCodigoPassword as jest.Mock).mockReturnValue(throwError(() => ({ error: { message: 'Error' } })));
      component.solicitarCodigo();
      expect(component.isLoading).toBe(false);
      expect(component.errorMessage).toBe('Error');
    });

    it('should handle error fallback', () => {
      (mockPerfilService.solicitarCodigoPassword as jest.Mock).mockReturnValue(throwError(() => ({})));
      component.solicitarCodigo();
      expect(component.errorMessage).toBe('Error al enviar el código. Intenta nuevamente.');
    });
  });

  describe('cambiarPassword', () => {
    beforeEach(() => {
      component.passwordForm.patchValue({
        codigo: '123456',
        nuevaPassword: 'Password1!',
        confirmarPassword: 'Password1!'
      });
    });

    it('should not submit if form is invalid', () => {
      component.passwordForm.patchValue({ codigo: '123' }); // Invalid
      component.cambiarPassword();
      expect(mockPerfilService.cambiarPassword).not.toHaveBeenCalled();
    });

    it('should not submit if passwords do not match', () => {
      component.passwordForm.patchValue({ confirmarPassword: 'Password2!' });
      component.cambiarPassword();
      expect(component.errorMessage).toBe('Las contraseñas no coinciden.');
      expect(mockPerfilService.cambiarPassword).not.toHaveBeenCalled();
    });

    it('should set showSuccessModal to true on success', () => {
      component.cambiarPassword();
      expect(mockPerfilService.cambiarPassword).toHaveBeenCalledWith({ codigo: '123456', nuevaPassword: 'Password1!' });
      expect(component.showSuccessModal).toBe(true);
      expect(component.isLoading).toBe(false);
    });

    it('should set error message on failure', () => {
      (mockPerfilService.cambiarPassword as jest.Mock).mockReturnValue(throwError(() => ({ error: { message: 'Invalid code' } })));
      component.cambiarPassword();
      expect(component.errorMessage).toBe('Invalid code');
      expect(component.isLoading).toBe(false);
    });

    it('should use fallback error message on failure', () => {
      (mockPerfilService.cambiarPassword as jest.Mock).mockReturnValue(throwError(() => ({})));
      component.cambiarPassword();
      expect(component.errorMessage).toBe('Código incorrecto o error al cambiar la contraseña.');
    });
  });

  describe('modals and navigation', () => {
    it('should navigate home on goBack', () => {
      component.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should navigate home and close modal on closeSuccessAndGoBack', () => {
      component.showSuccessModal = true;
      component.closeSuccessAndGoBack();
      expect(component.showSuccessModal).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should toggle help modal', () => {
      expect(component.showHelpModal).toBe(false);
      component.toggleHelpModal();
      expect(component.showHelpModal).toBe(true);
      component.toggleHelpModal();
      expect(component.showHelpModal).toBe(false);
    });
  });

  describe('getters', () => {
    it('should return controls', () => {
      expect(component.codigoControl).toBeTruthy();
      expect(component.nuevaPasswordControl).toBeTruthy();
      expect(component.confirmarPasswordControl).toBeTruthy();
    });
  });
});
