import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ClientService } from './client.service';
import { environment } from '../../../environments/environment';

describe('ClientService', () => {
  let service: ClientService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/clientes`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ClientService]
    });
    service = TestBed.inject(ClientService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch all clients with search term', () => {
    service.getAll('  Juan  ').subscribe();
    const req = httpMock.expectOne(req => req.url === apiUrl && req.params.get('filtro') === 'Juan');
    req.flush({ data: { content: [] } });
  });

  it('should map data correctly from content or data fields', () => {
    let result: any[] = [];
    service.getAll().subscribe(res => result = res);

    const req = httpMock.expectOne(req => req.url === apiUrl && req.params.get('page') === '0');
    req.flush({
      data: {
        data: [
          { idCliente: 1, nombre: 'A', direccion: null, telefonos: null, correo: null }
        ]
      }
    });

    expect(result[0].direccion).toBe('');
    expect(result[0].telefonos).toEqual([]);
    expect(result[0].correo).toBe('');
  });

  it('should handle empty data structure', () => {
    let result: any[] = [];
    service.getAll().subscribe(res => result = res);
    const req = httpMock.expectOne(req => req.url === apiUrl && req.params.get('page') === '0');
    req.flush({ data: null });
    expect(result).toEqual([]);
  });

  it('should use alternative field names in create and update', () => {
    service.create({ nombre: 'X', telefonos: ['123'], direccion: 'D', correo: 'c@c' }).subscribe();
    const req1 = httpMock.expectOne(apiUrl);
    expect(req1.request.body.nombre).toBe('X');
    expect(req1.request.body.telefonos).toEqual(['123']);
    req1.flush({ data: {} });

    service.update(1, { nombre: 'Y' }).subscribe();
    const req2 = httpMock.expectOne(`${apiUrl}/1`);
    expect(req2.request.body.nombre).toBe('Y');
    req2.flush({ data: {} });
  });
});
