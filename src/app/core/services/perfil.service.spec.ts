import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PerfilService, CambiarPasswordRequest, ValidarCorreoActualRequest, ConfirmarNuevoCorreoRequest, ActualizarPerfilRequest } from './perfil.service';
import { environment } from '../../../environments/environment';

describe('PerfilService', () => {
  let service: PerfilService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PerfilService]
    });
    service = TestBed.inject(PerfilService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Password', () => {
    it('should solicitarCodigoPassword', () => {
      service.solicitarCodigoPassword().subscribe(res => {
        expect(res).toBeTruthy();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/perfil/seguridad/password/solicitar-codigo`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
    });

    it('should cambiarPassword', () => {
      const payload: CambiarPasswordRequest = { codigo: '123456', nuevaPassword: 'password123' };
      service.cambiarPassword(payload).subscribe(res => {
        expect(res).toBeTruthy();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/perfil/seguridad/password/cambiar`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush({ success: true });
    });
  });

  describe('Correo', () => {
    it('should solicitarCodigoCorreoActual', () => {
      service.solicitarCodigoCorreoActual().subscribe(res => {
        expect(res).toBeTruthy();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/perfil/seguridad/correo/solicitar-codigo-actual`);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });
    });

    it('should validarActualYSolicitarNuevo', () => {
      const payload: ValidarCorreoActualRequest = { codigoActual: '123456', nuevoCorreo: 'test@test.com' };
      service.validarActualYSolicitarNuevo(payload).subscribe(res => {
        expect(res).toBeTruthy();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/perfil/seguridad/correo/validar-actual-y-solicitar-nuevo`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ success: true });
    });

    it('should confirmarCambioCorreo', () => {
      const payload: ConfirmarNuevoCorreoRequest = { codigoNuevo: '654321' };
      service.confirmarCambioCorreo(payload).subscribe(res => {
        expect(res).toBeTruthy();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/perfil/seguridad/correo/confirmar-cambio`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush({ success: true });
    });
  });

  describe('Perfil', () => {
    it('should actualizarPerfil', () => {
      const payload: ActualizarPerfilRequest = { nombre: 'Juan', apellidos: 'Perez', telefono: '1234567890' };
      service.actualizarPerfil(payload).subscribe(res => {
        expect(res).toBeTruthy();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/usuarios/perfil`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush({ success: true });
    });
  });
});
