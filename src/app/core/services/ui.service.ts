import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { SuccessDialogComponent } from '../../shared/components/success-dialog/success-dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';

export interface SuccessDialogConfig {
  title: string;
  message: string;
  highlightText?: string;
  message2?: string;
  icon?: string;
  accentColor?: 'success' | 'warning' | 'error' | 'primary';
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
}

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  highlightText?: string;
  warningText?: string;
  confirmLabel?: string;
  icon?: string;
  accentColor?: 'primary' | 'error' | 'warning';
}

@Injectable({
  providedIn: 'root'
})
export class UIService {
  private readonly dialog = inject(MatDialog);

  showSuccess(config: SuccessDialogConfig): Observable<any> {
    return this.dialog.open(SuccessDialogComponent, {
      panelClass: 'casualidad-dialog',
      data: {
        icon: 'check_circle',
        accentColor: 'success',
        primaryActionLabel: 'Continuar',
        ...config
      }
    }).afterClosed();
  }

  showConfirm(config: ConfirmDialogConfig): Observable<boolean> {
    return this.dialog.open(ConfirmDialogComponent, {
      panelClass: 'casualidad-dialog',
      data: {
        icon: 'help',
        accentColor: 'primary',
        confirmLabel: 'Confirmar',
        ...config
      }
    }).afterClosed();
  }

  showError(message: string, title: string = '¡Algo salió mal!'): Observable<any> {
    return this.showSuccess({
      title,
      message,
      icon: 'error',
      accentColor: 'warning',
      primaryActionLabel: 'Entendido'
    });
  }
}
