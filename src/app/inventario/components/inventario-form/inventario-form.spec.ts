import { ComponentFixture, TestBed } from '@angular/core/testing';
import { jest } from '@jest/globals';
import { InventarioFormComponent } from './inventario-form';
import { InventoryService } from '../../../core/services/inventory.service';
import { UIService } from '../../../core/services/ui.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ProductDTO, ProductType } from '../../../core/models/inventory.dto';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

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

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('InventarioFormComponent', () => {
  let component: InventarioFormComponent;
  let fixture: ComponentFixture<InventarioFormComponent>;
  let mockInventoryService: jest.Mocked<Partial<InventoryService>>;
  let mockUIService: { showSuccess: jest.Mock, showConfirm: jest.Mock, showError: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });

    mockInventoryService = {
      getById: jest.fn(() => of(makeProduct())),
      create: jest.fn(() => of(1)),
      update: jest.fn(() => of({})),
      addComposicion: jest.fn(() => of({})),
      getUnidadesMedida: jest.fn(() => of([]))
    };

    mockUIService = {
      showSuccess: jest.fn(() => of({ action: 'primary' })),
      showConfirm: jest.fn(() => of(true)),
      showError: jest.fn(() => of(true))
    };

    await TestBed.configureTestingModule({
      imports: [InventarioFormComponent, BrowserAnimationsModule, ReactiveFormsModule, FormsModule],
      providers: [
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: UIService, useValue: mockUIService }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventarioFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable purchasePrice and wastePercent for ELABORADO', () => {
    component.inventoryForm.get('type')?.setValue('ELABORADO');
    expect(component.inventoryForm.get('purchasePrice')?.disabled).toBe(true);
    expect(component.inventoryForm.get('wastePercent')?.disabled).toBe(true);
  });

  it('should enable purchasePrice and wastePercent for INSUMO', () => {
    component.inventoryForm.get('type')?.setValue('INSUMO');
    expect(component.inventoryForm.get('purchasePrice')?.enabled).toBe(true);
    expect(component.inventoryForm.get('wastePercent')?.enabled).toBe(true);
  });

  it('should add a component when addComponent is called', () => {
    const insumo = makeProduct({ idProducto: 2, nombre: 'Insumo 1', precioCompra: 10, cantidadDisponible: 100 });
    (mockInventoryService.getById as jest.Mock).mockReturnValue(of(insumo));
    
    component.selectedInsumoId = 2;
    component.addComponent();
    
    expect(component.componentsFormArray.length).toBe(1);
    expect(component.componentsFormArray.at(0).get('idInsumo')?.value).toBe(2);
  });

  it('should remove a component', () => {
    const insumo = makeProduct({ idProducto: 2 });
    (mockInventoryService.getById as jest.Mock).mockReturnValue(of(insumo));
    component.selectedInsumoId = 2;
    component.addComponent();
    
    component.removeComponent(0);
    expect(component.componentsFormArray.length).toBe(0);
  });

  it('should call create on submit when mode is add', () => {
    component.mode = 'add';
    component.inventoryForm.patchValue({
      name: 'Nuevo',
      type: 'INSUMO',
      unit: 'kg',
      stock: 10,
      minStock: 2,
      purchasePrice: 100
    });
    
    component.onSubmit();
    expect(mockInventoryService.create).toHaveBeenCalled();
    expect(mockInventoryService.update).not.toHaveBeenCalled();
  });

  it('should call update on submit when mode is edit', () => {
    component.mode = 'edit';
    component.product = makeProduct({ idProducto: 1 });
    component.inventoryForm.patchValue({
      id: 1,
      name: 'Editado',
      type: 'INSUMO',
      unit: 'kg',
      minStock: 2,
      purchasePrice: 100
    });
    
    component.onSubmit();
    expect(mockInventoryService.update).toHaveBeenCalled();
    expect(mockInventoryService.create).not.toHaveBeenCalled();
  });

  it('should show error when submit fails', () => {
    (mockInventoryService.create as jest.Mock).mockReturnValue(throwError(() => new Error('Fail')));
    component.mode = 'add';
    component.inventoryForm.patchValue({
      name: 'Nuevo',
      type: 'INSUMO',
      unit: 'kg',
      stock: 10,
      minStock: 2,
      purchasePrice: 100
    });
    
    component.onSubmit();
    expect(component.errorMessage).toBeTruthy();
  });

  it('should populate form when product input changes', () => {
    const product = makeProduct({ nombre: 'Prueba Pop' });
    component.product = product;
    component.ngOnChanges({
      product: {
        currentValue: product,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    
    expect(component.inventoryForm.get('name')?.value).toBe('Prueba Pop');
  });

  it('should cap wastePercent at 100', () => {
    component.inventoryForm.get('wastePercent')?.setValue(150);
    expect(component.inventoryForm.get('wastePercent')?.value).toBe(100);
  });

  it('should reset form when mode changes to add', () => {
    component.inventoryForm.patchValue({ name: 'Trash' });
    component.ngOnChanges({
      mode: {
        currentValue: 'add',
        previousValue: 'edit',
        firstChange: false,
        isFirstChange: () => false
      }
    });
    expect(component.inventoryForm.get('name')?.value).toBe(null);
  });

  it('should calculate total cost when allProducts change', () => {
    component.allProducts = [makeProduct({ idProducto: 10, precioCompra: 50 })];
    component.componentsFormArray.push(component['fb'].group({
      idInsumo: [10],
      cantidadUsada: [2],
      precioUnidad: [50]
    }));
    
    component.ngOnChanges({
      allProducts: {
        currentValue: component.allProducts,
        previousValue: [],
        firstChange: false,
        isFirstChange: () => false
      }
    });
    
    expect(component.inventoryForm.get('productionCost')?.value).toBe(100);
  });

  it('should detect duplicate insumos', () => {
    const group1 = component['fb'].group({ idInsumo: [1] });
    const group2 = component['fb'].group({ idInsumo: [1] });
    component.componentsFormArray.push(group1);
    component.componentsFormArray.push(group2);

    const validator = component['uniqueInsumoValidator']();
    expect(validator(group2)).toEqual({ duplicateInsumo: true });
    expect(validator(group1)).toEqual({ duplicateInsumo: true });
  });

  it('should detect when quantity exceeds available stock', () => {
    component.allProducts = [makeProduct({ idProducto: 10, cantidadDisponible: 5 })];
    const group = component['fb'].group({
      idInsumo: [10],
      cantidadUsada: [10]
    });
    
    const validator = component['stockLimitValidator']();
    expect(validator(group)).toEqual({ exceedStock: true });
  });

  it('should show error if adding an existing insumo', () => {
    component.componentsFormArray.push(component['fb'].group({ idInsumo: [10] }));
    component.selectedInsumoId = 10;
    component.addComponent();
    expect(mockUIService.showError).toHaveBeenCalledWith(expect.stringContaining('ya se encuentra'), expect.anything());
  });

  it('should show error if adding insumo with zero stock', () => {
    const zeroStockInsumo = makeProduct({ idProducto: 20, cantidadDisponible: 0 });
    (mockInventoryService.getById as jest.Mock).mockReturnValue(of(zeroStockInsumo));
    
    component.selectedInsumoId = 20;
    component.addComponent();
    expect(mockUIService.showError).toHaveBeenCalledWith(expect.stringContaining('no tiene stock'), expect.anything());
  });

  it('should filter insumos correctly', () => {
    component.allProducts = [
      makeProduct({ idProducto: 1, nombre: 'Tela', tipo: 'INSUMO' }),
      makeProduct({ idProducto: 2, nombre: 'Botón', tipo: 'INSUMO' }),
      makeProduct({ idProducto: 3, nombre: 'Proceso', tipo: 'ELABORADO' })
    ];
    
    const results = component.getFilteredInsumos('tel');
    expect(results.length).toBe(1);
    expect(results[0].nombre).toBe('Tela');
  });

  it('should return empty string for non-existent insumo name', () => {
    component.allProducts = [];
    expect(component.getInsumoName(999)).toBe('');
  });

  it('should return default unit if insumo not found', () => {
    component.allProducts = [];
    expect(component.getInsumoUnit(999)).toBe('Und');
  });

  it('should mark form as touched if invalid on submit', () => {
    component.inventoryForm.get('name')?.setValue(''); // Required
    component.onSubmit();
    expect(component.inventoryForm.get('name')?.touched).toBe(true);
  });

  it('should handle composition saving on submit', () => {
    component.mode = 'add';
    component.inventoryForm.patchValue({
      name: 'Prod Comp',
      type: 'ELABORADO',
      unit: 'Und',
      minStock: 1,
      stock: 10,
      salePrice: 100
    });
    component.componentsFormArray.push(component['fb'].group({
      idInsumo: [5],
      cantidadUsada: [1]
    }));
    
    (mockInventoryService.create as jest.Mock).mockReturnValue(of(100));
    
    component.onSubmit();
    expect(mockInventoryService.addComposicion).toHaveBeenCalledWith(100, expect.any(Array));
  });

  it('should use newUnitName if unit is NEW_UNIT', () => {
    component.mode = 'add';
    component.inventoryForm.patchValue({
      name: 'Prod Unit',
      type: 'INSUMO',
      unit: 'NEW_UNIT',
      newUnitName: 'Metros',
      stock: 10,
      minStock: 1,
      salePrice: 100,
      purchasePrice: 50,
      wastePercent: 0
    });
    
    component.onSubmit();
    // Reviso el payload enviado a create
    const call = (mockInventoryService.create as jest.Mock).mock.calls[0][0] as any;
    expect(call.unidadMedida).toBe('Metros');
  });

  it('should emit formClose on onCancel', () => {
    const spy = jest.spyOn(component.formClose, 'emit');
    component.onCancel();
    expect(spy).toHaveBeenCalled();
  });
});
