import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { UserDTO } from '../core/models/auth.dto';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatSidenavModule, 
    MatToolbarModule, 
    MatButtonModule, 
    MatIconModule
  ],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css']
})
export class LayoutComponent {
  showProfileDropdown = false;
  showConfigModal = false;
  showDeleteModal = false;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly breakpointObserver = inject(BreakpointObserver);

  isMobile = false;

  constructor() {
    this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
      this.isMobile = result.matches;
      this.cdr.detectChanges();
    });
  }

  currentUser: UserDTO = this.authService.getUser() || {
    id: '',
    nombre: 'Usuario',
    email: 'usuario@casualidad.com',
    rol: 'USUARIO'
  };

  toggleProfileDropdown(event: Event): void {
    event.stopPropagation();
    this.showProfileDropdown = !this.showProfileDropdown;
    this.cdr.detectChanges();
  }

  closeProfileDropdown(): void {
    if (this.showProfileDropdown) {
      this.showProfileDropdown = false;
      this.cdr.detectChanges();
    }
  }

  openConfigModal(event?: Event): void {
    if (event) { event.stopPropagation(); }
    this.showConfigModal = true;
    this.showProfileDropdown = false;
    this.cdr.detectChanges();
  }

  closeConfigModal(): void {
    this.showConfigModal = false;
    this.cdr.detectChanges();
  }

  openDeleteModal(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.showDeleteModal = true;
    this.showConfigModal = false;
    this.cdr.detectChanges();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.cdr.detectChanges();
  }

  confirmDelete(): void {
    this.closeDeleteModal();
  }

  onDocumentClick(): void {
    this.closeProfileDropdown();
  }

  navigateToNuevoPedido(): void {
    this.router.navigate(['/pedidos'], { queryParams: { new: 'true' } });
  }
}
