import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { jest } from '@jest/globals';
import { InventarioComponent } from './inventario';
import { InventoryService } from '../core/services/inventory.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ProductDTO, ProductType } from '../core/models/inventory.dto';

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeProduct = (overrides: Partial<ProductDTO> = {}): ProductDTO =>
({
  id: '1',
  name: 'Producto Test',
  type: 'INSUMO' as ProductType,
  stock: 10,
  minStock: 2,
  isLowStock: false,
  unit: { name: 'kg' },
  productionCost: 100,
  purchasePrice: 90,
  salePrice: 150,
  wastePercent: 5,
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

  beforeEach(async () => {
    mockInventoryService = {
      getAll: jest.fn(() => of([])),
      delete: jest.fn(() => of({})),
      create: jest.fn(() => of(1)),
      update: jest.fn(() => of({})),
      registrarEntrada: jest.fn(() => of({})),
      ajustarInventario: jest.fn(() => of({})),
      addComposicion: jest.fn(() => of({})),
    };

    mockDialog = { open: jest.fn(() => dialogRefStub(true)) };

    await TestBed.configureTestingModule({
      imports: [InventarioComponent, BrowserAnimationsModule],
      providers: [
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).overrideProvider(MatDialog, { useValue: mockDialog })
    .compileComponents();

    fixture = TestBed.createComponent(InventarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Creación ──────────────────────────────────────────────────────────────

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialise with list view mode', () => {
    expect(component.viewMode).toBe('list');
  });

  // ── ngOnInit / loadInventory ───────────────────────────────────────────────

  it('should load inventory on init', () => {
    const products = [makeProduct(), makeProduct({ id: '2', name: 'Otro' })];
    (mockInventoryService.getAll as jest.Mock).mockReturnValue(of(products));

    component.loadInventory();

    expect(component.productsData.length).toBe(2);
    expect(component.dataSource.data.length).toBe(2);
  });

  it('should handle error when loading inventory', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    (mockInventoryService.getAll as jest.Mock).mockReturnValue(
      throwError(() => new Error('Network error'))
    );

    component.loadInventory();

    expect(consoleSpy).toHaveBeenCalledWith('Error loading inventory', expect.any(Error));
    consoleSpy.mockRestore();
  });

  // ── getLowStockCount ──────────────────────────────────────────────────────

  it('should count low-stock products', () => {
    component.productsData = [
      makeProduct({ isLowStock: true }),
      makeProduct({ id: '2', isLowStock: false }),
      makeProduct({ id: '3', isLowStock: true }),
    ];
    expect(component.getLowStockCount()).toBe(2);
  });

  it('should return 0 when no low-stock products', () => {
    component.productsData = [makeProduct({ isLowStock: false })];
    expect(component.getLowStockCount()).toBe(0);
  });

  // ── totalInventoryValue ───────────────────────────────────────────────────

  it('should calculate total inventory value using purchasePrice', () => {
    component.productsData = [
      makeProduct({ stock: 5, purchasePrice: 20, productionCost: 0, salePrice: 0 }),
    ];
    expect(component.totalInventoryValue).toBe(100);
  });

  it('should fallback to productionCost when purchasePrice is 0', () => {
    component.productsData = [
      makeProduct({ stock: 3, purchasePrice: 0, productionCost: 10, salePrice: 0 }),
    ];
    expect(component.totalInventoryValue).toBe(30);
  });

  it('should fallback to salePrice as last resort', () => {
    component.productsData = [
      makeProduct({ stock: 2, purchasePrice: 0, productionCost: 0, salePrice: 50 }),
    ];
    expect(component.totalInventoryValue).toBe(100);
  });

  it('should return 0 when all prices are 0', () => {
    component.productsData = [
      makeProduct({ stock: 10, purchasePrice: 0, productionCost: 0, salePrice: 0 }),
    ];
    expect(component.totalInventoryValue).toBe(0);
  });

  // ── Filters ───────────────────────────────────────────────────────────────

  it('should set filter to lowstock', () => {
    component.setFilter('lowstock');
    expect(component.currentFilter).toBe('lowstock');
  });

  it('should set filter to category', () => {
    component.setFilter('category');
    expect(component.currentFilter).toBe('category');
  });

  it('should set filter to all', () => {
    component.currentFilter = 'lowstock';
    component.setFilter('all');
    expect(component.currentFilter).toBe('all');
  });

  it('should reset paginator on filter change', () => {
    const firstPageSpy = jest.fn();
    component.dataSource.paginator = { firstPage: firstPageSpy, page: of() } as any;
    component.setFilter('all');
    expect(firstPageSpy).toHaveBeenCalled();
  });

  it('should trigger filter on search change', () => {
    component.searchTerm = 'test';
    component.onSearchChange();
    expect(component.dataSource.filter).toContain('test');
  });

  // ── handleTypeChange ──────────────────────────────────────────────────────

  it('should disable salePrice and enable wastePercent for INSUMO', () => {
    component.handleTypeChange('INSUMO');
    expect(component.inventoryForm.get('salePrice')?.disabled).toBe(true);
    expect(component.inventoryForm.get('wastePercent')?.disabled).toBe(false);
  });

  it('should enable salePrice and disable wastePercent for ELABORADO', () => {
    component.handleTypeChange('ELABORADO');
    expect(component.inventoryForm.get('salePrice')?.disabled).toBe(false);
    expect(component.inventoryForm.get('wastePercent')?.disabled).toBe(true);
  });

  it('should enable salePrice and disable wastePercent for TRANSFORMADO', () => {
    component.handleTypeChange('TRANSFORMADO');
    expect(component.inventoryForm.get('salePrice')?.disabled).toBe(false);
    expect(component.inventoryForm.get('wastePercent')?.disabled).toBe(true);
  });

  it('should enable both salePrice and wastePercent for other types', () => {
    component.handleTypeChange('PRODUCTO' as ProductType);
    expect(component.inventoryForm.get('salePrice')?.disabled).toBe(false);
    expect(component.inventoryForm.get('wastePercent')?.disabled).toBe(false);
  });

  it('should clear componentsFormArray on type change', () => {
    component.addComponent();
    component.addComponent();
    component.handleTypeChange('INSUMO');
    expect(component.componentsFormArray.length).toBe(0);
  });

  // ── addComponent / removeComponent ───────────────────────────────────────

  it('should add a component with default values', () => {
    component.addComponent();
    expect(component.componentsFormArray.length).toBe(1);
    expect(component.componentsFormArray.at(0).get('cantidadUsada')?.value).toBe(1);
  });

  it('should remove a component by index', () => {
    component.addComponent();
    component.addComponent();
    component.removeComponent(0);
    expect(component.componentsFormArray.length).toBe(1);
  });

  // ── openAddForm ───────────────────────────────────────────────────────────

  it('should switch to add view mode', () => {
    component.openAddForm();
    expect(component.viewMode).toBe('add');
  });

  it('should clear composition array on openAddForm', () => {
    component.addComponent();
    component.openAddForm();
    expect(component.componentsFormArray.length).toBe(0);
  });

  it('should clear error message on openAddForm', () => {
    component.errorMessage = 'Some error';
    component.openAddForm();
    expect(component.errorMessage).toBeNull();
  });

  // ── openEditForm ──────────────────────────────────────────────────────────

  it('should switch to edit view mode', () => {
    component.openEditForm(makeProduct());
    expect(component.viewMode).toBe('edit');
  });

  it('should patch form values on openEditForm', () => {
    const product = makeProduct({ name: 'Mi Producto', stock: 25, minStock: 5 });
    component.openEditForm(product);
    expect(component.inventoryForm.get('name')?.value).toBe('Mi Producto');
    expect(component.inventoryForm.get('minStock')?.value).toBe(5);
  });

  it('should not add composition when composition is empty', () => {
    const product = makeProduct({ type: 'ELABORADO', composition: [] });
    component.openEditForm(product as any);
    expect(component.componentsFormArray.length).toBe(0);
  });

  it('should use productionCost when purchasePrice is missing', () => {
    const product = makeProduct({ productionCost: 99, purchasePrice: undefined });
    component.openEditForm(product as any);
    expect(component.inventoryForm.get('productionCost')?.value).toBe(99);
  });

  // ── closeForm ─────────────────────────────────────────────────────────────

  it('should switch back to list view mode on closeForm', () => {
    component.viewMode = 'edit';
    component.closeForm();
    expect(component.viewMode).toBe('list');
  });

  // ── saveProduct — validación ───────────────────────────────────────────────

  it('should mark form as touched and not submit if invalid', () => {
    component.openAddForm();
    component.inventoryForm.get('name')?.setValue('');
    component.saveProduct();
    expect(mockInventoryService.create).not.toHaveBeenCalled();
  });

  // ── saveProduct — crear ───────────────────────────────────────────────────

  it('should call create when viewMode is add and form is valid', () => {
    component.openAddForm();
    component.inventoryForm.patchValue({
      name: 'Nuevo',
      type: 'INSUMO',
      unit: 'kg',
      minStock: 1,
    });
    component.saveProduct();
    expect(mockInventoryService.create).toHaveBeenCalled();
  });

  it('should call addComposicion after create when product has composition', () => {
    (mockInventoryService.create as jest.Mock).mockReturnValue(of(5));
    component.openAddForm();
    component.inventoryForm.patchValue({
      name: 'Elaborado',
      type: 'ELABORADO',
      unit: 'u',
      minStock: 1,
    });
    component.addComponent();
    component.componentsFormArray.at(0).patchValue({ idInsumo: 2, cantidadUsada: 1 });

    component.saveProduct();

    expect(mockInventoryService.addComposicion).toHaveBeenCalledWith(5, [
      { idInsumo: 2, cantidadUsada: 1 },
    ]);
  });

  it('should NOT call addComposicion when id is 0', () => {
    (mockInventoryService.create as jest.Mock).mockReturnValue(of(0));
    component.openAddForm();
    component.inventoryForm.patchValue({
      name: 'Elaborado',
      type: 'ELABORADO',
      unit: 'u',
      minStock: 1,
    });
    component.addComponent();
    component.componentsFormArray.at(0).patchValue({ idInsumo: 2, cantidadUsada: 1 });

    component.saveProduct();

    expect(mockInventoryService.addComposicion).not.toHaveBeenCalled();
  });

  it('should log error when create fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    (mockInventoryService.create as jest.Mock).mockReturnValue(
      throwError(() => new Error('Create failed'))
    );
    component.openAddForm();
    component.inventoryForm.patchValue({ name: 'X', type: 'INSUMO', unit: 'kg', minStock: 1 });
    component.saveProduct();

    expect(component.errorMessage).toBeTruthy();
    consoleSpy.mockRestore();
  });

  it('should log error when addComposicion fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    (mockInventoryService.create as jest.Mock).mockReturnValue(of(5));
    (mockInventoryService.addComposicion as jest.Mock).mockReturnValue(
      throwError(() => new Error('Composicion failed'))
    );
    component.openAddForm();
    component.inventoryForm.patchValue({ name: 'E', type: 'ELABORADO', unit: 'u', minStock: 1 });
    component.addComponent();
    component.componentsFormArray.at(0).patchValue({ idInsumo: 1, cantidadUsada: 1 });
    component.saveProduct();

    expect(consoleSpy).toHaveBeenCalledWith('Error guardando composición', expect.any(Error));
    consoleSpy.mockRestore();
  });

  // ── saveProduct — editar ──────────────────────────────────────────────────

  it('should call update when viewMode is edit and form is valid', () => {
    const product = makeProduct();
    component.openEditForm(product);
    component.inventoryForm.enable();
    component.inventoryForm.patchValue({ name: 'Editado', type: 'INSUMO', unit: 'kg', minStock: 1 });
    component.saveProduct();
    expect(mockInventoryService.update).toHaveBeenCalled();
  });

  it('should show error when update fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    (mockInventoryService.update as jest.Mock).mockReturnValue(
      throwError(() => new Error('Update failed'))
    );
    const product = makeProduct();
    component.openEditForm(product);
    component.inventoryForm.enable();
    component.inventoryForm.patchValue({ name: 'E', type: 'INSUMO', unit: 'kg', minStock: 1 });
    component.saveProduct();

    expect(component.errorMessage).toBeTruthy();
    consoleSpy.mockRestore();
  });

  // ── saveProduct — success dialog actions ─────────────────────────────────

  it('should call openAddForm again when secondary action is chosen after create', () => {
    mockDialog.open
      .mockReturnValueOnce(dialogRefStub({ action: 'secondary' })); // SuccessDialog
    const openAddSpy = jest.spyOn(component, 'openAddForm');

    component.openAddForm();
    component.inventoryForm.patchValue({ name: 'N', type: 'INSUMO', unit: 'kg', minStock: 1 });
    component.saveProduct();

    expect(openAddSpy).toHaveBeenCalledTimes(2); // once explicitly + once from dialog
  });

  it('should go to list when dialog closes with primary action', () => {
    mockDialog.open.mockReturnValue(dialogRefStub({ action: 'primary' }));
    component.openAddForm();
    component.inventoryForm.patchValue({ name: 'N', type: 'INSUMO', unit: 'kg', minStock: 1 });
    component.saveProduct();
    expect(component.viewMode).toBe('list');
  });

  it('should go to list when dialog closes with close action', () => {
    mockDialog.open.mockReturnValue(dialogRefStub({ action: 'close' }));
    component.openAddForm();
    component.inventoryForm.patchValue({ name: 'N', type: 'INSUMO', unit: 'kg', minStock: 1 });
    component.saveProduct();
    expect(component.viewMode).toBe('list');
  });

  // ── openDeleteModal ───────────────────────────────────────────────────────

  it('should call delete service when confirmed', () => {
    mockDialog.open.mockReturnValue(dialogRefStub(true));
    component.openDeleteModal(makeProduct());
    expect(mockInventoryService.delete).toHaveBeenCalledWith('1');
  });

  it('should NOT call delete service when dialog is cancelled', () => {
    mockDialog.open.mockReturnValue(dialogRefStub(false));
    component.openDeleteModal(makeProduct());
    expect(mockInventoryService.delete).not.toHaveBeenCalled();
  });

  it('should set errorMessage when delete fails', () => {
    mockDialog.open.mockReturnValue(dialogRefStub(true));
    (mockInventoryService.delete as jest.Mock).mockReturnValue(
      throwError(() => new Error('Delete failed'))
    );
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    component.openDeleteModal(makeProduct());
    expect(component.errorMessage).toBeTruthy();
    consoleSpy.mockRestore();
  });

  it('should clear errorMessage at the start of openDeleteModal', () => {
    component.errorMessage = 'old error';
    mockDialog.open.mockReturnValue(dialogRefStub(false));
    component.openDeleteModal(makeProduct());
    expect(component.errorMessage).toBeNull();
  });

  // ── openEntradaModal ──────────────────────────────────────────────────────

  it('should call registrarEntrada when dialog returns a result', () => {
    const result = { idProducto: '1', cantidad: 5, motivo: 'COMPRA_INSUMOS' };
    mockDialog.open.mockReturnValue(dialogRefStub(result));
    component.openEntradaModal(makeProduct());
    expect(mockInventoryService.registrarEntrada).toHaveBeenCalledWith('1', 5, 'COMPRA_INSUMOS');
  });

  it('should NOT call registrarEntrada when entrada dialog is cancelled', () => {
    mockDialog.open.mockReturnValue(dialogRefStub(null));
    component.openEntradaModal(makeProduct());
    expect(mockInventoryService.registrarEntrada).not.toHaveBeenCalled();
  });

  it('should log error when registrarEntrada fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const result = { idProducto: '1', cantidad: 5, motivo: 'CONSUMO' };
    mockDialog.open.mockReturnValue(dialogRefStub(result));
    (mockInventoryService.registrarEntrada as jest.Mock).mockReturnValue(
      throwError(() => new Error('Entrada failed'))
    );
    component.openEntradaModal(makeProduct());
    expect(consoleSpy).toHaveBeenCalledWith('Error registrando entrada', expect.any(Error));
    consoleSpy.mockRestore();
  });

  // ── openAjusteModal ───────────────────────────────────────────────────────

  it('should call ajustarInventario when dialog returns a result', () => {
    const result = { idProducto: '1', cantidadNueva: 20, motivo: 'AJUSTE_INVENTARIO' };
    mockDialog.open.mockReturnValue(dialogRefStub(result));
    component.openAjusteModal(makeProduct());
    expect(mockInventoryService.ajustarInventario).toHaveBeenCalledWith('1', 20, 'AJUSTE_INVENTARIO');
  });

  it('should NOT call ajustarInventario when ajuste dialog is cancelled', () => {
    mockDialog.open.mockReturnValue(dialogRefStub(null));
    component.openAjusteModal(makeProduct());
    expect(mockInventoryService.ajustarInventario).not.toHaveBeenCalled();
  });

  it('should log error when ajustarInventario fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    const result = { idProducto: '1', cantidadNueva: 20, motivo: 'AJUSTE_INVENTARIO' };
    mockDialog.open.mockReturnValue(dialogRefStub(result));
    (mockInventoryService.ajustarInventario as jest.Mock).mockReturnValue(
      throwError(() => new Error('Ajuste failed'))
    );
    component.openAjusteModal(makeProduct());
    expect(consoleSpy).toHaveBeenCalledWith('Error ajustando inventario', expect.any(Error));
    consoleSpy.mockRestore();
  });

  // ── filterPredicate ───────────────────────────────────────────────────────

  it('filterPredicate should match by name', () => {
    component['_applyTableFilter']();
    const predicate = component.dataSource.filterPredicate;
    const product = makeProduct({ name: 'Harina', id: 'abc', isLowStock: false, type: 'INSUMO' });
    component.currentFilter = 'all';
    component.searchTerm = 'harina';
    component['_applyTableFilter']();
    const result = predicate(product, component.dataSource.filter);
    expect(result).toBe(true);
  });

  it('filterPredicate should match by id', () => {
    const predicate = component.dataSource.filterPredicate;
    const product = makeProduct({ name: 'X', id: 'abc123', isLowStock: false, type: 'INSUMO' });
    component.currentFilter = 'all';
    component.searchTerm = 'abc123';
    component['_applyTableFilter']();
    expect(predicate(product, component.dataSource.filter)).toBe(true);
  });

  it('filterPredicate should filter by lowstock', () => {
    const predicate = component.dataSource.filterPredicate;
    component.currentFilter = 'lowstock';
    component.searchTerm = '';
    component['_applyTableFilter']();

    const lowProduct = makeProduct({ isLowStock: true });
    const normalProduct = makeProduct({ id: '2', isLowStock: false });

    expect(predicate(lowProduct, component.dataSource.filter)).toBe(true);
    expect(predicate(normalProduct, component.dataSource.filter)).toBe(false);
  });

  it('filterPredicate should filter by category', () => {
    const predicate = component.dataSource.filterPredicate;
    component.currentFilter = 'category';
    component.selectedCategory = 'INSUMO';
    component.searchTerm = '';
    component['_applyTableFilter']();

    const insumo = makeProduct({ type: 'INSUMO' });
    const elaborado = makeProduct({ id: '2', type: 'ELABORADO' as ProductType });

    expect(predicate(insumo, component.dataSource.filter)).toBe(true);
    expect(predicate(elaborado, component.dataSource.filter)).toBe(false);
  });

  it('filterPredicate should pass all when category filter has no selectedCategory', () => {
    const predicate = component.dataSource.filterPredicate;
    component.currentFilter = 'category';
    component.selectedCategory = '';
    component.searchTerm = '';
    component['_applyTableFilter']();
    const product = makeProduct({ type: 'ELABORADO' as ProductType });
    expect(predicate(product, component.dataSource.filter)).toBe(true);
  });

  // ── ngAfterViewInit sortingDataAccessor ───────────────────────────────────

  it('sortingDataAccessor should return lowercase name', () => {
    fixture.detectChanges();
    const accessor = component.dataSource.sortingDataAccessor;
    const product = makeProduct({ name: 'HARINA', type: 'INSUMO', stock: 5 });
    expect(accessor(product, 'name')).toBe('harina');
  });

  it('sortingDataAccessor should return type', () => {
    const accessor = component.dataSource.sortingDataAccessor;
    const product = makeProduct({ type: 'INSUMO' });
    expect(accessor(product, 'type')).toBe('INSUMO');
  });

  it('sortingDataAccessor should return stock', () => {
    const accessor = component.dataSource.sortingDataAccessor;
    const product = makeProduct({ stock: 42 });
    expect(accessor(product, 'stock')).toBe(42);
  });

  it('sortingDataAccessor should return empty string for unknown property', () => {
    const accessor = component.dataSource.sortingDataAccessor;
    const product = makeProduct();
    expect(accessor(product, 'nonexistent')).toBe('');
  });
});