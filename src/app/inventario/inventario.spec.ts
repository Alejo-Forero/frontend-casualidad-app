import { InventoryService } from '../core/services/inventory.service';
import { of, throwError } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventarioComponent } from './inventario';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { jest } from '@jest/globals';

const mockProduct = { 
  id: '1', idProducto: 1, name: 'A', type: 'INSUMO', 
  unit: { name: 'U' }, stock: 10, minStock: 1, isLowStock: false,
  purchasePrice: 10
} as any;

describe('InventarioComponent', () => {
  let component: InventarioComponent;
  let fixture: ComponentFixture<InventarioComponent>;
  let mockInventoryService: any;
  let mockDialog: any;

  beforeEach(async () => {
    mockInventoryService = {
      getAll: jest.fn(() => of([mockProduct, { id: '2', idProducto: 2, name: 'B', type: 'PRODUCCION', isLowStock: true, unit: {name:'U'} }])),
      delete: jest.fn(() => of({})),
      create: jest.fn(() => of(1)),
      update: jest.fn(() => of({})),
      registrarEntrada: jest.fn(() => of({})),
      ajustarInventario: jest.fn(() => of({}))
    };
    mockDialog = { open: jest.fn(() => ({ afterClosed: () => of({ action: 'primary' }) })) };

    await TestBed.configureTestingModule({
      providers: [
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: MatDialog, useValue: mockDialog }
      ],
      imports: [InventarioComponent, BrowserAnimationsModule],
    })
    .overrideProvider(MatDialog, { useValue: mockDialog })
    .compileComponents();

    fixture = TestBed.createComponent(InventarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should handle all filter combinations', () => {
    const predicate = component.dataSource.filterPredicate;
    
    // 1. Search + All
    component.currentFilter = 'all';
    expect(predicate(mockProduct, 'a')).toBe(true);
    expect(predicate(mockProduct, 'x')).toBe(false);

    // 2. Low Stock
    component.currentFilter = 'lowstock';
    expect(predicate(mockProduct, 'a')).toBe(false);
    expect(predicate({ ...mockProduct, isLowStock: true } as any, 'a')).toBe(true);

    // 3. Category
    component.currentFilter = 'category';
    component.selectedCategory = 'INSUMO';
    expect(predicate(mockProduct, 'a')).toBe(true);
    component.selectedCategory = 'PRODUCCION';
    expect(predicate(mockProduct, 'a')).toBe(false);
  });

  it('should handle composition and save', () => {
    component.openAddForm();
    component.addItem();
    component.removeItem(0);
    component.inventoryForm.patchValue({ name: 'N', type: 'INSUMO', unit: 'U', minStock: 1 });
    component.saveProduct();
    expect(mockInventoryService.create).toHaveBeenCalled();
  });
});
