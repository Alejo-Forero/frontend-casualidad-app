import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PerfilService } from '../core/services/perfil.service';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrls: ['./perfil.css']
})
export class PerfilComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly perfilService = inject(PerfilService);
  private readonly authService = inject(AuthService);

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  perfilForm: FormGroup = this.fb.group({
    nombre: ['', [
      Validators.required,
      Validators.maxLength(50),
      Validators.pattern(String.raw`^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$`)
    ]],
    apellidos: ['', [
      Validators.required,
      Validators.maxLength(50),
      Validators.pattern(String.raw`^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$`)
    ]],
    telefono: ['', [
      Validators.required,
      Validators.pattern('^[0-9]{10}$')
    ]]
  });

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      // Initialize with existing data. Notice user object might need adaptation.
      // Assuming 'nombre' contains "Name Lastname" and we can split or just map properly
      // If we don't have apellidos/telefono in UserDTO, we'll leave it blank.
      const names = user.nombre ? user.nombre.split(' ') : ['', ''];
      const first = names[0] || '';
      const last = names.slice(1).join(' ') || '';

      this.perfilForm.patchValue({
        nombre: first,
        apellidos: last,
        telefono: '' // No phone in standard UserDTO currently
      });
    }
  }

  get nombreControl() { return this.perfilForm.get('nombre'); }
  get apellidosControl() { return this.perfilForm.get('apellidos'); }
  get telefonoControl() { return this.perfilForm.get('telefono'); }

  actualizarPerfil(): void {
    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.perfilForm.value;

    this.perfilService.actualizarPerfil(payload).subscribe({
      next: (response) => {
        this.successMessage = 'Datos de perfil actualizados exitosamente.';
        this.isLoading = false;

        // We might want to update local session storage too if needed.
        const user = this.authService.getUser();
        if (user) {
          user.nombre = `${payload.nombre} ${payload.apellidos}`.trim();
          this.authService.updateUser(user);
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Error al actualizar el perfil.';
        this.isLoading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
