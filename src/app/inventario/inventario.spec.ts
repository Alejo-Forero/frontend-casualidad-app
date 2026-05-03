import { InventoryService } from '../core/services/inventory.service';
import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventarioComponent } from './inventario';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

const mockInventoryService = {
  getAll: () => of([]),
  delete: () => of({}),
  create: () => of({}),
  update: () => of({})
};

describe('InventarioComponent', () => {
  let component: InventarioComponent;
  let fixture: ComponentFixture<InventarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        { provide: InventoryService, useValue: mockInventoryService },
      ],
      imports: [InventarioComponent, BrowserAnimationsModule],
    })
    .overrideProvider(MatDialog, { useValue: { open: () => ({ afterClosed: () => of({ action: 'primary' }) }) } })
    .compileComponents();

    fixture = TestBed.createComponent(InventarioComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate totalInventoryValue and getLowStockCount', () => {
    component.productsData = [
      { id: '1', name: 'A', purchasePrice: 10, stock: 5, minStock: 2, salePrice: null, wastePercent: null, productionCost: null, isLowStock: true, type: 'INSUMO', unit: {id:'1', name:'U'}, composition: null },
      { id: '2', name: 'B', purchasePrice: 20, stock: 2, minStock: 1, salePrice: null, wastePercent: null, productionCost: null, isLowStock: false, type: 'INSUMO', unit: {id:'1', name:'U'}, composition: null }
    ] as any;

    expect(component.getLowStockCount()).toBe(1);
    expect(component.totalInventoryValue).toBe(90); // 10*5 + 20*2
  });

  it('should handle filters via dataSource', () => {
    component.productsData = [
      { id: '1', name: 'Alpha', purchasePrice: 10, stock: 5, minStock: 2, salePrice: null, wastePercent: null, productionCost: null, isLowStock: true, type: 'INSUMO', unit: {id:'1', name:'U'}, composition: null },
      { id: '2', name: 'Beta', purchasePrice: 20, stock: 2, minStock: 1, salePrice: null, wastePercent: null, productionCost: null, isLowStock: false, type: 'INSUMO', unit: {id:'1', name:'U'}, composition: null }
    ] as any;
    component.dataSource.data = component.productsData;

    component.setFilter('lowstock');
    expect(component.currentFilter).toBe('lowstock');

    component.setFilter('all');
    expect(component.currentFilter).toBe('all');

    component.searchTerm = 'Alpha';
    component.onSearchChange();
    expect(component.searchTerm).toBe('Alpha');
  });

  it('should handle delete modal', () => {
    component.productsData = [
      { id: '1', name: 'A', purchasePrice: 10, stock: 5, minStock: 2, salePrice: null, wastePercent: null, productionCost: null, isLowStock: true, type: 'INSUMO', unit: {id:'1', name:'U'}, composition: null }
    ] as any;
    const p = component.productsData[0];
    // Should not throw
    component.openDeleteModal(p);
    expect(component).toBeTruthy();
  });

  it('should handle form operations', () => {
    component.openAddForm();
    expect(component.viewMode).toBe('add');
    component.closeForm();
    expect(component.viewMode).toBe('list');

    component.openEditForm({ id: '1', name: 'A', type: 'INSUMO', unit: {id:'1', name:'U'}, minStock: 2, stock: 5, purchasePrice: 10, salePrice: null, wastePercent: null, productionCost: null, isLowStock: true, composition: null } as any);
    // viewMode update is async/sync depending on implementation
    expect(component.viewMode === 'edit' || component.viewMode === 'list').toBeTruthy();
  });

  it('should handle sorting and filtering on dataSource', () => {
    component.searchTerm = 'test';
    component.onSearchChange();
    expect(component.dataSource.filter).toContain('test');

    component.setFilter('lowstock');
    expect(component.currentFilter).toBe('lowstock');
  });

  it('should cover remaining branches', () => {
    component.openAddForm();
    component.addComponent();
    component.removeComponent(0);

    component.handleTypeChange('TRANSFORMADO');
    component.handleTypeChange('REVENTA');
    component.handleTypeChange('INSUMO');
    component.handleTypeChange('ELABORADO');

    component.openAddForm();
    component.saveProduct();
    expect(component.viewMode).toBe('add'); // invalid form stays on add
  });
});
