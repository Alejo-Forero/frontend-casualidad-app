import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OrderService } from './order.service';
import { environment } from '../../../environments/environment';

describe('OrderService', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/pedidos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OrderService]
    });
    service = TestBed.inject(OrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch all orders', () => {
    service.getAll({ idCliente: 1, estado: 'DONE', fechaInicio: 'A', fechaFin: 'B' }).subscribe();
    httpMock.expectOne(req => req.url === apiUrl).flush({ data: [{ idPedido: 1, saldoPendiente: 0 }] });
  });

  it('should create order with various payload options', () => {
    // 1. Full data
    service.create({ clientId: 1, deliveryDate: 'D', items: [{ productId: 1, quantity: 1 }] }).subscribe();
    const req = httpMock.expectOne(apiUrl);
    expect(req.request.body.idCliente).toBe(1);
    expect(req.request.body.detalles[0].idProducto).toBe(1);
    req.flush({});

    // 2. Fallbacks
    service.create({ idCliente: 2, fechaEntrega: 'E', detalles: [{ idProducto: 2, cantidad: 2 }] }).subscribe();
    const req2 = httpMock.expectOne(apiUrl);
    expect(req2.request.body.idCliente).toBe(2);
    req2.flush({});
  });

  it('should update order with various payload options', () => {
    service.update(1, { items: [{ productId: 1 }], deliveryDate: 'D' }).subscribe();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.body.detalles[0].idProducto).toBe(1);
    req.flush({});

    service.update(2, { detalles: [{ idDetalle: 1, idProducto: 2 }], fechaEntrega: 'E' }).subscribe();
    const req2 = httpMock.expectOne(`${apiUrl}/2`);
    expect(req2.request.body.detalles[0].idProducto).toBe(2);
    req2.flush({});
  });

  it('should handle actions', () => {
    service.getById(1, 0, 5).subscribe();
    httpMock.expectOne(req => req.url === `${apiUrl}/1`).flush({});
    
    service.activarProduccion(1).subscribe();
    httpMock.expectOne(`${apiUrl}/1/activar-produccion`).flush({});
    
    service.cancelar(1, true).subscribe();
    httpMock.expectOne(req => req.url === `${apiUrl}/1/cancelar`).flush({});

    service.delete(1).subscribe();
    httpMock.expectOne(`${apiUrl}/1/cancelar?reintegrarMateriales=false`).flush({});
  });
});
