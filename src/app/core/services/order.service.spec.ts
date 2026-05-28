import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { jest } from '@jest/globals';
import { OrderService } from './order.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('OrderService', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;
  let mockAuthService: { getUserId: jest.Mock };
  const apiUrl = `${environment.apiUrl}/pedidos`;

  beforeEach(() => {
    mockAuthService = { getUserId: jest.fn().mockReturnValue(42) };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        OrderService,
        { provide: AuthService, useValue: mockAuthService }
      ]
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
    // 1. Full data using clientId
    service.create({ clientId: 'uuid-abc', deliveryDate: 'D', items: [{ productId: 1, quantity: 1 }] }).subscribe();
    const req = httpMock.expectOne(apiUrl);
    expect(req.request.body.idCliente).toBe('uuid-abc');
    expect(req.request.body.idUsuario).toBe(42);
    expect(req.request.body.detalles[0].idProducto).toBe(1);
    expect(req.request.body).not.toHaveProperty('id_cliente');
    req.flush({});

    // 2. Fallback to idCliente field
    service.create({ idCliente: 'uuid-def', fechaEntrega: 'E', detalles: [{ idProducto: 2, cantidad: 2 }] }).subscribe();
    const req2 = httpMock.expectOne(apiUrl);
    expect(req2.request.body.idCliente).toBe('uuid-def');
    expect(req2.request.body.idUsuario).toBe(42);
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

  it('should manage order draft', () => {
    const draft = { clientId: 1, items: [] };
    service.setOrderDraft(draft);
    expect(service.getOrderDraft()).toEqual(draft);
    
    service.clearOrderDraft();
    expect(service.getOrderDraft()).toBeNull();
  });

  it('should map order summary with various fallbacks and payment status', () => {
    let result: any[] = [];
    service.getAll().subscribe(res => result = res);

    const req = httpMock.expectOne(req => req.url === apiUrl && req.params.get('page') === '0');
    req.flush({
      data: [
        { idPedido: 1, codigoUnico: 'COD1', nombreCliente: null, estadoPedido: 'DONE', fechaEntrega: '2026', total: 100, saldoPendiente: 0 },
        { idPedido: null, codigoUnico: 'COD2', nombreCliente: 'C2', estadoPedido: 'NEW', fechaEntrega: '2026', total: null, saldoPendiente: 50 }
      ]
    });

    expect(result[0].clientName).toBe('');
    expect(result[0].paymentStatus).toBe('PAID');
    expect(result[0].id).toBe('1');

    expect(result[1].totalAmount).toBe(0);
    expect(result[1].paymentStatus).toBe('PARTIAL');
    expect(result[1].id).toContain('tmp-');
  });

  it('should error when no client is provided', () => {
    let errorOccurred = false;
    service.create({ deliveryDate: 'D', items: [] }).subscribe({
      error: () => { errorOccurred = true; }
    });
    httpMock.expectNone(apiUrl);
    expect(errorOccurred).toBe(true);
  });

  it('should error when no session (getUserId returns null)', () => {
    (mockAuthService.getUserId as jest.Mock).mockReturnValue(null);
    let errorOccurred = false;
    service.create({ clientId: 'uuid-abc', deliveryDate: 'D', items: [] }).subscribe({
      error: () => { errorOccurred = true; }
    });
    httpMock.expectNone(apiUrl);
    expect(errorOccurred).toBe(true);
  });

  it('should handle alternative field names in update', () => {
    service.update(1, { items: [{ idProducto: 5, cantidad: 10, observaciones: 'Obs' }] }).subscribe();
    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.body.detalles[0].idProducto).toBe(5);
    expect(req.request.body.detalles[0].cantidad).toBe(10);
    expect(req.request.body.detalles[0].observaciones).toBe('Obs');
    req.flush({});
  });
});
