import { TestBed } from '@angular/core/testing';
import { jest } from '@jest/globals';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PaymentService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should registrarAbono', () => {
    let result: any;
    service.registrarAbono(1, { monto: 100, metodoPago: 'EFECTIVO' }).subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('/pedidos/1/abonos'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.monto).toBe(100);
    req.flush({ idPago: 10, nuevoSaldoPendientePedido: 400 });
    expect(result.idPago).toBe(10);
  });

  it('should registrarAbono with transferencia and referencia', () => {
    service.registrarAbono(2, { monto: 200, metodoPago: 'TRANSFERENCIA', referenciaComprobante: 'REF-001' }).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/pedidos/2/abonos'));
    expect(req.request.body.referenciaComprobante).toBe('REF-001');
    req.flush({});
  });

  it('should editarAbono', () => {
    let result: any;
    service.editarAbono(1, 10, { monto: 150, metodoPago: 'EFECTIVO' }).subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('/pedidos/1/abonos/10') && r.method === 'PUT');
    req.flush({ idPago: 10, monto: 150 });
    expect(result.monto).toBe(150);
  });

  it('should eliminarAbono', () => {
    let called = false;
    service.eliminarAbono(1, 10).subscribe(() => called = true);
    const req = httpMock.expectOne(r => r.url.includes('/pedidos/1/abonos/10') && r.method === 'DELETE');
    req.flush({ nuevoSaldoPendientePedido: 500 });
    expect(called).toBe(true);
  });

  it('should getReporteIngresos', () => {
    let result: any;
    service.getReporteIngresos('2026-01-01', '2026-12-31').subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('/reportes/ingresos') && !r.url.includes('exportar'));
    expect(req.request.params.get('fechaInicio')).toBe('2026-01-01');
    req.flush({ totalGeneral: 5000, cantidadAbonos: 10 });
    expect(result.totalGeneral).toBe(5000);
  });

  it('should exportarReporteIngresos', () => {
    let result: any;
    service.exportarReporteIngresos('2026-01-01', '2026-12-31').subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('exportar'));
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['data']));
    expect(result).toBeTruthy();
  });

  it('should getSaldosPendientes', () => {
    let result: any;
    service.getSaldosPendientes().subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('saldos-pendientes') && !r.url.includes('exportar'));
    req.flush({ totalPorCobrar: 2000, pedidos: [] });
    expect(result.totalPorCobrar).toBe(2000);
  });

  it('should exportarSaldosPendientes', () => {
    let result: any;
    service.exportarSaldosPendientes().subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('saldos-pendientes/exportar'));
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['data']));
    expect(result).toBeTruthy();
  });

  it('should create via registrarAbono (deprecated)', () => {
    service.create({ idPedido: 1, monto: 100, metodoPago: 'EFECTIVO' }).subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/abonos'));
    req.flush({});
  });

  it('should emit error from create when idPedido is missing', (done) => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    service.create({ monto: 100 }).subscribe({
      error: (e) => {
        expect(e).toBe('idPedido requerido');
        spy.mockRestore();
        done();
      }
    });
  });

  it('should emit error from delete (deprecated)', (done) => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    service.delete(1).subscribe({
      error: (e) => {
        expect(typeof e).toBe('string');
        spy.mockRestore();
        done();
      }
    });
  });
});
