import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ClientProductsDialogComponent } from './client-products-dialog';

describe('ClientProductsDialogComponent', () => {
  let component: ClientProductsDialogComponent;
  let fixture: ComponentFixture<ClientProductsDialogComponent>;

  const getMockData = (total = 0) => ({
    client: {
      id: '1',
      name: 'Test Client',
      ordersSummary: { total }
    }
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientProductsDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: getMockData(0) }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(ClientProductsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should show empty message if no orders', () => {
    fixture = TestBed.createComponent(ClientProductsDialogComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Este cliente no tiene pedidos registrados');
  });

  it('should show loading message if has orders', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ClientProductsDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: getMockData(5) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClientProductsDialogComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cargando detalles de los 5 pedidos');
  });
});
