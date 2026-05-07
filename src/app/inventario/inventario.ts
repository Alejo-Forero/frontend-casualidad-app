import { Component, inject, OnInit, AfterViewInit, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
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
import { SuccessDialogComponent } from '../shared/components/success-dialog/success-dialog';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog';
import { EntradaDialogComponent } from './components/entrada-dialog/entrada-dialog';
import { AjusteDialogComponent } from './components/ajuste-dialog/ajuste-dialog';
import { BaseTableComponent } from '../shared/components/base-table.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
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
    MatAutocompleteModule
  ],
  templateUrl: './inventario.html',
  styleUrls: ['./inventario.css']
})
export class InventarioComponent extends BaseTableComponent<ProductDTO> implements OnInit, AfterViewInit {
  productsData: ProductDTO[] = [];
  filteredProducts: ProductDTO[] = [];
  dataSource = new MatTableDataSource<ProductDTO>([]);
  displayedColumns: string[] = ['id', 'name', 'type', 'stock', 'estado', 'acciones'];

  searchTerm = '';
  currentFilter: 'all' | 'lowstock' | 'category' = 'all';
  selectedCategory: ProductType | '' = '';

  // Modals state
  errorMessage: string | null = null;
  selectedProduct: ProductDTO | null = null;
  pendingAddStockProductId: string | null = null;
  unidadesMedida: any[] = [];
  isAddingNewUnit = false;

  private readonly route = inject(ActivatedRoute);

  // Motivos de movimiento — enum MotivoMovimiento del backend
  readonly motivosEntrada = [
    { value: 'COMPRA_INSUMOS', label: 'Compra de Insumos' },
    { value: 'VENTA_PRODUCTO', label: 'Venta de Producto' },
    { value: 'CONSUMO', label: 'Consumo interno' },
    { value: 'DESPERDICIO', label: 'Desperdicio / Merma' },
    { value: 'AJUSTE_INVENTARIO', label: 'Ajuste de Inventario' }
  ];

  // Forms state
  viewMode: 'list' | 'add' | 'edit' = 'list';
  inventoryForm: FormGroup;

