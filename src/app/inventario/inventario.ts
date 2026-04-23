import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../shared/pagination/pagination';
import { ProductDTO, ProductType } from '../core/models/inventory.dto';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
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

  // Modals state
  showDeleteModal = false;
  showSuccessModal = false;
  selectedProduct: ProductDTO | null = null;

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
}
