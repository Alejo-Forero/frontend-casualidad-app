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
  private readonly REMEMBER_KEY = 'casualidad_remember';
  private readonly http = inject(HttpClient);

  constructor() {
    // Si había sesión persistida, restaurarla en sessionStorage
    if (localStorage.getItem(this.REMEMBER_KEY) === 'true') {
      const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
      const refresh = localStorage.getItem(this.REFRESH_TOKEN_KEY);
      const user = localStorage.getItem(this.USER_KEY);
      if (token) sessionStorage.setItem(this.ACCESS_TOKEN_KEY, token);
      if (refresh) sessionStorage.setItem(this.REFRESH_TOKEN_KEY, refresh);
      if (user) sessionStorage.setItem(this.USER_KEY, user);
    }
  }

  login(credentials: any, remember = false): Observable<LoginResponseDTO> {
    const payload: LoginRequestDTO = {
      correo: credentials.email,
      contraseña: credentials.password
    };
    return this.http.post<LoginResponseDTO>(`${environment.authUrl}/login`, payload).pipe(
      tap(response => this.setSession(response, remember))
    );
  }

  recuperarPassword(correo: string): Observable<string> {
    return this.http.post(`${environment.authUrl}/recuperar-password`, null, {
      params: { correo },
      responseType: 'text'
    });
  }

  resetPasswordPublic(payload: { correo: string, codigo: string, nuevaPassword: string }): Observable<string> {
    return this.http.post(`${environment.authUrl}/reset-password`, payload, {
      responseType: 'text'
    });
  }

  setSession(loginResponse: LoginResponseDTO, remember = false): void {
    sessionStorage.setItem(this.ACCESS_TOKEN_KEY, loginResponse.accessToken);
    sessionStorage.setItem(this.REFRESH_TOKEN_KEY, loginResponse.refreshToken);
    sessionStorage.setItem(this.USER_KEY, JSON.stringify(loginResponse.usuario));

    if (remember) {
      localStorage.setItem(this.REMEMBER_KEY, 'true');
      localStorage.setItem(this.ACCESS_TOKEN_KEY, loginResponse.accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, loginResponse.refreshToken);
      localStorage.setItem(this.USER_KEY, JSON.stringify(loginResponse.usuario));
    }
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

  updateUser(user: UserDTO): void {
    sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
    if (localStorage.getItem(this.REMEMBER_KEY) === 'true') {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  clearSession(): void {
    sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.REMEMBER_KEY);
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  getUserId(): number | null {
    const user = this.getUser();
    if (!user || !user.id) return null;
    const id = Number(user.id);
    return isNaN(id) ? null : id;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}
