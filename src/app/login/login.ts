import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HelpDialogComponent } from '../shared/components/help-dialog/help-dialog.component';
import { ForgotPasswordDialogComponent } from '../shared/components/forgot-password-dialog/forgot-password-dialog.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [false]
  });

  // Estado de UI
  showErrorModal = false;
  isLoading = false;

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password, remember } = this.loginForm.value;
    this.isLoading = true;

    this.authService.login({ email, password }, remember).subscribe({
      next: () => {
        this.router.navigate(['/']);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error in login', err);
        this.showErrorModal = true;
        this.loginForm.reset({ email: '', password: '', remember: false });
        this.isLoading = false;
      }
    });
  }

  openHelpDialog() {
    this.dialog.open(HelpDialogComponent, {
      panelClass: ['responsive-dialog', 'casualidad-dialog'],
      maxWidth: '420px',
      width: '100%',
    });
  }

  openForgotPasswordDialog() {
    this.dialog.open(ForgotPasswordDialogComponent, {
      panelClass: ['responsive-dialog', 'casualidad-dialog'],
      maxWidth: '420px',
      width: '100%',
    });
  }

  closeErrorModal() {
    this.showErrorModal = false;
  }
}
