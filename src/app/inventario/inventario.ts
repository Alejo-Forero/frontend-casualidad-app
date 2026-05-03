import { Component, inject, OnInit, AfterViewInit, ChangeDetectorRef, DestroyRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ProductDTO, ProductType } from '../core/models/inventory.dto';
import { InventoryService } from '../core/services/inventory.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog';
import { SuccessDialogComponent } from '../shared/components/success-dialog/success-dialog';
import { EntradaDialogComponent } from './components/entrada-dialog/entrada-dialog';
import { AjusteDialogComponent } from './components/ajuste-dialog/ajuste-dialog';

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
    MatDialogModule
  ],
  templateUrl: './inventario.html',
  styleUrls: ['./inventario.css']
})
export class InventarioComponent implements OnInit, AfterViewInit {
  productsData: ProductDTO[] = [];
  dataSource = new MatTableDataSource<ProductDTO>([]);
  displayedColumns: string[] = ['name', 'type', 'stock', 'estado', 'precio', 'acciones'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  searchTerm = '';
  currentFilter: 'all' | 'lowstock' | 'category' = 'all';
  selectedCategory: ProductType | '' = '';

  // Modals state
  errorMessage: string | null = null;
  selectedProduct: ProductDTO | null = null;

  // Motivos de movimiento — enum MotivoMovimiento del backend
  readonly motivosEntrada = [
    { value: 'COMPRA_INSUMOS',     label: 'Compra de Insumos' },
    { value: 'VENTA_PRODUCTO',     label: 'Venta de Producto' },
    { value: 'CONSUMO',            label: 'Consumo interno' },
    { value: 'DESPERDICIO',        label: 'Desperdicio / Merma' },
    { value: 'AJUSTE_INVENTARIO',  label: 'Ajuste de Inventario' }
  ];

  // Forms state
  viewMode: 'list' | 'add' | 'edit' = 'list';
  inventoryForm: FormGroup;

  private readonly fb = inject(FormBuilder);
  private readonly inventoryService = inject(InventoryService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);

  constructor() {
    this.inventoryForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      stock: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0)]],
      type: ['', Validators.required],
      unit: ['', Validators.required],
      minStock: [0, [Validators.required, Validators.min(0)]],
      productionCost: [0, Validators.min(0)],
      salePrice: [0, Validators.min(0)],
      wastePercent: [0, [Validators.min(0), Validators.max(100)]],
      components: this.fb.array([])
    });

    this.inventoryForm.get('type')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(type => {
      this.handleTypeChange(type);
    });
  }

  get componentsFormArray(): FormArray {
    return this.inventoryForm.get('components') as FormArray;
  }

  handleTypeChange(type: ProductType | ''): void {
    this.componentsFormArray.clear();

    const salePriceCtrl = this.inventoryForm.get('salePrice');
    const wasteCtrl = this.inventoryForm.get('wastePercent');

    if (type === 'INSUMO') {
      salePriceCtrl?.disable();
      wasteCtrl?.enable();
    } else {
      salePriceCtrl?.enable();
      if (type === 'ELABORADO' || type === 'TRANSFORMADO') {
        wasteCtrl?.disable();
      } else {
        wasteCtrl?.enable();
      }
    }
  }

  addComponent(): void {
    // idInsumo y cantidadUsada son los campos de InsumoComposicionDto en el backend
    this.componentsFormArray.push(this.fb.group({
      idInsumo:      [null, [Validators.required, Validators.min(1)]],
      cantidadUsada: [1,    [Validators.required, Validators.min(0.001)]]
    }));
  }

  removeComponent(index: number): void {
    this.componentsFormArray.removeAt(index);
  }

  ngOnInit(): void {
    this.loadInventory();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.dataSource.sortingDataAccessor = (item: ProductDTO, property: string) => {
      switch (property) {
        case 'name': return item.name.toLowerCase();
        case 'type': return item.type;
        case 'stock': return item.stock;
        default: return (item as any)[property as keyof ProductDTO] as string | number ?? '';
      }
    };

    this.dataSource.filterPredicate = (data, _filter) => {
      const search = this.searchTerm.trim().toLowerCase();
      const matchesSearch = data.name.toLowerCase().includes(search) || data.id.toLowerCase().includes(search);
      const matchesCategory = this.currentFilter !== 'category' || !this.selectedCategory || data.type === this.selectedCategory;
      const matchesLowStock = this.currentFilter !== 'lowstock' || data.isLowStock;
      return matchesSearch && matchesCategory && matchesLowStock;
    };
  }

  loadInventory(): void {
    this.inventoryService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.productsData = data;
        this.dataSource.data = this.productsData;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading inventory', err)
    });
  }

  getLowStockCount(): number {
    return this.productsData.filter(p => p.isLowStock).length;
  }

  setFilter(filter: 'all' | 'lowstock' | 'category'): void {
    this.currentFilter = filter;
    this._applyTableFilter();
  }

  onSearchChange(): void {
    this._applyTableFilter();
  }

  private _applyTableFilter(): void {
    // Trigger filterPredicate by setting filter string (use a timestamp to force re-evaluation)
    this.dataSource.filter = this.searchTerm.trim().toLowerCase() + '|' + this.currentFilter + '|' + this.selectedCategory;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
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
            this.dialog.open(SuccessDialogComponent, {
              panelClass: 'casualidad-dialog',
              data: {
                title: '\u00a1Entrada Registrada!',
                message: 'El stock ha sido actualizado correctamente en el inventario.',
                icon: 'inventory_2',
                accentColor: 'success',
                primaryActionLabel: 'Continuar'
              }
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
            this.dialog.open(SuccessDialogComponent, {
              panelClass: 'casualidad-dialog',
              data: {
                title: '\u00a1Inventario Ajustado!',
                message: 'El nivel de stock ha sido actualizado correctamente.',
                icon: 'tune',
                accentColor: 'success',
                primaryActionLabel: 'Continuar'
              }
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

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      panelClass: 'casualidad-dialog',
      data: {
        title: '\u00bfEliminar Art\u00edculo?',
        message: '\u00bfEst\u00e1s seguro de que deseas eliminar ',
        highlightText: product.name,
        warningText: 'Esta acci\u00f3n ',
        confirmLabel: 'S\u00ed, eliminar art\u00edculo',
        icon: 'delete_forever',
        accentColor: 'error'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.inventoryService.delete(product.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            this.loadInventory();
            this.dialog.open(SuccessDialogComponent, {
              panelClass: 'casualidad-dialog',
              data: {
                title: '\u00a1Art\u00edculo Eliminado!',
                message: 'El art\u00edculo ha sido eliminado del inventario.',
                icon: 'check_circle',
                accentColor: 'success',
                primaryActionLabel: 'Continuar'
              }
            });
          },
          error: (err) => {
            console.error('Error eliminando producto', err);
            this.errorMessage = 'No se pudo eliminar el producto. Puede que est\u00e9 en uso o referenciado.';
            this.cdr.detectChanges();
          }
        });
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
    this.errorMessage = null;
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
    }, { emitEvent: false });

    this.componentsFormArray.clear();
    if (product.composition && product.composition.length > 0) {
      product.composition.forEach((comp: any) => {
        this.componentsFormArray.push(this.fb.group({
          idInsumo:      [comp.idInsumo ?? comp.inventoryId ?? null, [Validators.required, Validators.min(1)]],
          cantidadUsada: [comp.cantidadUsada ?? comp.quantity ?? 1,  [Validators.required, Validators.min(0.001)]]
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

    const productData = this.inventoryForm.value;
    const tieneComposicion =
      (productData.type === 'ELABORADO' || productData.type === 'TRANSFORMADO') &&
      this.componentsFormArray.length > 0;
    const isEdit = this.viewMode === 'edit';

    const openSuccessDialog = () => {
      this.loadInventory();
      const dialogRef = this.dialog.open(SuccessDialogComponent, {
        panelClass: 'casualidad-dialog',
        data: {
          title: isEdit ? '\u00a1Art\u00edculo Actualizado!' : '\u00a1Art\u00edculo Creado!',
          message: isEdit ? 'Los datos del art\u00edculo han sido modificados.' : 'El art\u00edculo ha sido registrado en el inventario.',
          icon: 'check_circle',
          accentColor: 'primary',
          primaryActionLabel: 'Ir al Inventario',
          secondaryActionLabel: isEdit ? undefined : 'Agregar otro'
        }
      });
      dialogRef.afterClosed().subscribe(result => {
        if (!result || result.action === 'primary' || result.action === 'close') {
          this.viewMode = 'list';
        } else if (result.action === 'secondary') {
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
                idInsumo:      Number(ctrl.get('idInsumo')?.value),
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
