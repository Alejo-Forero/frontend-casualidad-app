import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventarioComponent } from './inventario';

describe('InventarioComponent', () => {
  let component: InventarioComponent;
  let fixture: ComponentFixture<InventarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventarioComponent],
    }).compileComponents();

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
    ];
    
    expect(component.getLowStockCount()).toBe(1);
    expect(component.totalInventoryValue).toBe(90); // 10*5 + 20*2
  });

  it('should handle filters and pagination', () => {
    component.productsData = [
      { id: '1', name: 'A', purchasePrice: 10, stock: 5, minStock: 2, salePrice: null, wastePercent: null, productionCost: null, isLowStock: true, type: 'INSUMO', unit: {id:'1', name:'U'}, composition: null },
      { id: '2', name: 'B', purchasePrice: 20, stock: 2, minStock: 1, salePrice: null, wastePercent: null, productionCost: null, isLowStock: false, type: 'INSUMO', unit: {id:'1', name:'U'}, composition: null }
    ];
    component.setFilter('lowstock');
    expect(component.filteredProducts.length).toBe(1);
    
    component.setFilter('all');
    component.searchTerm = 'B';
    component.onSearchChange();
    expect(component.filteredProducts[0].name).toBe('B');
  });

  it('should handle delete modal and confirm', () => {
    component.productsData = [
      { id: '1', name: 'A', purchasePrice: 10, stock: 5, minStock: 2, salePrice: null, wastePercent: null, productionCost: null, isLowStock: true, type: 'INSUMO', unit: {id:'1', name:'U'}, composition: null }
    ];
    const p = component.productsData[0];
    component.openDeleteModal(p);
    expect(component.showDeleteModal).toBe(true);
    
    component.confirmDelete();
    expect(component.productsData.length).toBe(0);
    expect(component.showSuccessModal).toBe(true);
    
    component.closeSuccessModal();
    expect(component.showSuccessModal).toBe(false);
  });
});
