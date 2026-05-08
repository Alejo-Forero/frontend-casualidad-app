import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login and set session', () => {
    const mockResponse = {
      accessToken: 'at',
      refreshToken: 'rt',
      usuario: { id: '1', nombre: 'U' }
    };
    const credentials = { email: 'test@test.com', password: '123' };

    service.login(credentials).subscribe(res => {
      expect(res.accessToken).toBe('at');
      expect(service.getAccessToken()).toBe('at');
    });

    const req = httpMock.expectOne(`${environment.authUrl}/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should get access token', () => {
    sessionStorage.setItem('accessToken', 'token');
    expect(service.getAccessToken()).toBe('token');
  });

  it('should get refresh token', () => {
    sessionStorage.setItem('refreshToken', 'token2');
    expect(service.getRefreshToken()).toBe('token2');
  });

  it('should get user', () => {
    sessionStorage.setItem('user', JSON.stringify({id: '1'}));
    expect(service.getUser()?.id).toBe('1');
  });

  it('should update user', () => {
    service.updateUser({ id: '2', nombre: 'Test', correo: 'a@a', rol: 'ADMIN' });
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    expect(user.id).toBe('2');
    expect(user.nombre).toBe('Test');
  });

  it('should handle invalid user json', () => {
    sessionStorage.setItem('user', '{invalid');
    expect(service.getUser()).toBeNull();
  });

  it('should handle no user json', () => {
    expect(service.getUser()).toBeNull();
  });

  it('should clear session', () => {
    sessionStorage.setItem('accessToken', '1');
    sessionStorage.setItem('refreshToken', '2');
    sessionStorage.setItem('user', '3');
    service.clearSession();
    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(sessionStorage.getItem('user')).toBeNull();
  });

  it('should check if authenticated', () => {
    expect(service.isAuthenticated()).toBe(false);
    sessionStorage.setItem('accessToken', '1');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('should handle login with remember me', () => {
    const mockResponse = {
      accessToken: 'at',
      refreshToken: 'rt',
      usuario: { id: '1', nombre: 'U', correo: 'u@u', rol: 'ADMIN' }
    };
    const credentials = { email: 'test@test.com', password: '123' };

    service.login(credentials, true).subscribe();

    const req = httpMock.expectOne(`${environment.authUrl}/login`);
    req.flush(mockResponse);

    expect(localStorage.getItem('casualidad_remember')).toBe('true');
    expect(localStorage.getItem('accessToken')).toBe('at');
  });

  it('should update user with remember me', () => {
    localStorage.setItem('casualidad_remember', 'true');
    const user = { id: '2', nombre: 'Test', correo: 'a@a', rol: 'ADMIN' };
    service.updateUser(user);
    expect(localStorage.getItem('user')).toBe(JSON.stringify(user));
  });

  it('should solicitar recuperación de password', () => {
    service.recuperarPassword('test@test.com').subscribe(res => {
      expect(res).toBe('Success');
    });

    const req = httpMock.expectOne(r => r.url === `${environment.authUrl}/recuperar-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('correo')).toBe('test@test.com');
    req.flush('Success');
  });

  it('should reset password public', () => {
    const payload = { correo: 'a@b.com', codigo: '123456', nuevaPassword: 'Pass' };
    service.resetPasswordPublic(payload).subscribe(res => {
      expect(res).toBe('Success');
    });

    const req = httpMock.expectOne(`${environment.authUrl}/reset-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush('Success');
  });

  it('should restore session from localStorage in constructor if remember is true', () => {
    localStorage.setItem('casualidad_remember', 'true');
    localStorage.setItem('accessToken', 'at_local');
    localStorage.setItem('refreshToken', 'rt_local');
    localStorage.setItem('user', JSON.stringify({ id: 'local' }));

    // Re-instantiate through TestBed to trigger constructor again
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    const newService = TestBed.inject(AuthService);
    
    expect(sessionStorage.getItem('accessToken')).toBe('at_local');
    expect(sessionStorage.getItem('refreshToken')).toBe('rt_local');
  });
});
