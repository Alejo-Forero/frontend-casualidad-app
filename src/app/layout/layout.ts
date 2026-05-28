import { Component, inject, ViewChild, OnInit, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../core/services/auth.service';
import { ScreenSizeService } from '../core/services/screen-size.service';
import { UserDTO } from '../core/models/auth.dto';
import { LogoutDialogComponent } from '../shared/components/logout-dialog/logout-dialog';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog';
import { HelpDialogComponent } from '../shared/components/help-dialog/help-dialog.component';
import { OrderService } from '../core/services/order.service';
import { InventoryService } from '../core/services/inventory.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css'],
})
export class LayoutComponent implements OnInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  showProfileDropdown = false;
  showConfigModal = false;
  showNotificationsDropdown = false;

  lowStockProducts: any[] = [];
  expiringOrders: any[] = [];

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly orderService = inject(OrderService);
  private readonly inventoryService = inject(InventoryService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  readonly screenSize = inject(ScreenSizeService);

  readonly currentUser: UserDTO = this.authService.getUser() ?? {
    id: '',
    nombre: 'Usuario',
    email: 'usuario@casualidad.com',
    rol: 'USUARIO',
  };

  readonly navLinks = [
    { path: '/',           icon: 'dashboard',      label: 'Inicio',     exact: true  },
    { path: '/clientes',   icon: 'handshake',      label: 'Clientes',   exact: false },
    { path: '/inventario', icon: 'inventory_2',    label: 'Inventario', exact: false },
    { path: '/pedidos',    icon: 'shopping_cart',  label: 'Pedidos',    exact: false },
    { path: '/pagos',      icon: 'payments',       label: 'Pagos',      exact: false },
    { path: '/reportes',   icon: 'analytics',      label: 'Reportes',   exact: false },
  ] as const;

  readonly configItems = [
    { path: '/cambiar-contrasena',  icon: 'lock_reset',    label: 'Cambiar contraseña'  },
    { path: '/restablecer-correo',  icon: 'alternate_email', label: 'Restablecer correo' },
    { path: '/perfil',              icon: 'person_edit',   label: 'Editar mis datos'    },
  ] as const;

  // Auto-close sidenav when switching to mobile
  constructor() {
    this.screenSize.isBelowDesktop$
      .pipe(takeUntilDestroyed())
      .subscribe(below => {
        if (!below) {
          // Reopened on desktop — ensure sidenav opens
          this.sidenav?.open();
        }
      });
  }

  ngOnInit() {
    this.loadNotifications();
  }

 loadNotifications(): void {
    this.inventoryService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(products => {
      this.lowStockProducts = products.filter(p => p.isLowStock);
      this.cdr.detectChanges();
    });
   
    this.orderService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(orders => {
      // 1. Obtenemos la fecha actual y la seteamos a medianoche para evitar problemas con las horas
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Pedidos por vencer: pendientes, ordenados por fecha y que NO estén vencidos
      this.expiringOrders = orders
        .filter(o => {
          // Verificamos que el estado sea válido
          const isActive = o.status === 'PENDIENTE' || o.status === 'EN_PRODUCCION';
         
          // 2. Parseamos la fecha de entrega de la base de datos
          const deliveryDate = new Date(o.deliveryDate);
          deliveryDate.setHours(0, 0, 0, 0);

          // 3. Retornamos true SOLO si está activo y la fecha de entrega es HOY o en el futuro
          return isActive && deliveryDate.getTime() >= today.getTime();
        })
        .sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime())
        .slice(0, 5); // top 5
       
      this.cdr.detectChanges();
    });
  }

  toggleProfileDropdown(event: Event): void {
    event.stopPropagation();
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  closeProfileDropdown(): void {
    this.showProfileDropdown = false;
  }

  toggleNotificationsDropdown(event: Event): void {
    event.stopPropagation();
    this.showNotificationsDropdown = !this.showNotificationsDropdown;
    this.showProfileDropdown = false;

    // Refresh notifications every time the user opens the dropdown
    if (this.showNotificationsDropdown) {
      this.loadNotifications();
    }
  }

  closeNotificationsDropdown(): void {
    this.showNotificationsDropdown = false;
  }

  openConfigModal(event?: Event): void {
    event?.stopPropagation();
    this.showConfigModal = true;
    this.showProfileDropdown = false;
    this.showNotificationsDropdown = false;
  }

  closeConfigModal(): void {
    this.showConfigModal = false;
  }

  openLogoutDialog(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.showProfileDropdown = false;
    this.showNotificationsDropdown = false;
    this.dialog.open(LogoutDialogComponent, {
      panelClass: ['responsive-dialog', 'casualidad-dialog'],
      maxWidth: '420px',
      width: '100%',
    });
  }

  openDeleteUserDialog(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.showConfigModal = false;
    this.dialog.open(ConfirmDialogComponent, {
      panelClass: ['responsive-dialog', 'casualidad-dialog'],
      maxWidth: '420px',
      width: '100%',
      data: {
        title: '¿Eliminar usuario?',
        message: 'El usuario será eliminado permanentemente del sistema. Esta acción ',
        highlightText: 'no se puede deshacer.',
        confirmLabel: 'Sí, eliminar usuario',
        cancelLabel: 'Cancelar',
        icon: 'delete_forever',
        accentColor: 'error',
      },
    });
  }

  navigateToNuevoPedido(): void {
    this.router.navigate(['/pedidos'], { queryParams: { new: 'true' } });
  }

  openHelpDialog(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.dialog.open(HelpDialogComponent, {
      panelClass: ['responsive-dialog', 'casualidad-dialog'],
      maxWidth: '420px',
      width: '100%',
    });
  }

  onDocumentClick(): void {
    this.closeProfileDropdown();
    this.closeNotificationsDropdown();
  }
}
