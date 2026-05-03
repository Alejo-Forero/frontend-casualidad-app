import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { jest } from '@jest/globals';

describe('authInterceptor', () => {
  let authServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    authServiceMock = {
      getAccessToken: jest.fn(),
      clearSession: jest.fn()
    };
    routerMock = {
      navigate: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('should add Authorization header if token exists', () => {
    authServiceMock.getAccessToken.mockReturnValue('my-token');
    const req = new HttpRequest('GET', '/test');
    const next: HttpHandlerFn = (r) => {
      expect(r.headers.get('Authorization')).toBe('Bearer my-token');
      return of({} as any);
    };

    TestBed.runInInjectionContext(() => authInterceptor(req, next)).subscribe();
  });

  it('should not add Authorization header if token does not exist', () => {
    authServiceMock.getAccessToken.mockReturnValue(null);
    const req = new HttpRequest('GET', '/test');
    const next: HttpHandlerFn = (r) => {
      expect(r.headers.has('Authorization')).toBe(false);
      return of({} as any);
    };

    TestBed.runInInjectionContext(() => authInterceptor(req, next)).subscribe();
  });

  it('should clear session and navigate to /login on 401 error', (done) => {
    authServiceMock.getAccessToken.mockReturnValue('token');
    const req = new HttpRequest('GET', '/test');
    const errorResponse = new HttpErrorResponse({ status: 401 });
    const next: HttpHandlerFn = () => throwError(() => errorResponse);

    TestBed.runInInjectionContext(() => authInterceptor(req, next)).subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
        expect(authServiceMock.clearSession).toHaveBeenCalled();
        expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
        done();
      }
    });
  });

  it('should only throw error if status is not 401', (done) => {
    const req = new HttpRequest('GET', '/test');
    const errorResponse = new HttpErrorResponse({ status: 500 });
    const next: HttpHandlerFn = () => throwError(() => errorResponse);

    TestBed.runInInjectionContext(() => authInterceptor(req, next)).subscribe({
      error: (err) => {
        expect(err.status).toBe(500);
        expect(authServiceMock.clearSession).not.toHaveBeenCalled();
        done();
      }
    });
  });
});
