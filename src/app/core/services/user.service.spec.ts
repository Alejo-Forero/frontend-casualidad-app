import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { environment } from '../../../environments/environment';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/usuarios`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch all users with different data structures', () => {
    // 1. res.data.data
    service.getAll().subscribe(res => expect(res.length).toBe(1));
    httpMock.expectOne(apiUrl).flush({ data: { data: [{ id: '1' }] } });

    // 2. res.data only
    service.getAll().subscribe(res => expect(res.length).toBe(1));
    httpMock.expectOne(apiUrl).flush({ data: [{ id: '2' }] });

    // 3. empty
    service.getAll().subscribe(res => expect(res.length).toBe(0));
    httpMock.expectOne(apiUrl).flush({});
  });

  it('should handle payload mapping in create', () => {
    // 1. firstName/lastName fallback
    service.create({ firstName: 'A', lastName: 'B', email: 'e@e.com' }).subscribe();
    const req = httpMock.expectOne(apiUrl);
    expect(req.request.body.nombre).toBe('A B');
    expect(req.request.body.correo).toBe('e@e.com');
    req.flush({ data: {} });

    // 2. data.correo fallback
    service.create({ nombre: 'X', correo: 'c@c.com', password: 'P', idRol: 1 }).subscribe();
    const req2 = httpMock.expectOne(apiUrl);
    expect(req2.request.body.nombre).toBe('X');
    expect(req2.request.body.correo).toBe('c@c.com');
    expect(req2.request.body.contraseña).toBe('P');
    expect(req2.request.body.idRol).toBe(1);
    req2.flush({ data: {} });
  });

  it('should handle payload mapping in update', () => {
    service.update('1', { firstName: 'U' }).subscribe();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.body.nombre).toBe('U');
    expect(req.request.body.correo).toBe('');
    req.flush({ data: {} });
  });

  it('should getById and delete', () => {
    service.getById('1').subscribe();
    httpMock.expectOne(`${apiUrl}/1`).flush({ data: {} });
    service.delete('1').subscribe();
    httpMock.expectOne(`${apiUrl}/1`).flush({ data: {} });
  });
});
