import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PerfilService } from '../core/services/perfil.service';

@Component({
  selector: 'app-cambiar-contrasena',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cambiar-contrasena.html',
  styleUrls: ['./cambiar-contrasena.css']
})
export class CambiarContrasenaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly perfilService = inject(PerfilService);
  private readonly cdr = inject(ChangeDetectorRef);

  step: 1 | 2 = 1;
  isLoading = false;
  codeSent = false;
  errorMessage = '';
  successMessage = '';
  showSuccessModal = false;
  showHelpModal = false;

  passwordForm: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
    nuevaPassword: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern('^(?=.*[0-9])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,}$')
    ]],
    confirmarPassword: ['', [Validators.required]]
  });

  get codigoControl() { return this.passwordForm.get('codigo'); }
  get nuevaPasswordControl() { return this.passwordForm.get('nuevaPassword'); }
  get confirmarPasswordControl() { return this.passwordForm.get('confirmarPassword'); }

  get passwordsMatch(): boolean {
    return this.passwordForm.value.nuevaPassword === this.passwordForm.value.confirmarPassword;
  }

  solicitarCodigo(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.perfilService.solicitarCodigoPassword().subscribe({
      next: () => {
        this.codeSent = true;
        this.step = 2;
        this.successMessage = 'Código enviado a tu correo electrónico.';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al enviar el código. Intenta nuevamente.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  cambiarPassword(): void {
    if (this.passwordForm.invalid || !this.passwordsMatch) {
      this.passwordForm.markAllAsTouched();
      if (!this.passwordsMatch) {
        this.errorMessage = 'Las contraseñas no coinciden.';
      }
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { codigo, nuevaPassword } = this.passwordForm.value;
    this.perfilService.cambiarPassword({ codigo, nuevaPassword }).subscribe({
      next: () => {
        this.showSuccessModal = true;
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

  closeSuccessAndGoBack(): void {
    this.showSuccessModal = false;
    this.router.navigate(['/home']);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  toggleHelpModal(): void {
    this.showHelpModal = !this.showHelpModal;
  }
}
