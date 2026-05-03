import { ComponentFixture, TestBed } from '@angular/core/testing';
import { jest } from '@jest/globals';
import { ConfirmDialogComponent } from './confirm-dialog';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

const mockDialogRef = { close: jest.fn() };

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;

  const baseData = {
    title: 'Confirm?',
    message: 'Are you sure?',
    highlightText: 'Item',
    warningText: 'This is irreversible.',
    confirmLabel: 'Yes',
    cancelLabel: 'No',
    icon: 'delete_forever',
    accentColor: 'error' as const
  };

  beforeEach(async () => {
    mockDialogRef.close.mockClear();
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, BrowserAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: baseData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have correct data', () => {
    expect(component.data.title).toBe('Confirm?');
    expect(component.data.message).toBe('Are you sure?');
  });

  it('should close with true when confirmed', () => {
    component.onConfirm();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should close with false when cancelled', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should work with primary accent color', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, BrowserAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { ...baseData, accentColor: 'primary' } }
      ]
    }).compileComponents();
    const f = TestBed.createComponent(ConfirmDialogComponent);
    f.detectChanges();
    expect(f.componentInstance.data.accentColor).toBe('primary');
  });

  it('should work with warning accent color', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, BrowserAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { ...baseData, accentColor: 'warning' } }
      ]
    }).compileComponents();
    const f = TestBed.createComponent(ConfirmDialogComponent);
    f.detectChanges();
    expect(f.componentInstance.data.accentColor).toBe('warning');
  });

  it('should work without optional fields', async () => {
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, BrowserAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { title: 'Test', message: 'Msg' } }
      ]
    }).compileComponents();
    const f = TestBed.createComponent(ConfirmDialogComponent);
    f.detectChanges();
    expect(f.componentInstance).toBeTruthy();
  });
});