  private readonly fb = inject(FormBuilder);
  private readonly inventoryService = inject(InventoryService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly uiService = inject(UIService);
  private costSub: any = null;
  selectedInsumoId: any = null;

  readonly screenSize = inject(ScreenSizeService);

  constructor() {
    super();

    this.inventoryForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      stock: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0)]],
      type: ['', Validators.required],
      unit: ['', Validators.required],
      newUnitName: [''],
      minStock: [0, [Validators.required, Validators.min(0)]],
      purchasePrice: [0, Validators.min(0)],
      productionCost: [0, Validators.min(0)],
      salePrice: [0, Validators.min(0)],
      wastePercent: [0, [Validators.min(0), Validators.max(100)]],
      components: this.fb.array([])
    });

    this.inventoryForm.get('type')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(type => {
      this.handleTypeChange(type);
    });

    this.inventoryForm.get('unit')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      this.isAddingNewUnit = value === 'NEW_UNIT';
      if (this.isAddingNewUnit) {
        this.inventoryForm.get('newUnitName')?.setValidators([Validators.required]);
      } else {
        this.inventoryForm.get('newUnitName')?.clearValidators();
      }
      this.inventoryForm.get('newUnitName')?.updateValueAndValidity();
    });
  }

  get componentsFormArray(): FormArray {
    return this.inventoryForm.get('components') as FormArray;
  }

  handleTypeChange(type: ProductType | ''): void {
    const salePriceCtrl = this.inventoryForm.get('salePrice');
    const wasteCtrl = this.inventoryForm.get('wastePercent');
    const productionCostCtrl = this.inventoryForm.get('productionCost');
    const purchasePriceCtrl = this.inventoryForm.get('purchasePrice');

    if (type === 'INSUMO') {
      salePriceCtrl?.disable();
      wasteCtrl?.enable();
      purchasePriceCtrl?.enable();
      productionCostCtrl?.disable();
    } else if (type === 'ELABORADO' || type === 'TRANSFORMADO') {
      salePriceCtrl?.enable();
      wasteCtrl?.disable();
      purchasePriceCtrl?.disable();
      productionCostCtrl?.disable();
      this.setupCostCalculation();
    } else {
      salePriceCtrl?.enable();
      wasteCtrl?.enable();
      purchasePriceCtrl?.enable();
      productionCostCtrl?.disable();
    }
  }

  private setupCostCalculation(): void {
    if (this.costSub) {
      this.costSub.unsubscribe();
    }
    
    this.costSub = this.componentsFormArray.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.calculateTotalCost();
      });
    
    // Calcular inmediatamente para inicializar
    this.calculateTotalCost();
  }

  getInsumoUnit(id: any): string {
    if (!id) return '-';
    const insumo = this.productsData.find(p => String(p.idProducto || p.id) === String(id));
    return insumo?.unidadMedida || insumo?.unit?.name || '-';
  }

  getInsumoPrice(id: any): number {
    if (!id) return 0;
    const insumo = this.productsData.find(p => String(p.idProducto || p.id) === String(id));
    if (!insumo) return 0;
    
    // Devolver el primer valor numérico encontrado (priorizando precioCompra)
    if (typeof insumo.precioCompra === 'number') return insumo.precioCompra;
    if (typeof insumo.purchasePrice === 'number') return insumo.purchasePrice;
    if (typeof insumo.productionCost === 'number') return insumo.productionCost;
    
    return 0;
  }

  private calculateTotalCost(): void {
    const type = this.inventoryForm.get('type')?.value;
    if (type !== 'ELABORADO' && type !== 'TRANSFORMADO') return;

    let total = 0;
    this.componentsFormArray.controls.forEach(ctrl => {
      const id = ctrl.get('idInsumo')?.value;
      const qty = ctrl.get('cantidadUsada')?.value || 0;
      if (id) {
        // Buscar por idProducto, id o idInsumo (compatibilidad total)
        const insumo = this.productsData.find(p => 
          String(p.idProducto) === String(id) || 
          String(p.id) === String(id)
        );
        
        const cost = insumo?.precioCompra || insumo?.purchasePrice || insumo?.productionCost || 0;
        total += (cost * qty);
      }
    });

    this.inventoryForm.get('productionCost')?.setValue(total, { emitEvent: false });
    this.cdr.detectChanges();
  }

  addComponent(): void {
    if (!this.selectedInsumoId) return;

    // Verificar si ya existe
    const exists = this.componentsFormArray.controls.some(ctrl => 
      String(ctrl.get('idInsumo')?.value) === String(this.selectedInsumoId)
    );

    if (exists) {
      // Opcional: mostrar un aviso o simplemente no añadir
      this.selectedInsumoId = null;
      return;
    }

    const group = this.fb.group({
      idInsumo: [this.selectedInsumoId, [Validators.required, Validators.min(1)]],
      cantidadUsada: [1, [Validators.required, Validators.min(1), Validators.pattern(/^[0-9]+$/)]]
    }, {
      validators: [this.uniqueInsumoValidator(), this.stockLimitValidator()]
    });

    this.componentsFormArray.push(group);
    this.selectedInsumoId = null; // Limpiar selección
    this.calculateTotalCost();
  }

  private uniqueInsumoValidator() {
    return (group: FormGroup): { [key: string]: any } | null => {
      const idInsumo = group.get('idInsumo')?.value;
      if (!idInsumo) return null;

      const controls = this.componentsFormArray.controls;
      const index = controls.indexOf(group);
      
      const isDuplicate = controls.some((ctrl, i) => 
        i !== index && String(ctrl.get('idInsumo')?.value) === String(idInsumo)
      );

      return isDuplicate ? { duplicateInsumo: true } : null;
    };
  }

  private stockLimitValidator() {
    return (group: FormGroup): { [key: string]: any } | null => {
      const idInsumo = group.get('idInsumo')?.value;
      const quantity = group.get('cantidadUsada')?.value;
      if (!idInsumo || !quantity) return null;

      const insumo = this.productsData.find(p => String(p.idProducto || p.id) === String(idInsumo));
      if (insumo && quantity > insumo.stock) {
        return { exceedStock: { stock: insumo.stock } };
      }
      return null;
    };
  }

  removeComponent(index: number): void {
    this.componentsFormArray.removeAt(index);
  }

  getSelectedUnitName(): string {
    const val = this.inventoryForm.get('unit')?.value;
    if (!val) return 'Seleccionar unidad';
    const unit = this.unidadesMedida.find(u => (u.idUnidad || u.nombre) === val);
    return unit ? unit.nombre : val;
  }

  getInsumoName(id: any): string {
    if (!id) return '';
    const insumo = this.productsData.find(p => String(p.idProducto || p.id) === String(id));
    return insumo ? insumo.name : '';
  }

  getFilteredInsumos(val: any): ProductDTO[] {
    const filterValue = typeof val === 'string' ? val.toLowerCase() : '';
    return this.productsData
      .filter(p => p.type === 'INSUMO')
      .filter(p => 
        p.name.toLowerCase().includes(filterValue) || 
        String(p.idProducto || p.id).includes(filterValue)
      );
  }

  ngOnInit(): void {
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
    this.loadUnidadesMedida();
  }

  loadUnidadesMedida(): void {
    this.inventoryService.getUnidadesMedida().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (units) => {
        this.unidadesMedida = units;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading units of measure', err)
    });
  }

  ngAfterViewInit() {
    this.dataSource.sortingDataAccessor = (item: ProductDTO, property: string) => {
      switch (property) {
        case 'name': return item.name.toLowerCase();
        case 'type': return item.type;
        case 'stock': return item.stock;
        default: return (item as any)[property as keyof ProductDTO] as string | number ?? '';
      }
    };

    this.dataSource.filterPredicate = (data: ProductDTO, _filter: string) => {
      console.log('Filtering data:', data);
      const search = (this.searchTerm || '').toLowerCase().trim();
      const name = (data.nombre || data.name || '').toLowerCase();
      const id = (String(data.idProducto || data.id || '')).toLowerCase();
      const matchesSearch = name.includes(search) || id.includes(search);
      const matchesCategory = this.currentFilter !== 'category' || !this.selectedCategory || data.type === this.selectedCategory;
      const matchesLowStock = this.currentFilter !== 'lowstock' || data.isLowStock;
      return matchesSearch && matchesCategory && matchesLowStock;
    };
  }

  applyFilters(): void {
    const search = (this.searchTerm || '').toLowerCase().trim();
    this.filteredProducts = this.productsData.filter(product => {
      const name = (product.nombre || product.name || '').toLowerCase();
      const id = String(product.idProducto || product.id || '').toLowerCase();
      const matchesSearch = name.includes(search) || id.includes(search);
      return matchesSearch;
    });
    this.dataSource.data = this.filteredProducts;
  }

  loadInventory(): void {
    this.inventoryService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.productsData = data;
        this.dataSource.data = this.productsData;
        this.checkPendingAddStockProduct();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading inventory', err)
    });
  }

  private checkPendingAddStockProduct(): void {
    if (this.pendingAddStockProductId && this.productsData.length > 0) {
      const product = this.productsData.find(p => String(p.idProducto || p.id) === this.pendingAddStockProductId);
      if (product) {
        this.openEntradaModal(product);
        this.pendingAddStockProductId = null;
      }
    }
  }

  getLowStockCount(): number {
    return this.productsData.filter(p => p.isLowStock).length;
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
    return this.productsData.reduce((acc, p) => {
      const price = p.purchasePrice || p.productionCost || p.salePrice || 0;
      return acc + (p.stock * price);
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
    this.errorMessage = null;
    
    this.uiService.showConfirm({
      title: '¿Eliminar artículo?',
      message: 'Estás a punto de eliminar ',
      highlightText: product.name,
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
    this.inventoryService.delete(product.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    this.errorMessage = null;
    this.inventoryForm.enable();
    this.inventoryForm.reset({ stock: 0, minStock: 0, productionCost: 1, salePrice: 1, wastePercent: 0, type: '' });
    this.componentsFormArray.clear();
    this.viewMode = 'add';
    this.cdr.detectChanges();
  }

  openEditForm(product: ProductDTO): void {
    console.log('Editing product:', product);
    this.errorMessage = null;
    
    // Patch the form with safe field names matching this.inventoryForm
    this.inventoryForm.patchValue({
      id: product.id || String(product.idProducto || ''),
      name: product.nombre || product.name || '',
      stock: product.stock ?? product.cantidadDisponible ?? 0,
      type: product.tipo || product.type || '',
      unit: product.idUnidadMedida || product.unidadMedida || product.unit?.name || '',
      newUnitName: '',
      minStock: product.stockMinimo ?? product.minStock ?? 0,
      purchasePrice: product.precioCompra || product.purchasePrice || 0,
      productionCost: product.productionCost || product.precioCompra || 0,
      salePrice: product.salePrice || product.precioVenta || 0,
      wastePercent: product.wastePercent || product.porcentajeSobrante || 0
    }, { emitEvent: true });

    this.componentsFormArray.clear();
    
    // Check for composition in any possible property name
    const composition = product.composition || (product as any).composicion;
    if (composition && Array.isArray(composition) && composition.length > 0) {
      composition.forEach((comp: any) => {
        this.componentsFormArray.push(this.fb.group({
          idInsumo: [comp.idInsumo || comp.insumo?.idProducto || comp.id || null, [Validators.required]],
          cantidadUsada: [comp.cantidadUsada || comp.quantity || 1, [Validators.required, Validators.min(0.001)]]
        }, {
          validators: [this.uniqueInsumoValidator(), this.stockLimitValidator()]
        }));
      });
    }

    this.inventoryForm.get('stock')?.disable({ emitEvent: false });
    this.inventoryForm.get('type')?.disable({ emitEvent: false });
    this.viewMode = 'edit';
    this.cdr.detectChanges();
  }

  closeForm(): void {
    this.viewMode = 'list';
    this.cdr.detectChanges();
  }

  saveProduct(): void {
    this.errorMessage = null;
    if (!this.inventoryForm.valid) {
      this.inventoryForm.markAllAsTouched();
      return;
    }

    const rawData = this.inventoryForm.getRawValue();
    const productData = {
      ...rawData,
      precioCompra: rawData.type === 'INSUMO' ? rawData.purchasePrice : rawData.productionCost,
      precioVenta: rawData.salePrice,
      porcentajeSobrante: rawData.wastePercent,
      unit: rawData.unit === 'NEW_UNIT' ? rawData.newUnitName : rawData.unit
    };

    const tieneComposicion =
      (productData.type === 'ELABORADO' || productData.type === 'TRANSFORMADO') &&
      this.componentsFormArray.length > 0;
    const isEdit = this.viewMode === 'edit';

    const openSuccessDialog = () => {
      this.loadInventory();
      this.uiService.showSuccess({
        title: isEdit ? '¡Artículo Actualizado!' : '¡Artículo Creado!',
        message: isEdit ? 'Los datos del artículo han sido modificados.' : 'El artículo ha sido registrado en el inventario.',
        secondaryActionLabel: isEdit ? undefined : 'Agregar otro'
      }).subscribe(result => {
        if (!result || result.action === 'primary' || result.action === 'close') {
          this.viewMode = 'list';
        } else if (result.action === 'secondary' && !isEdit) {
          this.openAddForm();
        }
        this.cdr.detectChanges();
      });
    };

    if (isEdit) {
      this.inventoryService.update(productData.id, productData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: openSuccessDialog,
          error: (err) => {
            console.error('Error actualizando producto', err);
            this.errorMessage = 'Error al actualizar el producto. Verifica que los campos sean v\u00e1lidos.';
            this.cdr.detectChanges();
          }
        });
    } else {
      this.inventoryService.create(productData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (idProducto: any) => {
            const id = Number(idProducto);
            if (tieneComposicion && id > 0) {
              const insumos = this.componentsFormArray.controls.map(ctrl => ({
                idInsumo: Number(ctrl.get('idInsumo')?.value),
                cantidadUsada: Number(ctrl.get('cantidadUsada')?.value)
              }));
              this.inventoryService.addComposicion(id, insumos)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                  next: openSuccessDialog,
                  error: (err) => console.error('Error guardando composici\u00f3n', err)
                });
            } else {
              openSuccessDialog();
            }
          },
          error: (err) => {
            console.error('Error creando producto', err);
            this.errorMessage = 'Error al crear el producto. Verifica que los campos sean v\u00e1lidos.';
            this.cdr.detectChanges();
          }
        });
    }
  }
}
