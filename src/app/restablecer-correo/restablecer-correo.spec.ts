import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RestablecerCorreoComponent } from './restablecer-correo';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PerfilService } from '../core/services/perfil.service';
import { of, throwError } from 'rxjs';
import { jest } from '@jest/globals';

describe('RestablecerCorreoComponent', () => {
  let component: RestablecerCorreoComponent;
  let fixture: ComponentFixture<RestablecerCorreoComponent>;
  let mockPerfilService: jest.Mocked<Partial<PerfilService>>;
  let mockRouter: { navigate: jest.Mock };

  beforeEach(async () => {
    mockPerfilService = {
      solicitarCodigoCorreoActual: jest.fn(() => of({})),
      validarActualYSolicitarNuevo: jest.fn(() => of({})),
      confirmarCambioCorreo: jest.fn(() => of({}))
    };
    mockRouter = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [RestablecerCorreoComponent, ReactiveFormsModule],
      providers: [
        { provide: PerfilService, useValue: mockPerfilService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RestablecerCorreoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('solicitarCodigoActual', () => {
    it('should set state on success', () => {
      component.solicitarCodigoActual();
      expect(mockPerfilService.solicitarCodigoCorreoActual).toHaveBeenCalled();
      expect(component.step).toBe(2);
      expect(component.isLoading).toBe(false);
    });

    it('should set error on failure', () => {
      (mockPerfilService.solicitarCodigoCorreoActual as jest.Mock).mockReturnValue(throwError(() => ({ error: { message: 'Network Error' } })));
      component.solicitarCodigoActual();
      expect(component.errorMessage).toBe('Network Error');
      expect(component.isLoading).toBe(false);
    });

    it('should use fallback error message on failure', () => {
      (mockPerfilService.solicitarCodigoCorreoActual as jest.Mock).mockReturnValue(throwError(() => ({})));
      component.solicitarCodigoActual();
      expect(component.errorMessage).toBe('Error al enviar el código. Intenta nuevamente.');
    });
  });

  describe('validarActualYSolicitarNuevo', () => {
    it('should move to step 3 if step is 2 and form is valid', () => {
      component.step = 2;
      component.step2Form.patchValue({ codigo: '123456' });
      component.validarActualYSolicitarNuevo();
      expect(component.step).toBe(3);
    });

    it('should not move to step 3 if step is 2 and form is invalid', () => {
      component.step = 2;
      component.step2Form.patchValue({ codigo: '123' }); // invalid
      component.validarActualYSolicitarNuevo();
      expect(component.step).toBe(2);
    });

    it('should call service if step is 3 and forms are valid', () => {
      component.step = 3;
      component.step2Form.patchValue({ codigo: '123456' });
      component.step3Form.patchValue({ nuevoCorreo: 'test@test.com' });
      component.validarActualYSolicitarNuevo();
      
      expect(mockPerfilService.validarActualYSolicitarNuevo).toHaveBeenCalledWith({ codigoActual: '123456', nuevoCorreo: 'test@test.com' });
      expect(component.step).toBe(4);
      expect(component.nuevoCorreoState).toBe('test@test.com');
      expect(component.isLoading).toBe(false);
    });

    it('should not proceed if form is invalid in step 3', () => {
      component.step = 3;
      component.step2Form.patchValue({ codigo: '123456' });
      component.step3Form.patchValue({ nuevoCorreo: 'invalid' });
      component.validarActualYSolicitarNuevo();
      expect(mockPerfilService.validarActualYSolicitarNuevo).not.toHaveBeenCalled();
    });

    it('should not proceed if step2 form is invalid in step 3', () => {
      component.step = 3;
      component.step2Form.patchValue({ codigo: '123' }); // invalid
      component.step3Form.patchValue({ nuevoCorreo: 'test@test.com' });
      component.validarActualYSolicitarNuevo();
      expect(mockPerfilService.validarActualYSolicitarNuevo).not.toHaveBeenCalled();
    });

    it('should do nothing if step is not 2 or 3', () => {
      component.step = 1;
      component.validarActualYSolicitarNuevo();
      expect(component.step).toBe(1);
      expect(mockPerfilService.validarActualYSolicitarNuevo).not.toHaveBeenCalled();
    });

    it('should set error on failure in step 3', () => {
      component.step = 3;
      component.step2Form.patchValue({ codigo: '123456' });
      component.step3Form.patchValue({ nuevoCorreo: 'test@test.com' });
      (mockPerfilService.validarActualYSolicitarNuevo as jest.Mock).mockReturnValue(throwError(() => ({ error: { message: 'Invalid code' } })));
      
      component.validarActualYSolicitarNuevo();
      expect(component.errorMessage).toBe('Invalid code');
      expect(component.isLoading).toBe(false);
    });

    it('should set fallback error on failure in step 3', () => {
      component.step = 3;
      component.step2Form.patchValue({ codigo: '123456' });
      component.step3Form.patchValue({ nuevoCorreo: 'test@test.com' });
      (mockPerfilService.validarActualYSolicitarNuevo as jest.Mock).mockReturnValue(throwError(() => ({})));
      
      component.validarActualYSolicitarNuevo();
      expect(component.errorMessage).toBe('Código incorrecto o correo inválido.');
    });
  });

  describe('confirmarNuevoCorreo', () => {
    it('should not call service if step4Form is invalid', () => {
      component.step4Form.patchValue({ codigoNuevo: '123' });
      component.confirmarNuevoCorreo();
      expect(mockPerfilService.confirmarCambioCorreo).not.toHaveBeenCalled();
    });

    it('should call service and update state on success', () => {
      component.step4Form.patchValue({ codigoNuevo: '123456' });
      component.confirmarNuevoCorreo();
      
      expect(mockPerfilService.confirmarCambioCorreo).toHaveBeenCalledWith({ codigoNuevo: '123456' });
      expect(component.showSuccessModal).toBe(true);
      expect(component.isLoading).toBe(false);
    });

    it('should set error on failure', () => {
      component.step4Form.patchValue({ codigoNuevo: '123456' });
      (mockPerfilService.confirmarCambioCorreo as jest.Mock).mockReturnValue(throwError(() => ({ error: { message: 'Wrong code' } })));
      
      component.confirmarNuevoCorreo();
      expect(component.errorMessage).toBe('Wrong code');
      expect(component.isLoading).toBe(false);
    });

    it('should set fallback error on failure', () => {
      component.step4Form.patchValue({ codigoNuevo: '123456' });
      (mockPerfilService.confirmarCambioCorreo as jest.Mock).mockReturnValue(throwError(() => ({})));
      
      component.confirmarNuevoCorreo();
      expect(component.errorMessage).toBe('Código incorrecto.');
    });
  });

  describe('navigation', () => {
    it('should close modal and navigate to home on closeSuccessAndGoBack', () => {
      component.showSuccessModal = true;
      component.closeSuccessAndGoBack();
      expect(component.showSuccessModal).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should go back a step if step > 1 on goBack', () => {
      component.step = 3;
      component.errorMessage = 'error';
      component.goBack();
      expect(component.step).toBe(2);
      expect(component.errorMessage).toBe('');
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should navigate to home if step === 1 on goBack', () => {
      component.step = 1;
      component.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });
  });

  describe('getters', () => {
    it('should return form controls', () => {
      expect(component.codigoActualControl).toBeTruthy();
      expect(component.nuevoCorreoControl).toBeTruthy();
      expect(component.codigoNuevoControl).toBeTruthy();
    });
  });
});
