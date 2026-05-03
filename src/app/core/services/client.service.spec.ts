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

  it('should fetch all clients', () => {
    service.getAll().subscribe();
    // Match URL without worrying about params or match with params
    const req = httpMock.expectOne(req => req.url === apiUrl);
    req.flush({ data: { content: [] } });
  });

  it('should create client', () => {
    service.create({ name: 'A' }).subscribe();
    httpMock.expectOne(apiUrl).flush({ data: {} });
  });

  it('should update client', () => {
    service.update(1, { name: 'A' }).subscribe();
    httpMock.expectOne(`${apiUrl}/1`).flush({ data: {} });
  });

  it('should delete client', () => {
    service.delete(1).subscribe();
    httpMock.expectOne(`${apiUrl}/1`).flush({ data: {} });
  });
});
