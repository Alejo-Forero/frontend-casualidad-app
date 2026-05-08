import { Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-logout-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="overflow-hidden rounded-xl w-full">
      <div class="h-1.5 w-full bg-gradient-to-r from-primary to-primary-container"></div>
      <div class="p-8 text-center bg-surface-container-lowest">
        <!-- Icon -->
        <div class="relative mb-6 flex justify-center">
          <div class="absolute inset-0 bg-primary/10 rounded-full scale-150 blur-xl"></div>
          <div class="relative w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg">
            <span class="material-symbols-outlined text-white text-4xl">logout</span>
          </div>
        </div>
        <!-- Content -->
        <h2 class="text-2xl font-extrabold text-on-surface tracking-tight mb-3 font-headline">
          ¿Cerrar sesión?
        </h2>
        <p class="text-on-surface-variant text-base leading-relaxed font-body">
          ¿Estás seguro de que deseas salir de la plataforma?
          Deberás ingresar tus credenciales nuevamente para acceder.
        </p>
        <!-- Actions -->
        <div class="mt-8 flex flex-col gap-3">
          <button
            (click)="onConfirm()"
            class="flex items-center justify-center gap-2 w-full py-3.5 px-6
                   bg-gradient-to-br from-[#974300] to-[#fd8e4a] text-white
                   font-bold rounded-lg shadow-sm hover:opacity-90
                   active:scale-[0.98] transition-all">
            <span>Sí, cerrar sesión</span>
            <span class="material-symbols-outlined text-xl">logout</span>
          </button>
          <button
            (click)="onCancel()"
            class="w-full py-3.5 px-6 bg-surface-container text-on-surface
                   font-bold rounded-lg hover:bg-surface-container-high
                   active:scale-[0.98] transition-all">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class LogoutDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<LogoutDialogComponent>);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  onConfirm(): void {
    this.authService.clearSession();
    this.dialogRef.close(true);
    this.router.navigate(['/login']);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
