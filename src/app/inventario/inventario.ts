import { Component, inject, OnInit, AfterViewInit, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ProductDTO, ProductType } from '../core/models/inventory.dto';
import { InventoryService } from '../core/services/inventory.service';
import { ScreenSizeService } from '../core/services/screen-size.service';
import { UIService } from '../core/services/ui.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { EntradaDialogComponent } from './components/entrada-dialog/entrada-dialog';
import { AjusteDialogComponent } from './components/ajuste-dialog/ajuste-dialog';
import { BaseTableComponent } from '../shared/components/base-table.component';
import { InventarioFormComponent } from './components/inventario-form/inventario-form';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatDividerModule,
    InventarioFormComponent
  ],
  templateUrl: './inventario.html',
  styleUrls: ['./inventario.css']
})
export class InventarioComponent extends BaseTableComponent<ProductDTO> implements OnInit, AfterViewInit {
  productsList: ProductDTO[] = [];
  filteredProducts: ProductDTO[] = [];
  dataSource = new MatTableDataSource<ProductDTO>([]);
  displayedColumns: string[] = [];

  searchTerm = '';
  currentFilter: 'all' | 'lowstock' | 'category' = 'all';
  selectedCategory: ProductType | '' = '';

  // Modals state
  selectedProduct: ProductDTO | null = null;
  pendingAddStockProductId: string | null = null;

  private readonly route = inject(ActivatedRoute);

  // Motivos de movimiento — enum MotivoMovimiento del backend
  readonly motivosEntrada = [
    { value: 'COMPRA_INSUMOS', label: 'Compra de Insumos' },
    { value: 'VENTA_PRODUCTO', label: 'Venta de Producto' },
    { value: 'CONSUMO', label: 'Consumo interno' },
    { value: 'DESPERDICIO', label: 'Desperdicio / Merma' },
    { value: 'AJUSTE_INVENTARIO', label: 'Ajuste de Inventario' }
  ];

  // UI state
  viewMode: 'list' | 'add' | 'edit' = 'list';

