import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PerfilService } from '../core/services/perfil.service';

@Component({
  selector: 'app-restablecer-correo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './restablecer-correo.html',
  styleUrls: ['./restablecer-correo.css']
})
export class RestablecerCorreoComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly perfilService = inject(PerfilService);
  private readonly cdr = inject(ChangeDetectorRef);

  // 1: Solicitar código a correo actual, 2: Verificar actual, 3: Establecer nuevo, 4: Verificar nuevo
  step: 1 | 2 | 3 | 4 = 1;
  isLoading = false;
  errorMessage = '';
  showSuccessModal = false;

  nuevoCorreoState = ''; // To temporarily hold the new email between steps 3 and 4

  step1Form: FormGroup = this.fb.group({});
  step2Form: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]]
  });
  step3Form: FormGroup = this.fb.group({
    nuevoCorreo: ['', [Validators.required, Validators.email]]
  });
  step4Form: FormGroup = this.fb.group({
    codigoNuevo: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]]
  });

  get codigoActualControl() { return this.step2Form.get('codigo'); }
  get nuevoCorreoControl() { return this.step3Form.get('nuevoCorreo'); }
  get codigoNuevoControl() { return this.step4Form.get('codigoNuevo'); }

  solicitarCodigoActual(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.perfilService.solicitarCodigoCorreoActual().subscribe({
      next: () => {
        this.step = 2;
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

  validarActualYSolicitarNuevo(): void {
    if (this.step === 2) {
      if (this.step2Form.invalid) return;
      // Just moving UI locally, the backend endpoint requires both codigoActual and nuevoCorreo.
      this.step = 3;
      this.cdr.detectChanges();
      return;
    }

    if (this.step === 3) {
      if (this.step2Form.invalid || this.step3Form.invalid) return;

      this.isLoading = true;
      this.errorMessage = '';
      const codigoActual = this.step2Form.value.codigo;
      const nuevoCorreo = this.step3Form.value.nuevoCorreo;

      this.perfilService.validarActualYSolicitarNuevo({ codigoActual, nuevoCorreo }).subscribe({
        next: () => {
          this.nuevoCorreoState = nuevoCorreo;
          this.step = 4;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Código incorrecto o correo inválido.';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  confirmarNuevoCorreo(): void {
    if (this.step4Form.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';
    const codigoNuevo = this.step4Form.value.codigoNuevo;

    this.perfilService.confirmarCambioCorreo({ codigoNuevo }).subscribe({
      next: () => {
        this.showSuccessModal = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Código incorrecto.';
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
    if (this.step > 1) {
      this.step--;
      this.errorMessage = '';
      this.cdr.detectChanges();
    } else {
      this.router.navigate(['/home']);
    }
  }
}
