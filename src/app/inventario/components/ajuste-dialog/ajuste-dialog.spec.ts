import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AjusteDialogComponent } from './ajuste-dialog';
import { jest } from '@jest/globals';

describe('AjusteDialogComponent', () => {
  let component: AjusteDialogComponent;
  let fixture: ComponentFixture<AjusteDialogComponent>;
  let mockDialogRef: any;

  const mockData = {
    product: {
      id: '1',
      idProducto: 1,
      nombre: 'Test Product',
      cantidadDisponible: 10
    }
  };

  beforeEach(async () => {
    mockDialogRef = {
      close: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, AjusteDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AjusteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with data', () => {
    expect(component.ajusteForm.get('idProducto')?.value).toBe(1);
    expect(component.ajusteForm.get('cantidadNueva')?.value).toBe(10);
  });

  it('should close dialog with form value on submit when valid', () => {
    component.ajusteForm.patchValue({
      cantidadNueva: 5,
      motivo: 'Conteo físico de fin de mes'
    });
    component.submit();
    expect(mockDialogRef.close).toHaveBeenCalledWith({
      idProducto: 1,
      cantidadNueva: 5,
      motivo: 'Conteo físico de fin de mes'
    });
  });

  it('should not close dialog if reason is too short', () => {
    component.ajusteForm.patchValue({
      cantidadNueva: 5,
      motivo: 'Too short'
    });
    component.submit();
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });
});
