import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './forgot-password-dialog.component.html',
})
export class ForgotPasswordDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly dialogRef = inject(MatDialogRef<ForgotPasswordDialogComponent>);
  private readonly cdr = inject(ChangeDetectorRef);

  step: 1 | 2 | 3 = 1;
  isLoading = false;
  errorMessage = '';

  // Formulario Paso 1: Correo
  emailForm: FormGroup = this.fb.group({
    correo: ['', [Validators.required, Validators.email]]
  });

  // Formulario Paso 2: Código y Nueva Contraseña
  resetForm: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
    nuevaPassword: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern('^(?=.*[0-9])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,}$')
    ]],
    confirmarPassword: ['', [Validators.required]]
  });

  get correoControl() { return this.emailForm.get('correo'); }
  get codigoControl() { return this.resetForm.get('codigo'); }
  get nuevaPasswordControl() { return this.resetForm.get('nuevaPassword'); }
  get confirmarPasswordControl() { return this.resetForm.get('confirmarPassword'); }

  get passwordsMatch(): boolean {
    return this.resetForm.value.nuevaPassword === this.resetForm.value.confirmarPassword;
  }

  solicitarRecuperacion(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.recuperarPassword(this.emailForm.value.correo).subscribe({
      next: () => {
        this.step = 2;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        // El backend responde exitoso incluso si no existe por seguridad en este endpoint
        this.step = 2;
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  confirmarReset(): void {
    if (this.resetForm.invalid || !this.passwordsMatch) {
      this.resetForm.markAllAsTouched();
      if (!this.passwordsMatch) this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const payload = {
      correo: this.emailForm.value.correo,
      codigo: this.resetForm.value.codigo,
      nuevaPassword: this.resetForm.value.nuevaPassword
    };

    this.authService.resetPasswordPublic(payload).subscribe({
      next: () => {
        this.step = 3;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Código incorrecto o error al cambiar la contraseña.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
