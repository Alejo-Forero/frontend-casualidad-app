import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

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

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [false]
  });

  // Estado de UI
  showHelpModal = false;
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

    const { email, password } = this.loginForm.value;
    this.isLoading = true;

    this.authService.login({ email, password }).subscribe({
      next: (response) => {
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

  toggleHelpModal() {
    this.showHelpModal = !this.showHelpModal;
    document.body.style.overflow = this.showHelpModal ? 'hidden' : '';
  }

  closeErrorModal() {
    this.showErrorModal = false;
    document.body.style.overflow = '';
  }
}
