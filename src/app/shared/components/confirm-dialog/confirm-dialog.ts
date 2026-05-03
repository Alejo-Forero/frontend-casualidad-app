import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

export interface ConfirmDialogData {
  title: string;
  message: string;
  highlightText?: string;
  warningText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: string;
  iconStyle?: string;
  accentColor?: 'error' | 'primary' | 'warning';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="overflow-hidden rounded-xl w-full max-w-md">
      <!-- Top accent bar -->
      <div class="h-1.5 w-full"
        [ngClass]="{
          'bg-gradient-to-r from-error to-error-container': data.accentColor === 'error' || !data.accentColor,
          'bg-gradient-to-r from-primary to-primary-container': data.accentColor === 'primary',
          'bg-gradient-to-r from-amber-500 to-amber-400': data.accentColor === 'warning'
        }">
      </div>

      <div class="p-8 text-center bg-surface-container-lowest">
        <!-- Icon -->
        <div class="relative mb-6 flex justify-center">
          <div class="absolute inset-0 rounded-full scale-150 blur-xl opacity-20"
            [ngClass]="{
              'bg-error': data.accentColor === 'error' || !data.accentColor,
              'bg-primary': data.accentColor === 'primary',
              'bg-amber-500': data.accentColor === 'warning'
            }">
          </div>
          <div class="relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
            [ngClass]="{
              'bg-gradient-to-br from-error to-error-container': data.accentColor === 'error' || !data.accentColor,
              'bg-gradient-to-br from-primary to-primary-dim': data.accentColor === 'primary',
              'bg-gradient-to-br from-amber-500 to-amber-400': data.accentColor === 'warning'
            }">
            <span class="material-symbols-outlined text-white text-4xl"
              style="font-variation-settings: 'FILL' 0, 'wght' 600">
              {{ data.icon || 'delete_forever' }}
            </span>
          </div>
        </div>

        <!-- Content -->
        <h2 class="text-2xl font-extrabold text-on-surface tracking-tight mb-3">
          {{ data.title }}
        </h2>
        <p class="text-on-surface-variant text-base leading-relaxed mb-2">
          {{ data.message }}
          @if (data.highlightText) {
            <span class="font-bold"
              [ngClass]="{
                'text-error': data.accentColor === 'error' || !data.accentColor,
                'text-primary': data.accentColor === 'primary'
              }">
              {{ data.highlightText }}
            </span>
          }
        </p>
        @if (data.warningText) {
          <p class="text-on-surface-variant text-sm leading-relaxed">
            {{ data.warningText }}
            <span class="text-error font-bold">no se puede deshacer</span>.
          </p>
        }

        <!-- Actions -->
        <div class="mt-8 flex flex-col gap-3">
          <button (click)="onConfirm()"
            class="group relative flex items-center justify-center gap-2 w-full py-3.5 px-6 font-bold rounded-lg shadow-sm active:scale-[0.98] transition-all text-white"
            [ngClass]="{
              'bg-gradient-to-br from-error to-error-container': data.accentColor === 'error' || !data.accentColor,
              'bg-gradient-to-br from-primary to-primary-dim': data.accentColor === 'primary',
              'bg-gradient-to-br from-amber-500 to-amber-400': data.accentColor === 'warning'
            }">
            <span>{{ data.confirmLabel || 'Confirmar' }}</span>
            <span class="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
              {{ data.icon || 'delete_forever' }}
            </span>
          </button>
          <button (click)="onCancel()"
            class="w-full py-3.5 px-6 bg-surface-container text-on-surface font-bold rounded-lg hover:bg-surface-container-high active:scale-[0.98] transition-all">
            {{ data.cancelLabel || 'Cancelar' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class ConfirmDialogComponent {
  public readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  public readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
