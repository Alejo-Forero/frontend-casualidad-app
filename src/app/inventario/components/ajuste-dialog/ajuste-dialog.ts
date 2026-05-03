import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ProductDTO } from '../../../core/models/inventory.dto';

@Component({
  selector: 'app-ajuste-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  template: `
    <div class="relative bg-surface-container-lowest w-full rounded-xl overflow-hidden flex flex-col">
        <div class="h-2 w-full bg-gradient-to-r from-secondary to-secondary-container"></div>
        <div class="p-8">
            <div class="flex justify-between items-start mb-6">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 bg-secondary/10 rounded-xl flex items-center justify-center">
                        <span class="material-symbols-outlined text-3xl text-secondary">tune</span>
                    </div>
                    <div>
                        <h2 class="text-xl font-extrabold text-on-surface tracking-tight">Ajustar Inventario</h2>
                        <p class="text-sm text-on-surface-variant font-medium">{{ data.product.name }} — Stock actual: <strong>{{ data.product.stock }}</strong></p>
                    </div>
                </div>
                <button mat-dialog-close class="text-on-surface-variant hover:text-on-surface transition-colors p-2 hover:bg-surface-container rounded-full">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            
            <form [formGroup]="ajusteForm" (ngSubmit)="submit()" class="space-y-5">
                <div class="space-y-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-stone-500">Nueva cantidad (stock real) *</label>
                    <input formControlName="cantidadNueva" type="number" step="0.001" min="0"
                        class="w-full bg-surface-container border-none rounded-lg p-4 focus:ring-2 focus:ring-secondary/40 transition-all font-body"
                        placeholder="Ej: 25" />
                </div>
                <div class="space-y-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-stone-500">Motivo del ajuste * <span class="text-stone-400 font-normal">(mín. 10 caracteres)</span></label>
                    <textarea formControlName="motivo" rows="3"
                        class="w-full bg-surface-container border-none rounded-lg p-4 focus:ring-2 focus:ring-secondary/40 transition-all font-body resize-none"
                        placeholder="Ej: Conteo físico realizado el dd/mm/aaaa. Se corrige diferencia de inventario."></textarea>
                    @if (ajusteForm.get('motivo')?.invalid && ajusteForm.get('motivo')?.touched) {
                    <p class="text-error text-xs font-medium">El motivo debe tener entre 10 y 255 caracteres.</p>
                    }
                </div>
                <div class="flex gap-3 pt-2">
                    <button type="button" mat-dialog-close
                        class="flex-1 py-3 rounded-lg font-bold text-stone-500 hover:bg-stone-50 transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" [disabled]="!ajusteForm.valid"
                        class="flex-1 py-3 rounded-lg font-bold bg-secondary text-on-secondary hover:bg-secondary-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        Confirmar Ajuste
                    </button>
                </div>
            </form>
        </div>
    </div>
  `
})
export class AjusteDialogComponent implements OnInit {
  data = inject(MAT_DIALOG_DATA) as { product: ProductDTO };
  dialogRef = inject(MatDialogRef<AjusteDialogComponent>);
  private readonly fb = inject(FormBuilder);

  ajusteForm: FormGroup;

  constructor() {
    this.ajusteForm = this.fb.group({
      idProducto: [null, Validators.required],
      cantidadNueva: [0, [Validators.required, Validators.min(0)]],
      motivo: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(255)]]
    });
  }

  ngOnInit() {
    this.ajusteForm.patchValue({
      idProducto: Number(this.data.product.idProducto || this.data.product.id),
      cantidadNueva: this.data.product.stock,
      motivo: ''
    });
  }

  submit() {
    if (this.ajusteForm.valid) {
      this.dialogRef.close(this.ajusteForm.value);
    }
  }
}
