import { ComponentFixture, TestBed } from '@angular/core/testing';
import { jest } from '@jest/globals';
import { SuccessDialogComponent } from './success-dialog';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

const mockDialogRef = { close: jest.fn() };

describe('SuccessDialogComponent', () => {
  let component: SuccessDialogComponent;
  let fixture: ComponentFixture<SuccessDialogComponent>;

  const baseData = {
    title: '¡Éxito!',
    message: 'La operación fue completada.',
    primaryActionLabel: 'Continuar',
    secondaryActionLabel: 'Crear otro',
    icon: 'check_circle',
    accentColor: 'primary' as const,
    detailLabel: 'Código',
    detailValue: 'PED-001'
  };

  beforeEach(async () => {
    mockDialogRef.close.mockClear();
    await TestBed.configureTestingModule({
      imports: [SuccessDialogComponent, BrowserAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: baseData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SuccessDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct data bound', () => {
    expect(component.data.title).toBe('¡Éxito!');
    expect(component.data.detailValue).toBe('PED-001');
  });

  it('should close with primary action', () => {
    component.onPrimary();
    expect(mockDialogRef.close).toHaveBeenCalledWith({ action: 'primary' });
  });

  it('should close with secondary action', () => {
    component.onSecondary();
    expect(mockDialogRef.close).toHaveBeenCalledWith({ action: 'secondary' });
  });

  it('should close with close action', () => {
    component.onClose();
    expect(mockDialogRef.close).toHaveBeenCalledWith({ action: 'close' });
  });

  it('should work with success accent color', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SuccessDialogComponent, BrowserAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { ...baseData, accentColor: 'success' } }
      ]
    }).compileComponents();
    const f = TestBed.createComponent(SuccessDialogComponent);
    f.detectChanges();
    expect(f.componentInstance.data.accentColor).toBe('success');
  });

  it('should work with warning accent color', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SuccessDialogComponent, BrowserAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { ...baseData, accentColor: 'warning' } }
      ]
    }).compileComponents();
    const f = TestBed.createComponent(SuccessDialogComponent);
    f.detectChanges();
    expect(f.componentInstance.data.accentColor).toBe('warning');
  });

  it('should work without optional fields', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SuccessDialogComponent, BrowserAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { title: 'OK', message: 'Done' } }
      ]
    }).compileComponents();
    const f = TestBed.createComponent(SuccessDialogComponent);
    f.detectChanges();
    expect(f.componentInstance).toBeTruthy();
  });
});
