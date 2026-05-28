import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { InventoryService } from './inventory.service';

const mockProduct = {
  idProducto: 1, nombre: 'Tela', tipo: 'INSUMO',
  unidadMedida: 'Metro', cantidadDisponible: 50,
  stockBajo: false, precioCompra: 10, precioVenta: 15
};

describe('InventoryService', () => {
  let service: InventoryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InventoryService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(InventoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── getAll ─────────────────────────────────────────────────────────────────

  it('should getAll and map data array', () => {
    let result: any[] = [];
    service.getAll().subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('/productos'));
    req.flush({ data: { data: [mockProduct] } });
    expect(result[0].nombre).toBe('Tela');
    expect(result[0].cantidadDisponible).toBe(50);
    expect(result[0].isLowStock).toBe(false);
    expect(result[0].unidadMedida).toBe('Metro');
  });

  it('should getAll using content fallback', () => {
    let result: any[] = [];
    service.getAll().subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('/productos'));
    req.flush({ data: { content: [mockProduct] } });
    expect(result[0].nombre).toBe('Tela');
  });

  // ─── create() — contrato de payload ─────────────────────────────────────────

  it('create: envía idUnidadMedida cuando viene número, sin nuevaUnidadMedida', () => {
    service.create({ nombre: 'Hilo', tipo: 'INSUMO', stock: 10, minStock: 2, idUnidadMedida: 3, precioCompra: 50 }).subscribe();
    const req = httpMock.expectOne(r => r.method === 'POST' && r.url.includes('/productos'));
    expect(req.request.body.idUnidadMedida).toBe(3);
    expect(req.request.body).not.toHaveProperty('nuevaUnidadMedida');
    req.flush({ data: 5 });
  });

  it('create: envía nuevaUnidadMedida cuando es string, sin idUnidadMedida', () => {
    service.create({ nombre: 'Hilo', tipo: 'INSUMO', stock: 10, minStock: 2, nuevaUnidadMedida: 'Metros', precioCompra: 50 }).subscribe();
    const req = httpMock.expectOne(r => r.method === 'POST' && r.url.includes('/productos'));
    expect(req.request.body.nuevaUnidadMedida).toBe('Metros');
    expect(req.request.body).not.toHaveProperty('idUnidadMedida');
    req.flush({ data: 5 });
  });

  it('create: NO envía precioVenta cuando es null (INSUMO no tiene precio de venta)', () => {
    service.create({
      nombre: 'Tela', tipo: 'INSUMO', stock: 10, minStock: 2,
      idUnidadMedida: 3, precioCompra: 100, precioVenta: null
    }).subscribe();
    const req = httpMock.expectOne(r => r.method === 'POST' && r.url.includes('/productos'));
    expect(req.request.body.precioCompra).toBe(100);
    expect(req.request.body).not.toHaveProperty('precioVenta');
    req.flush({ data: 7 });
  });

  it('create: NO envía precioCompra cuando es null o 0 (ELABORADO sin composición)', () => {
    service.create({
      nombre: 'Pastel', tipo: 'ELABORADO', stock: 0, minStock: 1,
      idUnidadMedida: 1, precioCompra: null, precioVenta: 5000
    }).subscribe();
    const req = httpMock.expectOne(r => r.method === 'POST');
    expect(req.request.body).not.toHaveProperty('precioCompra');
    expect(req.request.body.precioVenta).toBe(5000);
    req.flush({ data: 9 });
  });

  it('create: redondea precios decimales a enteros (Math.round)', () => {
    service.create({
      nombre: 'Z', tipo: 'INSUMO', stock: 1, minStock: 0,
      idUnidadMedida: 1, precioCompra: 100.6, precioVenta: 200.4
    }).subscribe();
    const req = httpMock.expectOne(r => r.method === 'POST');
    expect(req.request.body.precioCompra).toBe(101);
    expect(req.request.body.precioVenta).toBe(200);
    req.flush({ data: 3 });
  });

  it('create: NUNCA envía idUnidadMedida ni nuevaUnidadMedida si ambos están vacíos', () => {
    service.create({
      nombre: 'W', tipo: 'INSUMO', stock: 1, minStock: 0,
      idUnidadMedida: null, nuevaUnidadMedida: '', precioCompra: 50
    }).subscribe();
    const req = httpMock.expectOne(r => r.method === 'POST');
    expect(req.request.body).not.toHaveProperty('idUnidadMedida');
    expect(req.request.body).not.toHaveProperty('nuevaUnidadMedida');
    req.flush({ data: 4 });
  });

  it('create: incluye tipo y cantidad (campos propios de create)', () => {
    service.create({ nombre: 'Item', tipo: 'REVENTA', stock: 5, minStock: 1, idUnidadMedida: 2, precioCompra: 80, precioVenta: 120 }).subscribe();
    const req = httpMock.expectOne(r => r.method === 'POST');
    expect(req.request.body.tipo).toBe('REVENTA');
    expect(req.request.body.cantidad).toBe(5);
    req.flush({ data: 10 });
  });

  // ─── update() — contrato de payload ─────────────────────────────────────────

  it('update: envía idUnidadMedida cuando viene número', () => {
    service.update(1, { nombre: 'Tela Premium', minStock: 5, idUnidadMedida: 2, precioCompra: 200, precioVenta: 300 }).subscribe();
    const req = httpMock.expectOne(r => r.method === 'PUT');
    expect(req.request.body.idUnidadMedida).toBe(2);
    expect(req.request.body).not.toHaveProperty('nuevaUnidadMedida');
    req.flush({ data: {} });
  });

  it('update: envía nuevaUnidadMedida cuando es string', () => {
    service.update(1, { nombre: 'Tela Premium', minStock: 5, nuevaUnidadMedida: 'Kg', precioCompra: 200 }).subscribe();
    const req = httpMock.expectOne(r => r.method === 'PUT');
    expect(req.request.body.nuevaUnidadMedida).toBe('Kg');
    req.flush({ data: {} });
  });

  it('update: NO envía precioVenta = 0 ni null', () => {
    service.update(10, { nombre: 'Edit', minStock: 1, idUnidadMedida: 2, precioCompra: 200, precioVenta: 0 }).subscribe();
    const req = httpMock.expectOne(r => r.method === 'PUT');
    expect(req.request.body).not.toHaveProperty('precioVenta');
    req.flush({ data: null });
  });

  it('update: NO envía tipo ni cantidad (solo aplican en create)', () => {
    service.update(1, { nombre: 'Test', tipo: 'INSUMO', stock: 99, minStock: 1, idUnidadMedida: 1, precioCompra: 50 }).subscribe();
    const req = httpMock.expectOne(r => r.method === 'PUT');
    expect(req.request.body).not.toHaveProperty('tipo');
    expect(req.request.body).not.toHaveProperty('cantidad');
    req.flush({ data: {} });
  });

  // ─── Otros métodos ──────────────────────────────────────────────────────────

  it('should vaciarStock (ajuste a 0)', () => {
    let called = false;
    service.vaciarStock(1).subscribe(() => called = true);
    const req = httpMock.expectOne(r => r.url.includes('/inventario/ajustes'));
    expect(req.request.body.cantidadNueva).toBe(0);
    req.flush({});
    expect(called).toBe(true);
  });

  it('should registrarEntrada', () => {
    let result: any;
    service.registrarEntrada(1, 10, 'COMPRA_INSUMOS').subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('/inventario/entradas'));
    expect(req.request.body.cantidad).toBe(10);
    req.flush({ ok: true });
    expect(result.ok).toBe(true);
  });

  it('should ajustarInventario', () => {
    let result: any;
    service.ajustarInventario(1, 25, 'Ajuste manual').subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('/inventario/ajustes'));
    expect(req.request.body.cantidadNueva).toBe(25);
    req.flush({ ok: true });
    expect(result.ok).toBe(true);
  });

  it('should addComposicion', () => {
    const insumos = [{ idInsumo: 2, cantidadUsada: 3 }];
    let result: any;
    service.addComposicion(1, insumos).subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('/composicion'));
    req.flush({ ok: true });
    expect(result.ok).toBe(true);
  });

  it('should map inventory item with various fallbacks', () => {
    let result: any[] = [];
    service.getAll().subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('/productos'));

    const incompleteProduct = {
      id: 99,
      name: 'Fallback Name',
      type: 'TRANSFORMADO',
      unit: { name: 'Litro' },
      stock: 10,
      isLowStock: true,
      purchasePrice: 100,
      salePrice: 150,
      wastePercent: 5
    };

    req.flush({ data: { content: [incompleteProduct] } });

    expect(result[0].idProducto).toBe(99);
    expect(result[0].nombre).toBe('Fallback Name');
    expect(result[0].tipo).toBe('TRANSFORMADO');
    expect(result[0].unidadMedida).toBe('Litro');
    expect(result[0].cantidadDisponible).toBe(10);
    expect(result[0].isLowStock).toBe(true);
  });

  it('should map inventory item with minimum data and nulls', () => {
    let result: any[] = [];
    service.getAll().subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('/productos'));

    const minProduct = {
      idProducto: null, nombre: null, tipo: null, unidadMedida: null,
      cantidadDisponible: null, stockBajo: null, precioCompra: null,
      precioVenta: null, porcentajeSobrante: null
    };

    req.flush({ data: { data: [minProduct] } });

    expect(result[0].idProducto).toBe(0);
    expect(result[0].nombre).toBe('Sin nombre');
    expect(result[0].tipo).toBe('INSUMO');
    expect(result[0].unidadMedida).toBe('Unidad');
    expect(result[0].cantidadDisponible).toBe(0);
    expect(result[0].isLowStock).toBe(false);
    expect(result[0].precioCompra).toBe(0);
    expect(result[0].precioVenta).toBe(0);
  });

  it('should getUnidadesMedida', () => {
    let result: any;
    service.getUnidadesMedida().subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('unidades-medida'));
    req.flush({ data: [{ id: 1, nombre: 'U' }] });
    expect(result.length).toBe(1);
  });
});
