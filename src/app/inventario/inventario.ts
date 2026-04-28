import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { PaginationComponent } from '../shared/pagination/pagination';
import { ProductDTO, ProductType } from '../core/models/inventory.dto';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './inventario.html',
  styleUrls: ['./inventario.css']
})
export class InventarioComponent implements OnInit {
  productsData: ProductDTO[] = [];

  filteredProducts: ProductDTO[] = [];
  paginatedProducts: ProductDTO[] = [];

  searchTerm = '';
  currentFilter: 'all' | 'lowstock' | 'category' = 'all';
  selectedCategory: ProductType | '' = ''; // For future use if category filter is expanded

  currentPage = 1;
  pageSize = 5;

  currentSort = { column: '', direction: 'asc' as 'asc' | 'desc' };

  // Modals state
  showDeleteModal = false;
  showSuccessModal = false;
  selectedProduct: ProductDTO | null = null;

  // Forms state
  viewMode: 'list' | 'add' | 'edit' = 'list';
  inventoryForm: FormGroup;
  showFormSuccessModal = false;

  private readonly fb = inject(FormBuilder);

  constructor() {
    this.inventoryForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      stock: [0, [Validators.required, Validators.min(0)]],
      type: ['', Validators.required],
      unit: ['', Validators.required],
      minStock: [0, [Validators.min(0)]],
      productionCost: [0], // or purchasePrice for insumo/reventa
      salePrice: [0],
      wastePercent: [0, [Validators.min(0), Validators.max(100)]],
      components: this.fb.array([])
    });

    this.inventoryForm.get('type')?.valueChanges.subscribe(type => {
      this.handleTypeChange(type);
    });
  }

  get componentsFormArray(): FormArray {
    return this.inventoryForm.get('components') as FormArray;
  }

  handleTypeChange(type: ProductType | '') {
    // Clear components when changing type to avoid lingering data
    this.componentsFormArray.clear();
    
    // Default form control statuses based on original logic
    const salePriceCtrl = this.inventoryForm.get('salePrice');
    const wasteCtrl = this.inventoryForm.get('wastePercent');
    
    if (type === 'INSUMO') {
      salePriceCtrl?.disable();
      wasteCtrl?.enable();
    } else {
      salePriceCtrl?.enable();
      if (type === 'ELABORADO' || type === 'TRANSFORMADO') {
        wasteCtrl?.disable();
        // Here we could add a default component if required, 
        // but we'll let the user manually add components
      } else {
        wasteCtrl?.enable(); // REVENTA
      }
    }
  }

  addComponent() {
    this.componentsFormArray.push(this.fb.group({
      inventoryId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unitCost: [0],
      subtotal: [0]
    }));
  }

  removeComponent(index: number) {
    this.componentsFormArray.removeAt(index);
  }

  ngOnInit() {
    this.applyFilters();
  }

  setFilter(filter: 'all' | 'lowstock' | 'category') {
    this.currentFilter = filter;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.applyFilters();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.applyFilters();
  }

  private applyFilters() {
    let result = this.productsData;

    // 1. Appy Tab Filters
    if (this.currentFilter === 'lowstock') {
      result = result.filter(p => p.isLowStock);
    } else if (this.currentFilter === 'category' && this.selectedCategory) {
      result = result.filter(p => p.type === this.selectedCategory);
    }

    // 2. Apply Search
    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term)
      );
    }

    // Sort
    if (this.currentSort.column) {
      result.sort((a, b) => {
        const valA = (a as any)[this.currentSort.column];
        const valB = (b as any)[this.currentSort.column];
        if (valA < valB) return this.currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return this.currentSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    this.filteredProducts = result;

    // 3. Paginate
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedProducts = this.filteredProducts.slice(start, end);

    // Failsafe
    if (this.paginatedProducts.length === 0 && this.currentPage > 1) {
        this.currentPage = 1;
        this.applyFilters();
    }
  }

  handleSort(column: string) {
    if (this.currentSort.column === column) {
      this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSort.column = column;
      this.currentSort.direction = 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(column: string): string {
    if (this.currentSort.column !== column) return 'unfold_more';
    return this.currentSort.direction === 'asc' ? 'expand_less' : 'expand_more';
  }

  getLowStockCount(): number {
    return this.productsData.filter(p => p.isLowStock).length;
  }

  get totalInventoryValue(): number {
    return this.productsData.reduce((acc, p) => {
      // Valor base: stock * purchasePrice (o productionCost/salePrice si purchasePrice no existe)
      const price = p.purchasePrice || p.productionCost || p.salePrice || 0;
      return acc + (p.stock * price);
    }, 0);
  }

  openDeleteModal(product: ProductDTO) {
    this.selectedProduct = product;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedProduct = null;
  }

  confirmDelete() {
    if (this.selectedProduct) {
      this.productsData = this.productsData.filter(p => p.id !== this.selectedProduct!.id);
      this.applyFilters();
      this.closeDeleteModal();
      this.showSuccessModal = true;
    }
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
  }

  // --- FORM ACTIONS ---
  openAddForm() {
    this.inventoryForm.reset({ stock: 0, minStock: 0, productionCost: 0, salePrice: 0, wastePercent: 0, type: '' });
    this.componentsFormArray.clear();
    this.viewMode = 'add';
  }

  openEditForm(product: ProductDTO) {
    this.inventoryForm.patchValue({
      id: product.id,
      name: product.name,
      stock: product.stock,
      type: product.type,
      unit: product.unit.name,
      minStock: product.minStock,
      productionCost: product.productionCost || product.purchasePrice || 0,
      salePrice: product.salePrice || 0,
      wastePercent: product.wastePercent || 0
    });

    this.componentsFormArray.clear();
    if (product.composition && product.composition.length > 0) {
      product.composition.forEach(comp => {
        this.componentsFormArray.push(this.fb.group({
          inventoryId: [comp.inventoryId, Validators.required],
          quantity: [comp.quantity, [Validators.required, Validators.min(0.01)]],
          unitCost: [comp.unitCost],
          subtotal: [comp.subtotal]
        }));
      });
    }

    this.viewMode = 'edit';
  }

  closeForm() {
    this.viewMode = 'list';
  }

  saveProduct() {
    if (this.inventoryForm.valid) {
      this.showFormSuccessModal = true;
    } else {
      this.inventoryForm.markAllAsTouched();
    }
  }

  closeFormSuccessModal(goToList: boolean) {
    this.showFormSuccessModal = false;
    if (goToList) {
      this.viewMode = 'list';
    } else if (this.viewMode === 'add') {
      this.openAddForm();
    }
  }
}
