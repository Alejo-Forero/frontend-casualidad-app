import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ForgotPasswordDialogComponent } from './forgot-password-dialog.component';
import { AuthService } from '../../../core/services/auth.service';

describe('ForgotPasswordDialogComponent', () => {
  let component: ForgotPasswordDialogComponent;
  let fixture: ComponentFixture<ForgotPasswordDialogComponent>;
  let mockAuthService: any;
  let mockDialogRef: any;

  beforeEach(async () => {
    mockAuthService = {
      recuperarPassword: jest.fn(() => of('Success')),
      resetPasswordPublic: jest.fn(() => of('Success'))
    };

    mockDialogRef = {
      close: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [
        ForgotPasswordDialogComponent,
        ReactiveFormsModule,
        MatDialogModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: MatDialogRef, useValue: mockDialogRef }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start at step 1', () => {
    expect(component.step).toBe(1);
  });

  it('should handle step 1 recovery request', () => {
    component.emailForm.controls['correo'].setValue('test@example.com');
    component.solicitarRecuperacion();
    
    expect(mockAuthService.recuperarPassword).toHaveBeenCalledWith('test@example.com');
    expect(component.step).toBe(2);
    expect(component.isLoading).toBe(false);
  });

  it('should handle step 1 error (should still go to step 2 for security)', () => {
    (mockAuthService.recuperarPassword as jest.Mock).mockReturnValue(throwError(() => new Error('Error')));
    component.emailForm.controls['correo'].setValue('test@example.com');
    component.solicitarRecuperacion();
    
    expect(component.step).toBe(2);
    expect(component.isLoading).toBe(false);
  });

  it('should validate passwords match in step 2', () => {
    component.step = 2;
    component.resetForm.patchValue({
      codigo: '123456',
      nuevaPassword: 'Password1!',
      confirmarPassword: 'Password2!'
    });
    
    component.confirmarReset();
    expect(component.errorMessage).toBe('Las contraseñas no coinciden.');
    expect(mockAuthService.resetPasswordPublic).not.toHaveBeenCalled();
  });

  it('should handle step 2 reset confirmation success', () => {
    component.step = 2;
    component.emailForm.controls['correo'].setValue('test@example.com');
    component.resetForm.patchValue({
      codigo: '123456',
      nuevaPassword: 'Password1!',
      confirmarPassword: 'Password1!'
    });
    
    component.confirmarReset();
    expect(mockAuthService.resetPasswordPublic).toHaveBeenCalled();
    expect(component.step).toBe(3);
    expect(component.isLoading).toBe(false);
  });

  it('should handle step 2 reset confirmation error', () => {
    const errorMsg = 'Invalid code';
    (mockAuthService.resetPasswordPublic as jest.Mock).mockReturnValue(throwError(() => ({ error: { message: errorMsg } })));
    
    component.step = 2;
    component.emailForm.controls['correo'].setValue('test@example.com');
    component.resetForm.patchValue({
      codigo: '123456',
      nuevaPassword: 'Password1!',
      confirmarPassword: 'Password1!'
    });
    
    component.confirmarReset();
    expect(component.errorMessage).toBe(errorMsg);
    expect(component.step).toBe(2);
  });

  it('should close dialog', () => {
    component.close();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should return form controls via getters', () => {
    expect(component.correoControl).toBeTruthy();
    expect(component.codigoControl).toBeTruthy();
    expect(component.nuevaPasswordControl).toBeTruthy();
    expect(component.confirmarPasswordControl).toBeTruthy();
  });

  it('should mark emailForm as touched if invalid on solicitarRecuperacion', () => {
    component.emailForm.controls['correo'].setValue(''); // Invalid
    component.solicitarRecuperacion();
    expect(component.emailForm.controls['correo'].touched).toBe(true);
  });
});
