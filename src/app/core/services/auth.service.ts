import { Injectable } from '@angular/core';
import { UserDTO, LoginResponseDTO } from '../models/auth.dto';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'accessToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private readonly USER_KEY = 'user';

  constructor() {}

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