  private readonly inventoryService = inject(InventoryService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly uiService = inject(UIService);

  readonly screenSize = inject(ScreenSizeService);

  constructor() {
    super();
  }

  ngOnInit(): void {
    this.screenSize.isMobile$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(isMobile => {
      this.updateColumns(isMobile);
    });

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params['addStock']) {
        this.pendingAddStockProductId = String(params['addStock']);
        this.checkPendingAddStockProduct();
      }
      if (params['search']) {
        this.searchTerm = params['search'];
        this._applyTableFilter();
      }
    });
    this.loadInventory();
  }

  private updateColumns(isMobile: boolean): void {
    this.displayedColumns = isMobile
      ? ['nombre', 'cantidadDisponible', 'acciones']
      : ['nombre', 'tipo', 'unidadMedida', 'cantidadDisponible', 'acciones'];
    this.cdr.detectChanges();
  }

  ngAfterViewInit() {
    this.dataSource.sortingDataAccessor = (item: ProductDTO, property: string) => {
      switch (property) {
        case 'nombre': return item.nombre.toLowerCase();
        case 'tipo': return item.tipo;
        case 'cantidadDisponible': return item.cantidadDisponible;
        case 'porcentajeSobrante': return item.porcentajeSobrante;
        default: return (item as any)[property as keyof ProductDTO] as string | number ?? '';
      }
    };

    this.dataSource.filterPredicate = (data: ProductDTO, _filter: string) => {
      const search = (this.searchTerm || '').toLowerCase().trim();
      const nombre = (data.nombre || '').toLowerCase();
      const id = (String(data.idProducto || '')).toLowerCase();
      const matchesSearch = nombre.includes(search) || id.includes(search);
      const matchesCategory = this.currentFilter !== 'category' || !this.selectedCategory || data.tipo === this.selectedCategory;
      const matchesLowStock = this.currentFilter !== 'lowstock' || (data.isLowStock || false);
      return matchesSearch && matchesCategory && matchesLowStock;
    };
  }

  loadInventory(): void {
    this.inventoryService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.productsList = data;
        this.dataSource.data = this.productsList;
        this.checkPendingAddStockProduct();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading inventory', err)
    });
  }

  private checkPendingAddStockProduct(): void {
    if (this.pendingAddStockProductId && this.productsList.length > 0) {
      const product = this.productsList.find(p => String(p.idProducto) === this.pendingAddStockProductId);
      if (product) {
        this.openEntradaModal(product);
        this.pendingAddStockProductId = null;
      }
    }
  }

  getLowStockCount(): number {
    return this.productsList.filter(p => p.isLowStock).length;
  }

  setFilter(filter: 'all' | 'lowstock' | 'category'): void {
    this.currentFilter = filter;
    this._applyTableFilter();
  }

  private _applyTableFilter(): void {
    this.dataSource.filter = this.searchTerm.trim().toLowerCase() + '|' + this.currentFilter + '|' + this.selectedCategory;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  onSearchChange(): void {
    this._applyTableFilter();
  }

  get totalInventoryValue(): number {
    return this.productsList.reduce((acc, p) => {
      const price = p.precioCompra || p.precioVenta || 0;
      return acc + (p.cantidadDisponible * price);
    }, 0);
  }

  // --- ENTRADA DE STOCK ---
  openEntradaModal(product: ProductDTO): void {
    const dialogRef = this.dialog.open(EntradaDialogComponent, {
      panelClass: 'casualidad-dialog',
      data: { product, motivos: this.motivosEntrada }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.inventoryService.registrarEntrada(result.idProducto, result.cantidad, result.motivo).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            this.loadInventory();
            this.uiService.showSuccess({
              title: '¡Entrada Registrada!',
              message: 'El stock ha sido actualizado correctamente en el inventario.',
              icon: 'inventory_2'
            });
          },
          error: (err) => console.error('Error registrando entrada', err)
        });
      }
    });
  }

  // --- AJUSTE DE INVENTARIO ---
  openAjusteModal(product: ProductDTO): void {
    const dialogRef = this.dialog.open(AjusteDialogComponent, {
      panelClass: 'casualidad-dialog',
      data: { product }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.inventoryService.ajustarInventario(result.idProducto, result.cantidadNueva, result.motivo).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            this.loadInventory();
            this.uiService.showSuccess({
              title: '¡Inventario Ajustado!',
              message: 'El nivel de stock ha sido actualizado correctamente.',
              icon: 'tune'
            });
          },
          error: (err) => console.error('Error ajustando inventario', err)
        });
      }
    });
  }

  // --- DELETE ---
  openDeleteModal(product: ProductDTO): void {
    this.uiService.showConfirm({
      title: '¿Eliminar artículo?',
      message: 'Estás a punto de eliminar ',
      highlightText: product.nombre,
      warningText: 'Esta acción no se puede deshacer y ',
      confirmLabel: 'Sí, eliminar artículo',
      icon: 'delete_forever',
      accentColor: 'error'
    }).subscribe(result => {
      if (result) {
        this.confirmDelete(product);
      }
    });
  }

  confirmDelete(product: ProductDTO): void {
    this.inventoryService.delete(product.idProducto).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loadInventory();
        this.uiService.showSuccess({
          title: '¡Artículo Eliminado!',
          message: 'El artículo ha sido eliminado permanentemente del inventario.'
        });
      },
      error: (err) => {
        console.error('Error eliminando producto', err);
        this.uiService.showError('No se pudo eliminar el artículo. Es posible que tenga movimientos asociados.');
      }
    });
  }

  // --- FORM ACTIONS ---
  openAddForm(): void {
    this.selectedProduct = null;
    this.viewMode = 'add';
    this.cdr.detectChanges();
  }

  openEditForm(product: ProductDTO): void {
    this.inventoryService.getById(product.idProducto).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (fullProduct) => {
        this.selectedProduct = fullProduct;
        this.viewMode = 'edit';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching product details', err);
        this.uiService.showError('No se pudieron cargar los detalles del producto.');
      }
    });
  }

  closeForm(): void {
    this.viewMode = 'list';
    this.selectedProduct = null;
    this.cdr.detectChanges();
  }

  onSaved(): void {
    this.loadInventory();
    this.closeForm();
  }
}

