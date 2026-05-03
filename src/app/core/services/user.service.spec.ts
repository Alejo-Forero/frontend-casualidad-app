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

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all users', () => {
    const mockResponse = { data: { data: [{ id: '1', nombre: 'Test' }] } };
    service.getAll().subscribe(users => {
      expect(users.length).toBe(1);
      expect(users[0].nombre).toBe('Test');
    });

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fetch user by id', () => {
    const mockUser = { id: '1', nombre: 'Test' };
    service.getById('1').subscribe(user => {
      expect(user.nombre).toBe('Test');
    });

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: mockUser });
  });

  it('should create user', () => {
    const userData = { firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
    service.create(userData).subscribe();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.nombre).toBe('John Doe');
    req.flush({ data: { id: '123' } });
  });

  it('should update user', () => {
    const userData = { nombre: 'John Updated', email: 'john@example.com' };
    service.update('123', userData).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/123`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.nombre).toBe('John Updated');
    req.flush({ data: {} });
  });

  it('should delete user', () => {
    service.delete('123').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/123`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ data: null });
  });
});
