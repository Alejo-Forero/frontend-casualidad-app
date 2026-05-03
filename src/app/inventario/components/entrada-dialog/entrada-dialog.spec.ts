import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EntradaDialogComponent } from './entrada-dialog';
import { jest } from '@jest/globals';

describe('EntradaDialogComponent', () => {
  let component: EntradaDialogComponent;
  let fixture: ComponentFixture<EntradaDialogComponent>;
  let mockDialogRef: any;

  const mockData = {
    product: {
      id: '1',
      idProducto: 1,
      name: 'Test Product',
      stock: 10
    },
    motivos: [
      { value: 'COMPRA_INSUMOS', label: 'Compra' },
      { value: 'AJUSTE', label: 'Ajuste' }
    ]
  };

  beforeEach(async () => {
    mockDialogRef = {
      close: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, EntradaDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EntradaDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with data', () => {
    expect(component.entradaForm.get('idProducto')?.value).toBe(1);
    expect(component.entradaForm.get('motivo')?.value).toBe('COMPRA_INSUMOS');
  });

  it('should close dialog with form value on submit', () => {
    component.entradaForm.patchValue({ cantidad: 50 });
    component.submit();
    expect(mockDialogRef.close).toHaveBeenCalledWith({
      idProducto: 1,
      cantidad: 50,
      motivo: 'COMPRA_INSUMOS'
    });
  });

  it('should not close dialog if form is invalid', () => {
    component.entradaForm.patchValue({ cantidad: -1 });
    component.submit();
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });
});
