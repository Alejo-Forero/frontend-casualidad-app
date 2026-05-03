import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ProductDTO } from '../../../core/models/inventory.dto';

@Component({
  selector: 'app-entrada-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  template: `
    <div class="relative bg-surface-container-lowest w-full rounded-xl overflow-hidden flex flex-col">
        <div class="h-2 w-full bg-gradient-to-r from-primary to-primary-container"></div>
        <div class="p-8">
            <div class="flex justify-between items-start mb-6">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                        <span class="material-symbols-outlined text-3xl text-primary">inventory_2</span>
                    </div>
                    <div>
                        <h2 class="text-xl font-extrabold text-on-surface tracking-tight">Entrada de Stock</h2>
                        <p class="text-sm text-on-surface-variant font-medium">{{ data.product.name }} — Stock actual: <strong>{{ data.product.stock }}</strong></p>
                    </div>
                </div>
                <button mat-dialog-close class="text-on-surface-variant hover:text-on-surface transition-colors p-2 hover:bg-surface-container rounded-full">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <form [formGroup]="entradaForm" (ngSubmit)="submit()" class="space-y-5">
                <div class="space-y-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-stone-500">Cantidad a ingresar *</label>
                    <input formControlName="cantidad" type="number" step="0.001" min="0.001"
                        class="w-full bg-surface-container border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 transition-all font-body"
                        placeholder="Ej: 50" />
                </div>
                <div class="space-y-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-stone-500">Motivo (Opcional)</label>
                    <select formControlName="motivo" class="w-full bg-surface-container border-none rounded-lg p-4 focus:ring-2 focus:ring-primary/40 transition-all font-body appearance-none font-bold text-on-surface">
                        @for (m of motivos; track m.value) {
                            <option [value]="m.value">{{ m.label }}</option>
                        }
                    </select>
                </div>
                <div class="flex gap-3 pt-2">
                    <button type="button" mat-dialog-close
                        class="flex-1 py-3 rounded-lg font-bold text-stone-500 hover:bg-stone-50 transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" [disabled]="!entradaForm.valid"
                        class="flex-1 py-3 rounded-lg font-bold bg-primary text-on-primary hover:bg-primary-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                        Registrar Entrada
                    </button>
                </div>
            </form>
        </div>
    </div>
  `
})
export class EntradaDialogComponent implements OnInit {
  data = inject(MAT_DIALOG_DATA) as { product: ProductDTO; motivos: {value: string, label: string}[] };
  dialogRef = inject(MatDialogRef<EntradaDialogComponent>);
  private readonly fb = inject(FormBuilder);

  entradaForm: FormGroup;
  motivos = this.data.motivos;

  constructor() {
    this.entradaForm = this.fb.group({
      idProducto: [null, Validators.required],
      cantidad: [1, [Validators.required, Validators.min(0.001)]],
      motivo: ['COMPRA_INSUMOS']
    });
  }

  ngOnInit() {
    this.entradaForm.patchValue({
      idProducto: Number(this.data.product.idProducto || this.data.product.id),
      cantidad: 1,
      motivo: 'COMPRA_INSUMOS'
    });
  }

  submit() {
    if (this.entradaForm.valid) {
      this.dialogRef.close(this.entradaForm.value);
    }
  }
}
