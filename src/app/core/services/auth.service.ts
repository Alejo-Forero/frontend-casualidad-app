import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UserDTO, LoginResponseDTO, LoginRequestDTO } from '../models/auth.dto';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'accessToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private readonly USER_KEY = 'user';
  private readonly http = inject(HttpClient);

  constructor() {}

  login(credentials: any): Observable<LoginResponseDTO> {
    const payload: LoginRequestDTO = {
      correo: credentials.email,
      contraseña: credentials.password
    };
    return this.http.post<LoginResponseDTO>(`${environment.authUrl}/login`, payload).pipe(
      tap(response => this.setSession(response))
    );
  }

  setSession(loginResponse: LoginResponseDTO): void {
    sessionStorage.setItem(this.ACCESS_TOKEN_KEY, loginResponse.accessToken);
    sessionStorage.setItem(this.REFRESH_TOKEN_KEY, loginResponse.refreshToken);
    sessionStorage.setItem(this.USER_KEY, JSON.stringify(loginResponse.usuario));
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getUser(): UserDTO | null {
    const userJson = sessionStorage.getItem(this.USER_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson) as UserDTO;
      } catch (e) {
        console.error('Error parsing user data from session storage', e);
        return null;
      }
    }
    return null;
  }

  clearSession(): void {
    sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}
