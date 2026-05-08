import { ComponentFixture, TestBed } from '@angular/core/testing';
import { jest } from '@jest/globals';
import { InventarioComponent } from './inventario';
import { InventoryService } from '../core/services/inventory.service';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ProductDTO, ProductType } from '../core/models/inventory.dto';
import { UIService } from '../core/services/ui.service';
import { ActivatedRoute } from '@angular/router';

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeProduct = (overrides: Partial<ProductDTO> = {}): ProductDTO =>
({
  idProducto: 1,
  nombre: 'Producto Test',
  tipo: 'INSUMO' as ProductType,
  cantidadDisponible: 10,
  stockMinimo: 2,
  isLowStock: false,
  unidadMedida: 'kg',
  idUnidadMedida: 1,
  precioCompra: 90,
  precioVenta: 150,
  porcentajeSobrante: 5,
  composition: [],
  ...overrides,
} as any);

const dialogRefStub = (result: any) => ({
  afterClosed: () => of(result),
});

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('InventarioComponent', () => {
  let component: InventarioComponent;
  let fixture: ComponentFixture<InventarioComponent>;
  let mockInventoryService: jest.Mocked<Partial<InventoryService>>;
  let mockDialog: { open: jest.Mock };
  let mockUIService: { showSuccess: jest.Mock, showConfirm: jest.Mock, showError: jest.Mock };

  const setupTestBed = async (queryParams: any = {}, products: ProductDTO[] = []) => {
    mockInventoryService = {
      getAll: jest.fn(() => of(products)),
      delete: jest.fn(() => of({})),
      create: jest.fn(() => of(1)),
      update: jest.fn(() => of({})),
      registrarEntrada: jest.fn(() => of({})),
      ajustarInventario: jest.fn(() => of({})),
      addComposicion: jest.fn(() => of({})),
      getUnidadesMedida: jest.fn(() => of([])),
      getById: jest.fn(() => of(makeProduct()))
    };

    mockDialog = { open: jest.fn(() => dialogRefStub(true)) };
    mockUIService = {
      showSuccess: jest.fn(() => of({ action: 'primary' })),
      showConfirm: jest.fn(() => of(true)),
      showError: jest.fn(() => of(true))
    };

    await TestBed.configureTestingModule({
      imports: [InventarioComponent, BrowserAnimationsModule],
      providers: [
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: UIService, useValue: mockUIService },
        { provide: ActivatedRoute, useValue: { queryParams: of(queryParams) } }
      ],
    }).overrideProvider(MatDialog, { useValue: mockDialog })
    .overrideProvider(UIService, { useValue: mockUIService })
    .compileComponents();

    fixture = TestBed.createComponent(InventarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  it('should create the component', async () => {
    await setupTestBed();
    expect(component).toBeTruthy();
  });

  it('should initialise with list view mode', async () => {
    await setupTestBed();
    expect(component.viewMode).toBe('list');
  });

  it('should load inventory on init', async () => {
    const products = [makeProduct(), makeProduct({ idProducto: 2, nombre: 'Otro' })];
    await setupTestBed({}, products);
    expect(component.productsList.length).toBe(2);
    expect(component.dataSource.data.length).toBe(2);
  });

  it('should filter low stock products', async () => {
    await setupTestBed();
    component.productsList = [
      makeProduct({ idProducto: 1, isLowStock: true }),
      makeProduct({ idProducto: 2, isLowStock: false })
    ];
    expect(component.getLowStockCount()).toBe(1);
  });

  it('should change filter and apply it', async () => {
    await setupTestBed();
    const spy = jest.spyOn(component.dataSource, 'filter', 'set');
    component.searchTerm = 'test';
    component.setFilter('lowstock');
    expect(component.currentFilter).toBe('lowstock');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('lowstock'));
  });

  it('should calculate total inventory value', async () => {
    await setupTestBed();
    component.productsList = [
      makeProduct({ idProducto: 1, cantidadDisponible: 10, precioCompra: 5 }),
      makeProduct({ idProducto: 2, cantidadDisponible: 2, precioVenta: 50, precioCompra: 0 })
    ];
    expect(component.totalInventoryValue).toBe(150);
  });

  it('should open add form', async () => {
    await setupTestBed();
    component.openAddForm();
    expect(component.viewMode).toBe('add');
    expect(component.selectedProduct).toBeNull();
  });

  it('should open edit form with full product details', async () => {
    await setupTestBed();
    const product = makeProduct({ idProducto: 1 });
    const fullProduct = makeProduct({ idProducto: 1, nombre: 'Full' });
    (mockInventoryService.getById as jest.Mock).mockReturnValue(of(fullProduct));
    
    component.openEditForm(product);
    expect(mockInventoryService.getById).toHaveBeenCalledWith(1);
    expect(component.selectedProduct).toEqual(fullProduct);
    expect(component.viewMode).toBe('edit');
  });

  it('should call delete service after confirmation', async () => {
    await setupTestBed();
    mockUIService.showConfirm.mockReturnValue(of(true));
    const product = makeProduct({ idProducto: 1 });
    component.openDeleteModal(product);
    expect(mockInventoryService.delete).toHaveBeenCalledWith(1);
  });

  it('should call registrarEntrada when dialog returns a result', async () => {
    await setupTestBed();
    const result = { idProducto: 1, cantidad: 5, motivo: 'COMPRA_INSUMOS' };
    mockDialog.open.mockReturnValue(dialogRefStub(result));
    component.openEntradaModal(makeProduct());
    expect(mockInventoryService.registrarEntrada).toHaveBeenCalledWith(1, 5, 'COMPRA_INSUMOS');
  });

  it('should call ajustarInventario when dialog returns a result', async () => {
    await setupTestBed();
    const result = { idProducto: 1, cantidadNueva: 20, motivo: 'AJUSTE_INVENTARIO' };
    mockDialog.open.mockReturnValue(dialogRefStub(result));
    component.openAjusteModal(makeProduct());
    expect(mockInventoryService.ajustarInventario).toHaveBeenCalledWith(1, 20, 'AJUSTE_INVENTARIO');
  });

  it('should trigger pending add stock modal if id is present', async () => {
    await setupTestBed();
    component.pendingAddStockProductId = '1';
    const product = makeProduct({ idProducto: 1 });
    const spy = jest.spyOn(component, 'openEntradaModal').mockImplementation(() => { });
    
    component.productsList = [product];
    (component as any).checkPendingAddStockProduct();
    
    expect(spy).toHaveBeenCalledWith(product);
    expect(component.pendingAddStockProductId).toBeNull();
  });

  it('should handle addStock and search query params', async () => {
    const spy = jest.spyOn(InventarioComponent.prototype, 'openEntradaModal').mockImplementation(() => { });
    await setupTestBed({ addStock: '1', search: 'Test' }, [makeProduct({ idProducto: 1 })]);
    
    expect(spy).toHaveBeenCalled();
    expect(component.searchTerm).toBe('Test');
    spy.mockRestore();
  });

  it('should handle sorting for all columns', async () => {
    await setupTestBed();
    const accessor = component.dataSource.sortingDataAccessor;
    const p = makeProduct({ nombre: 'AAA', tipo: 'INSUMO', cantidadDisponible: 10, porcentajeSobrante: 5 });
    
    expect(accessor(p, 'nombre')).toBe('aaa');
    expect(accessor(p, 'tipo')).toBe('INSUMO');
    expect(accessor(p, 'cantidadDisponible')).toBe(10);
    expect(accessor(p, 'porcentajeSobrante')).toBe(5);
    expect(accessor(p, 'unknown')).toBe('');
  });

  it('should handle errors in registrarEntrada', async () => {
    await setupTestBed();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (mockInventoryService.registrarEntrada as jest.Mock).mockReturnValue(throwError(() => new Error('Err')));
    
    mockDialog.open.mockReturnValue({
      afterClosed: () => of({ idProducto: 1, cantidad: 10, motivo: 'AJUSTE' })
    });
    
    component.openEntradaModal(makeProduct());
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should handle errors in ajustarInventario', async () => {
    await setupTestBed();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (mockInventoryService.ajustarInventario as jest.Mock).mockReturnValue(throwError(() => new Error('Err')));
    
    mockDialog.open.mockReturnValue({
      afterClosed: () => of({ idProducto: 1, cantidadNueva: 5, motivo: 'AJUSTE' })
    });
    
    component.openAjusteModal(makeProduct());
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should handle errors in confirmDelete', async () => {
    await setupTestBed();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (mockInventoryService.delete as jest.Mock).mockReturnValue(throwError(() => new Error('Err')));
    
    component.confirmDelete(makeProduct());
    expect(consoleSpy).toHaveBeenCalled();
    expect(mockUIService.showError).toHaveBeenCalled();
  });

  it('should handle errors in openEditForm', async () => {
    await setupTestBed();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (mockInventoryService.getById as jest.Mock).mockReturnValue(throwError(() => new Error('Err')));
    
    component.openEditForm(makeProduct());
    expect(consoleSpy).toHaveBeenCalled();
    expect(mockUIService.showError).toHaveBeenCalled();
  });

  it('should reload and close form on onSaved', async () => {
    await setupTestBed();
    const loadSpy = jest.spyOn(component, 'loadInventory');
    const closeSpy = jest.spyOn(component, 'closeForm');
    component.onSaved();
    expect(loadSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });
});
