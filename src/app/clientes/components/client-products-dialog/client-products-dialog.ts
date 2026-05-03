import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ClientDTO } from '../../../core/models/client.dto';

@Component({
  selector: 'app-client-products-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="relative bg-surface-container-lowest w-full rounded-xl overflow-hidden flex flex-col max-h-[85vh]">
        <!-- Modal Header -->
        <div class="px-8 py-6 border-b border-outline-variant/15 flex justify-between items-center bg-surface-container-lowest">
            <div>
                <h2 class="text-2xl font-headline font-extrabold text-on-background tracking-tight">Pedidos de {{ data.client.name }}</h2>
                <p class="text-primary font-bold text-sm mt-1 flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">tag</span> Cliente ID: {{ data.client.id }}
                </p>
            </div>
            <button mat-dialog-close class="text-on-surface-variant hover:text-on-surface transition-colors p-2 hover:bg-surface-container rounded-full">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <!-- Modal Content -->
        <div class="flex-1 overflow-y-auto p-8">
            <!-- Dynamic content -->
            @if (data.client.ordersSummary.total === 0) {
                <div class="text-center py-8 text-on-surface-variant">
                    Este cliente no tiene pedidos registrados.
                </div>
            } @else {
                <div class="text-center py-8">
                    <div class="animate-pulse">Cargando detalles de los {{ data.client.ordersSummary.total }} pedidos...</div>
                </div>
            }
        </div>
        <!-- Modal Footer -->
        <div class="px-8 py-6 bg-surface-container border-t border-outline-variant/15 flex justify-end gap-4">
            <button mat-dialog-close class="px-8 py-3 rounded-lg font-bold bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-sm transition-transform active:scale-95">
                Cerrar
            </button>
        </div>
    </div>
  `
})
export class ClientProductsDialogComponent {
  data = inject(MAT_DIALOG_DATA) as { client: ClientDTO };
  dialogRef = inject(MatDialogRef<ClientProductsDialogComponent>);
}
