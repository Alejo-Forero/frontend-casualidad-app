import { Component, EventEmitter, Input, OnInit, OnDestroy, Output, inject, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
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
export class InventarioFormComponent implements OnInit, OnChanges, OnDestroy {
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
  private statusSub?: Subscription;

  constructor() {
    this.inventoryForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      stock: [0, [Validators.required, Validators.min(0)]],
      type: ['', Validators.required],
      unit: ['', Validators.required],
      newUnitName: [''],
      minStock: [null, [Validators.required, Validators.min(0)]],
      purchasePrice: [null, [Validators.required, Validators.min(1)]],
      productionCost: [{ value: null, disabled: true }],
      salePrice: [null, [Validators.min(1)]],
      wastePercent: [null, [Validators.min(0), Validators.max(100)]],
      components: this.fb.array([])
    });

    this.inventoryForm.get('type')?.valueChanges.subscribe(type => {
      this.updateValidatorsByType(type);
    });

    this.inventoryForm.get('unit')?.valueChanges.subscribe(unit => {
      this.updateUnitValidators(unit);
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
    // Fuerza detección de cambios cuando el estado de validez del form cambia
    // (necesario con provideZonelessChangeDetection)
    this.statusSub = this.inventoryForm.statusChanges.subscribe(() => this.cdr.markForCheck());
  }

  ngOnDestroy(): void {
    this.statusSub?.unsubscribe();
    this.costSub?.unsubscribe();
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
    const purchaseCtrl   = this.inventoryForm.get('purchasePrice');
    const wasteCtrl      = this.inventoryForm.get('wastePercent');
    const saleCtrl       = this.inventoryForm.get('salePrice');
    const productionCtrl = this.inventoryForm.get('productionCost');

    purchaseCtrl?.clearValidators();
    saleCtrl?.clearValidators();

    if (type === 'INSUMO') {
      purchaseCtrl?.setValidators([Validators.required, Validators.min(1)]);
      purchaseCtrl?.enable({ emitEvent: false });
      wasteCtrl?.enable({ emitEvent: false });
      saleCtrl?.setValidators([Validators.min(1)]);
      saleCtrl?.disable({ emitEvent: false });
      saleCtrl?.setValue(null, { emitEvent: false });
      productionCtrl?.setValue(null, { emitEvent: false });
    } else if (type === 'REVENTA') {
      purchaseCtrl?.setValidators([Validators.required, Validators.min(1)]);
      purchaseCtrl?.enable({ emitEvent: false });
      saleCtrl?.setValidators([Validators.required, Validators.min(1)]);
      saleCtrl?.enable({ emitEvent: false });
      wasteCtrl?.disable({ emitEvent: false });
      wasteCtrl?.setValue(null, { emitEvent: false });
      productionCtrl?.setValue(null, { emitEvent: false });
    } else if (type === 'ELABORADO' || type === 'TRANSFORMADO') {
      purchaseCtrl?.disable({ emitEvent: false });
      purchaseCtrl?.setValue(null, { emitEvent: false });
      wasteCtrl?.disable({ emitEvent: false });
      wasteCtrl?.setValue(null, { emitEvent: false });
      saleCtrl?.setValidators([Validators.required, Validators.min(1)]);
      saleCtrl?.enable({ emitEvent: false });
    }

    purchaseCtrl?.updateValueAndValidity({ emitEvent: false });
    saleCtrl?.updateValueAndValidity({ emitEvent: false });
  }

  private updateUnitValidators(unit: string): void {
    const newUnitCtrl = this.inventoryForm.get('newUnitName');
    if (unit === 'NEW_UNIT') {
      newUnitCtrl?.setValidators([Validators.required]);
    } else {
      newUnitCtrl?.clearValidators();
      newUnitCtrl?.setValue('', { emitEvent: false });
    }
    newUnitCtrl?.updateValueAndValidity({ emitEvent: false });
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
    const group = this.componentsFormArray.controls.find(c => c.get('idInsumo')?.value === id);
    if (group) return group.get('precioUnidad')?.value || 0;

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
    this.errorMessage = null;

    const raw = this.inventoryForm.getRawValue();
    const payload = this.buildSubmitPayload(raw);
    console.log('Payload a enviar:', payload);

    const request$ = this.mode === 'edit'
      ? this.inventoryService.update(raw.id, payload)
      : this.inventoryService.create(payload);

    request$.subscribe({
      next: (res: any) => {
        const id = this.mode === 'edit' ? raw.id : Number(res);
        const tieneComposicion = this.componentsFormArray.length > 0
          && (raw.type === 'ELABORADO' || raw.type === 'TRANSFORMADO');

        if (tieneComposicion) {
          const insumos = this.componentsFormArray.getRawValue().map((c: any) => ({
            idInsumo: c.idInsumo,
            cantidadUsada: c.cantidadUsada
          }));
          this.inventoryService.addComposicion(id, insumos).subscribe({
            next: () => this.formSaved.emit(),
            error: (err) => this.handleBackendError(err, 'composición')
          });
        } else {
          this.formSaved.emit();
        }
      },
      error: (err) => this.handleBackendError(err, 'producto')
    });
  }

  private buildSubmitPayload(raw: any): any {
    const tipo      = raw.type;
    const isInsumo  = tipo === 'INSUMO';
    const isReventa = tipo === 'REVENTA';

    // Para ELABORADO/TRANSFORMADO, precioCompra es null (lo calcula la composición).
    const precioCompra = (isInsumo || isReventa) ? raw.purchasePrice : null;
    // Para INSUMO, no hay precio de venta.
    const precioVenta = isInsumo ? null : raw.salePrice;

    const isNewUnit = raw.unit === 'NEW_UNIT';
    const idUnidadMedida   = isNewUnit ? null : this.tryParseId(raw.unit);
    const nuevaUnidadMedida = isNewUnit ? (raw.newUnitName || '').trim() || null : null;

    return {
      nombre: (raw.name || '').trim(),
      tipo,
      cantidad: raw.stock,
      stockMinimo: raw.minStock,
      idUnidadMedida,
      nuevaUnidadMedida,
      precioCompra,
      precioVenta,
      porcentajeSobrante: isInsumo ? raw.wastePercent : null
    };
  }

  private tryParseId(value: any): number | null {
    if (value === null || value === undefined || value === '' || value === 'NEW_UNIT') return null;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private handleBackendError(err: any, ctx: 'producto' | 'composición'): void {
    console.error(`Error al guardar ${ctx}`, err);
    const apiErr = err?.error;
    if (apiErr?.data && typeof apiErr.data === 'object') {
      const detalle = Object.values(apiErr.data).join(' • ');
      this.errorMessage = `${apiErr.message || 'Error de validación'}: ${detalle}`;
    } else if (apiErr?.message) {
      this.errorMessage = apiErr.message;
    } else {
      this.errorMessage = `Error al guardar la ${ctx}. Por favor, revisa los datos.`;
    }
    this.cdr.detectChanges();
  }

  onCancel(): void {
    this.formClose.emit();
  }
}
