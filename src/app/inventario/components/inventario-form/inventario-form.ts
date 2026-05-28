import { Component, EventEmitter, Input, OnInit, Output, inject, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { ProductDTO } from '../../../core/models/inventory.dto';
import { InventoryService } from '../../../core/services/inventory.service';
import { UIService } from '../../../core/services/ui.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-inventario-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './inventario-form.html',
  styleUrls: ['./inventario-form.css']
})
export class InventarioFormComponent implements OnInit, OnChanges {
  @Input() product: ProductDTO | null = null;
  @Input() allProducts: ProductDTO[] = [];
  @Input() mode: 'add' | 'edit' = 'add';
  @Output() formClose = new EventEmitter<void>();
  @Output() formSaved = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly inventoryService = inject(InventoryService);
  private readonly uiService = inject(UIService);
  private readonly cdr = inject(ChangeDetectorRef);

  inventoryForm: FormGroup;
  unidadesMedida: any[] = [];
  selectedInsumoId: number | null = null;
  errorMessage: string | null = null;
  private costSub?: Subscription;

  constructor() {
    this.inventoryForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      stock: [0, [Validators.required, Validators.min(0)]],
      type: ['', Validators.required],
      unit: ['', Validators.required],
      newUnitName: [''],
      minStock: [null, [Validators.required, Validators.min(0)]],
      purchasePrice: [null, [Validators.required, Validators.min(0)]],
      productionCost: [{ value: null, disabled: true }],
      salePrice: [null, [Validators.min(0)]],
      wastePercent: [null, [Validators.min(0), Validators.max(100)]],
      components: this.fb.array([])
    });

    // Cambiar validaciones según el tipo
    this.inventoryForm.get('type')?.valueChanges.subscribe(type => {
      this.updateValidatorsByType(type);
    });

    // Capear porcentaje a 100% en tiempo real
    this.inventoryForm.get('wastePercent')?.valueChanges.subscribe(val => {
      if (val > 100) {
        this.inventoryForm.get('wastePercent')?.setValue(100, { emitEvent: false });
      }
    });
  }

  get componentsFormArray(): FormArray {
    return this.inventoryForm.get('components') as FormArray;
  }

  ngOnInit(): void {
    this.loadUnidadesMedida();
    this.setupCostCalculation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] && this.product) {
      this.populateForm(this.product);
    } else if (changes['mode'] && this.mode === 'add') {
      this.resetForm();
    }

    if (changes['allProducts']) {
      this.calculateTotalCost();
    }

  }

  private loadUnidadesMedida(): void {
    this.inventoryService.getUnidadesMedida().subscribe(unidades => {
      this.unidadesMedida = unidades;
      this.cdr.detectChanges();
    });
  }

  private populateForm(product: ProductDTO): void {
    this.inventoryForm.patchValue({
      id: product.idProducto,
      name: product.nombre,
      stock: product.cantidadDisponible,
      type: product.tipo,
      unit: product.idUnidadMedida || product.unidadMedida,
      minStock: product.stockMinimo,
      purchasePrice: product.precioCompra,
      productionCost: product.precioCompra,
      salePrice: product.precioVenta,
      wastePercent: product.porcentajeSobrante
    });

    this.componentsFormArray.clear();
    if (product.composition) {
      product.composition.forEach((comp: any) => {
        this.componentsFormArray.push(this.fb.group({
          idDetalle: [comp.idDetalle],
          idInsumo: [comp.idInsumo, Validators.required],
          cantidadUsada: [comp.cantidadUsada, [Validators.required, Validators.min(0.001)]],
          precioUnidad: [comp.precioUnidad || 0]
        }));
      });
    }

    if (this.mode === 'edit') {
      this.inventoryForm.get('stock')?.disable();
      this.inventoryForm.get('type')?.disable();
    }
  }

  private resetForm(): void {
    this.inventoryForm.reset({
      stock: null,
      minStock: null,
      purchasePrice: null,
      productionCost: null,
      salePrice: null,
      wastePercent: null
    });
    this.componentsFormArray.clear();
    this.inventoryForm.get('stock')?.enable();
    this.inventoryForm.get('type')?.enable();
  }

  private updateValidatorsByType(type: string): void {
    const wasteCtrl = this.inventoryForm.get('wastePercent');
    const purchasePriceCtrl = this.inventoryForm.get('purchasePrice');

    if (type === 'ELABORADO' || type === 'TRANSFORMADO') {
      wasteCtrl?.disable();
      purchasePriceCtrl?.disable();
    } else {
      wasteCtrl?.enable();
      purchasePriceCtrl?.enable();
    }
    // productionCost se mantiene siempre disabled (solo lectura)
  }

  private setupCostCalculation(): void {
    if (this.costSub) this.costSub.unsubscribe();
    this.costSub = this.componentsFormArray.valueChanges.subscribe(() => {
      this.calculateTotalCost();
    });
  }

  private calculateTotalCost(): void {
    const items = this.componentsFormArray.getRawValue();
    const total = items.reduce((acc: number, item: any) => {
      return acc + ((item.precioUnidad || 0) * (item.cantidadUsada || 0));
    }, 0);
    this.inventoryForm.get('productionCost')?.setValue(total, { emitEvent: false });
    this.cdr.detectChanges();
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

      const insumo = this.allProducts.find(p => String(p.idProducto) === String(idInsumo));
      if (insumo && quantity > insumo.cantidadDisponible) {
        return { exceedStock: true };
      }
      return null;
    };
  }

  addComponent(): void {
    if (!this.selectedInsumoId) return;

    const exists = this.componentsFormArray.controls.some(ctrl => ctrl.get('idInsumo')?.value === this.selectedInsumoId);
    if (exists) {
      this.uiService.showError('Este insumo ya se encuentra en la lista de composición.', 'Producto Duplicado');
      this.selectedInsumoId = null;
      return;
    }

    // Traer el detalle por ID para obtener el precio real y stock
    this.inventoryService.getById(this.selectedInsumoId).subscribe({
      next: (insumo) => {
        if (insumo.cantidadDisponible <= 0) {
          this.uiService.showError(`El insumo "${insumo.nombre}" no tiene stock disponible (Actual: 0).`, 'Sin Stock');
          this.selectedInsumoId = null;
          return;
        }

        this.componentsFormArray.push(this.fb.group({
          idInsumo: [insumo.idProducto, Validators.required],
          cantidadUsada: [1, [Validators.required, Validators.min(0.001)]],
          precioUnidad: [insumo.precioCompra || 0]
        }, {
          validators: [this.uniqueInsumoValidator(), this.stockLimitValidator()]
        }));
        this.selectedInsumoId = null;
        this.calculateTotalCost();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching insumo price', err)
    });
  }

  removeComponent(index: number): void {
    this.componentsFormArray.removeAt(index);
    this.calculateTotalCost();
    this.cdr.detectChanges();
  }

  getFilteredInsumos(search: any): ProductDTO[] {
    const filterValue = typeof search === 'string' ? search.toLowerCase() : '';
    return this.allProducts.filter(p =>
      p.tipo === 'INSUMO' &&
      (p.nombre.toLowerCase().includes(filterValue) || String(p.idProducto).includes(filterValue))
    );
  }

  getInsumoName(id: any): string {
    const insumo = this.allProducts.find(p => p.idProducto === id);
    return insumo ? insumo.nombre : '';
  }

  getInsumoUnit(id: any): string {
    const insumo = this.allProducts.find(p => p.idProducto === id);
    return insumo ? insumo.unidadMedida : 'Und';
  }

  getInsumoStock(id: any): number {
    const insumo = this.allProducts.find(p => p.idProducto === id);
    return insumo ? insumo.cantidadDisponible : 0;
  }

  getInsumoPrice(id: any): number {
    // Primero buscar en el form array
    const group = this.componentsFormArray.controls.find(c => c.get('idInsumo')?.value === id);
    if (group) return group.get('precioUnidad')?.value || 0;

    // Si no, buscar en la lista local
    const insumo = this.allProducts.find(p => p.idProducto === id);
    return insumo ? insumo.precioCompra : 0;
  }

  getInsumoSubtotal(id: any, quantity: number): number {
    return this.getInsumoPrice(id) * (quantity || 0);
  }

  onSubmit(): void {
    if (this.inventoryForm.invalid) {
      this.inventoryForm.markAllAsTouched();
      return;
    }

    const rawData = this.inventoryForm.getRawValue();
    const payload = {
      ...rawData,
      precioCompra: rawData.type === 'INSUMO' ? rawData.purchasePrice : rawData.productionCost,
      unidadMedida: rawData.unit === 'NEW_UNIT' ? rawData.newUnitName : rawData.unit
    };

    const request$ = this.mode === 'edit'
      ? this.inventoryService.update(rawData.id, payload)
      : this.inventoryService.create(payload);

    request$.subscribe({
      next: (res: any) => {
        const id = this.mode === 'edit' ? rawData.id : Number(res);

        if (this.componentsFormArray.length > 0 && (rawData.type === 'ELABORADO' || rawData.type === 'TRANSFORMADO')) {
          const insumos = this.componentsFormArray.getRawValue().map((c: any) => ({
            idInsumo: c.idInsumo,
            cantidadUsada: c.cantidadUsada
          }));
          this.inventoryService.addComposicion(id, insumos).subscribe(() => {
            this.formSaved.emit();
          });
        } else {
          this.formSaved.emit();
        }
      },
      error: (err) => {
        console.error('Error saving product', err);
        this.errorMessage = 'Error al guardar el artículo. Por favor, revisa los datos.';
        this.cdr.detectChanges();
      }
    });
  }

  onCancel(): void {
    this.formClose.emit();
  }
}
