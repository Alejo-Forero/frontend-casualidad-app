import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ProductDTO } from '../../../core/models/inventory.dto';

@Component({
  selector: 'app-salida-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  template: `
    <div class="relative bg-surface-container-lowest w-full rounded-xl overflow-hidden flex flex-col">
        <div class="h-2 w-full bg-gradient-to-r from-error to-error-container"></div>
        <div class="p-8">
            <div class="flex justify-between items-start mb-6">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 bg-error/10 rounded-xl flex items-center justify-center">
                        <span class="material-symbols-outlined text-3xl text-error">remove_circle</span>
                    </div>
                    <div>
                        <h2 class="text-xl font-extrabold text-on-surface tracking-tight">Salida de Stock</h2>
                        <p class="text-sm text-on-surface-variant font-medium">{{ data.product.nombre }} — Stock actual: <strong>{{ data.product.cantidadDisponible }}</strong></p>
                    </div>
                </div>
                <button mat-dialog-close class="text-on-surface-variant hover:text-on-surface transition-colors p-2 hover:bg-surface-container rounded-full">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <form [formGroup]="salidaForm" (ngSubmit)="submit()" class="space-y-5">
                <div class="space-y-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-stone-500">Cantidad a descontar *</label>
                    <input formControlName="cantidad" type="number" step="0.001" min="0.001"
                        class="w-full bg-surface-container border-none rounded-lg p-4 focus:ring-2 focus:ring-error/40 transition-all font-body"
                        placeholder="Ej: 10" />
                    @if (salidaForm.get('cantidad')?.errors?.['exceedsStock'] && salidaForm.get('cantidad')?.touched) {
                    <p class="text-error text-xs font-medium">La cantidad supera el stock disponible ({{ data.product.cantidadDisponible }}).</p>
                    }
                </div>
                <div class="space-y-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-stone-500">Motivo *</label>
                    <select formControlName="motivo" class="w-full bg-surface-container border-none rounded-lg p-4 focus:ring-2 focus:ring-error/40 transition-all font-body appearance-none font-bold text-on-surface">
                        @for (m of motivos; track m.value) {
                            <option [value]="m.value">{{ m.label }}</option>
                        }
                    </select>
                </div>
                <div class="space-y-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-stone-500">Comentario <span class="text-stone-400 font-normal">(opcional)</span></label>
                    <textarea formControlName="comentario" rows="2"
                        class="w-full bg-surface-container border-none rounded-lg p-4 focus:ring-2 focus:ring-error/40 transition-all font-body resize-none"
                        placeholder="Detalle adicional..."></textarea>
                </div>
                <div class="flex gap-3 pt-2">
                    <button type="button" mat-dialog-close
                        class="flex-1 py-3 rounded-lg font-bold text-stone-500 hover:bg-stone-50 transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" [disabled]="!salidaForm.valid"
                        class="flex-1 py-3 rounded-lg font-bold bg-error text-on-error hover:bg-error/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                        Registrar Salida
                    </button>
                </div>
            </form>
        </div>
    </div>
  `
})
export class SalidaDialogComponent implements OnInit {
  data = inject(MAT_DIALOG_DATA) as { product: ProductDTO; motivos: {value: string, label: string}[] };
  dialogRef = inject(MatDialogRef<SalidaDialogComponent>);
  private readonly fb = inject(FormBuilder);

  salidaForm: FormGroup;
  motivos = this.data.motivos;

  constructor() {
    this.salidaForm = this.fb.group({
      idProducto: [null, Validators.required],
      cantidad: [1, [Validators.required, Validators.min(0.001), this.noExceedsStock.bind(this)]],
      motivo: ['VENTA_PRODUCTO', Validators.required],
      comentario: ['', Validators.maxLength(255)]
    });
  }

  ngOnInit() {
    this.salidaForm.patchValue({
      idProducto: Number(this.data.product.idProducto),
      cantidad: 1,
      motivo: 'VENTA_PRODUCTO'
    });
  }

  private noExceedsStock(control: any) {
    if (!control.value || !this.data?.product) return null;
    return Number(control.value) > this.data.product.cantidadDisponible
      ? { exceedsStock: true }
      : null;
  }

  submit() {
    if (this.salidaForm.valid) {
      this.dialogRef.close(this.salidaForm.value);
    }
  }
}
