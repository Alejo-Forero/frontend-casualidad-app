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

  it('should getAll and map data array', () => {
    let result: any[] = [];
    service.getAll().subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('/productos'));
    req.flush({ data: { data: [mockProduct] } });
    expect(result[0].name).toBe('Tela');
    expect(result[0].stock).toBe(50);
    expect(result[0].isLowStock).toBe(false);
    expect(result[0].unit.name).toBe('Metro');
  });

  it('should getAll using content fallback', () => {
    let result: any[] = [];
    service.getAll().subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.url.includes('/productos'));
    req.flush({ data: { content: [mockProduct] } });
    expect(result[0].nombre).toBe('Tela');
  });

  it('should create a product with string unit', () => {
    let result: any;
    service.create({ name: 'Hilo', type: 'INSUMO', stock: 10, minStock: 2, unit: 'Unidad', salePrice: 5, productionCost: 3, wastePercent: 0 }).subscribe(r => result = r);
    const req = httpMock.expectOne(r => r.method === 'POST' && r.url.includes('/productos'));
    expect(req.request.body.nuevaUnidadMedida).toBe('Unidad');
    req.flush({ data: { idProducto: 5 } });
    expect(result.idProducto).toBe(5);
  });

  it('should create a product with numeric unit ID', () => {
    service.create({ name: 'Hilo', type: 'INSUMO', stock: 10, minStock: 2, unit: '3', salePrice: 5, productionCost: 3, wastePercent: 0 }).subscribe();
    const req = httpMock.expectOne(r => r.method === 'POST' && r.url.includes('/productos'));
    expect(req.request.body.idUnidadMedida).toBe(3);
    req.flush({ data: {} });
  });

  it('should create a product with empty unit fallback', () => {
    service.create({ name: 'Hilo', type: 'INSUMO', stock: 10, unit: '' }).subscribe();
    const req = httpMock.expectOne(r => r.method === 'POST' && r.url.includes('/productos'));
    expect(req.request.body.nuevaUnidadMedida).toBe('Unidad');
    req.flush({ data: {} });
  });

  it('should update a product with string unit', () => {
    service.update(1, { name: 'Tela Premium', minStock: 5, unit: 'Kg', salePrice: 20, productionCost: 12, wastePercent: 5 }).subscribe();
    const req = httpMock.expectOne(r => r.method === 'PUT');
    expect(req.request.body.nuevaUnidadMedida).toBe('Kg');
    req.flush({ data: {} });
  });

  it('should update a product with numeric unit ID', () => {
    service.update(1, { name: 'Tela Premium', minStock: 5, unit: '2', salePrice: 20 }).subscribe();
    const req = httpMock.expectOne(r => r.method === 'PUT');
    expect(req.request.body.idUnidadMedida).toBe(2);
    req.flush({ data: {} });
  });

  it('should delete (ajuste a 0)', () => {
    let called = false;
    service.delete(1).subscribe(() => called = true);
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
});
