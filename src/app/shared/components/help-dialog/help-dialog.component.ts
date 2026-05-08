import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-help-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="bg-white rounded-2xl overflow-hidden shadow-2xl p-5 sm:p-6 md:p-8 relative animate-[dropdownFadeIn_0.2s_ease-out]">
      <!-- Handle para móvil -->
      <div class="w-12 h-1.5 bg-stone-200 rounded-full sm:hidden absolute left-1/2 -translate-x-1/2 top-3"></div>

      <button (click)="close()" class="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors text-stone-500">
        <span class="material-symbols-outlined text-2xl">close</span>
      </button>
      
      <div class="flex items-center gap-4 mb-6 mt-4 sm:mt-0">
        <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-sm">
          <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">support_agent</span>
        </div>
        <div>
          <h2 class="text-xl font-bold text-stone-900 tracking-tight">Centro de Ayuda</h2>
          <p class="text-xs text-stone-500 font-medium">Asistencia técnica y canales de enlace</p>
        </div>
      </div>

      <div class="space-y-3 mb-8">
        <a href="mailto:soporte@casualidad.com" class="flex items-center gap-4 p-4 rounded-2xl border border-stone-100 bg-stone-50/50 hover:border-blue-300 hover:bg-blue-50 transition-all group">
          <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-stone-400 group-hover:text-blue-500 transition-colors">
            <span class="material-symbols-outlined">mail</span>
          </div>
          <div>
            <p class="text-sm font-bold text-stone-800 group-hover:text-blue-700">Soporte por Correo</p>
            <p class="text-[11px] text-stone-500 font-medium">soporte&#64;casualidad.com</p>
          </div>
        </a>

        <a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" class="flex items-center gap-4 p-4 rounded-2xl border border-stone-100 bg-stone-50/50 hover:border-green-300 hover:bg-green-50 transition-all group">
          <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-stone-400 group-hover:text-green-500 transition-colors">
            <span class="material-symbols-outlined">chat</span>
          </div>
          <div>
            <p class="text-sm font-bold text-stone-800 group-hover:text-green-700">WhatsApp Business</p>
            <p class="text-[11px] text-stone-500 font-medium">Respuesta rápida inmediata</p>
          </div>
        </a>
        
        <a href="tel:+1234567890" class="flex items-center gap-4 p-4 rounded-2xl border border-stone-100 bg-stone-50/50 hover:border-orange-300 hover:bg-orange-50 transition-all group">
          <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-stone-400 group-hover:text-orange-500 transition-colors">
            <span class="material-symbols-outlined">phone</span>
          </div>
          <div>
            <p class="text-sm font-bold text-stone-800 group-hover:text-orange-700">Atención Telefónica</p>
            <p class="text-[11px] text-stone-500 font-medium">Lunes a Sábado: 8am - 6pm</p>
          </div>
        </a>
      </div>

      <div class="flex justify-end">
        <button (click)="close()" class="px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg transition-colors">
          Cerrar
        </button>
      </div>
    </div>
  `
})
export class HelpDialogComponent {
  readonly dialogRef = inject(MatDialogRef<HelpDialogComponent>);

  close(): void {
    this.dialogRef.close();
  }
}
