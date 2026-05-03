import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

export interface SuccessDialogData {
  title: string;
  message: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  icon?: string;
  accentColor?: 'primary' | 'success' | 'warning';
  /** Optional detail block (e.g. tracking code) */
  detailLabel?: string;
  detailValue?: string;
}

export interface SuccessDialogResult {
  action: 'primary' | 'secondary' | 'close';
}

@Component({
  selector: 'app-success-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="overflow-hidden rounded-xl w-full max-w-lg">
      <!-- Top accent bar -->
      <div class="h-1.5 w-full"
        [ngClass]="{
          'bg-gradient-to-r from-primary to-primary-container': data.accentColor === 'primary' || !data.accentColor,
          'bg-gradient-to-r from-emerald-500 to-emerald-400': data.accentColor === 'success',
          'bg-gradient-to-r from-amber-500 to-amber-400': data.accentColor === 'warning'
        }">
      </div>

      <div class="p-10 text-center bg-surface-container-lowest">
        <!-- Icon -->
        <div class="relative mb-8 flex justify-center">
          <div class="absolute inset-0 rounded-full scale-150 blur-xl opacity-20"
            [ngClass]="{
              'bg-primary': data.accentColor === 'primary' || !data.accentColor,
              'bg-emerald-500': data.accentColor === 'success',
              'bg-amber-500': data.accentColor === 'warning'
            }">
          </div>
          <div class="relative w-24 h-24 rounded-full flex items-center justify-center shadow-lg"
            [ngClass]="{
              'bg-gradient-to-br from-primary to-primary-container': data.accentColor === 'primary' || !data.accentColor,
              'bg-gradient-to-br from-emerald-500 to-emerald-400': data.accentColor === 'success',
              'bg-gradient-to-br from-amber-500 to-amber-400': data.accentColor === 'warning'
            }">
            <span class="material-symbols-outlined text-white text-5xl"
              style="font-variation-settings: 'FILL' 1, 'wght' 600">
              {{ data.icon || 'check_circle' }}
            </span>
          </div>
        </div>

        <!-- Content -->
        <h2 class="text-3xl font-extrabold text-on-surface tracking-tight mb-4">
          {{ data.title }}
        </h2>
        <p class="text-on-surface-variant text-lg leading-relaxed px-4">
          {{ data.message }}
        </p>

        <!-- Optional detail block (e.g. tracking code) -->
        @if (data.detailLabel && data.detailValue) {
          <div class="mt-6 bg-primary/5 rounded-lg p-4 text-left">
            <p class="text-xs font-bold uppercase tracking-wider text-primary mb-1">{{ data.detailLabel }}</p>
            <p class="text-xl font-extrabold text-primary-dim">{{ data.detailValue }}</p>
          </div>
        }

        <!-- Actions -->
        <div class="mt-10 flex flex-col gap-3">
          @if (data.primaryActionLabel) {
            <button (click)="onPrimary()"
              class="group relative flex items-center justify-center gap-2 w-full py-4 px-6 font-bold rounded-lg shadow-sm active:scale-[0.98] transition-all overflow-hidden text-white"
              [ngClass]="{
                'bg-gradient-to-br from-primary to-primary-container': data.accentColor === 'primary' || !data.accentColor,
                'bg-gradient-to-br from-emerald-500 to-emerald-400': data.accentColor === 'success',
                'bg-gradient-to-br from-amber-500 to-amber-400': data.accentColor === 'warning'
              }">
              <span class="relative z-10">{{ data.primaryActionLabel }}</span>
              <span class="material-symbols-outlined relative z-10 text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          }
          @if (data.secondaryActionLabel) {
            <button (click)="onSecondary()"
              class="w-full py-4 px-6 bg-secondary-container/30 text-on-secondary-container font-bold rounded-lg hover:bg-secondary-container/50 active:scale-[0.98] transition-all">
              {{ data.secondaryActionLabel }}
            </button>
          }
          <button (click)="onClose()"
            class="mt-2 text-stone-400 hover:text-primary transition-colors text-sm font-medium tracking-wide">
            Cerrar ventana
          </button>
        </div>
      </div>
    </div>
  `
})
export class SuccessDialogComponent {
  public readonly dialogRef = inject(MatDialogRef<SuccessDialogComponent>);
  public readonly data = inject<SuccessDialogData>(MAT_DIALOG_DATA);

  onPrimary(): void {
    this.dialogRef.close({ action: 'primary' } as SuccessDialogResult);
  }

  onSecondary(): void {
    this.dialogRef.close({ action: 'secondary' } as SuccessDialogResult);
  }

  onClose(): void {
    this.dialogRef.close({ action: 'close' } as SuccessDialogResult);
  }
}
