import { TestBed } from '@angular/core/testing';
import { jest } from '@jest/globals';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { UIService } from './ui.service';
import { SuccessDialogComponent } from '../../shared/components/success-dialog/success-dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog';

describe('UIService', () => {
  let service: UIService;
  let mockDialog: { open: jest.Mock };

  beforeEach(() => {
    mockDialog = {
      open: jest.fn().mockReturnValue({
        afterClosed: () => of(true)
      })
    };

    TestBed.configureTestingModule({
      providers: [
        UIService,
        { provide: MatDialog, useValue: mockDialog }
      ]
    });
    service = TestBed.inject(UIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should open SuccessDialog on showSuccess', (done) => {
    service.showSuccess({ title: 'Test', message: 'Test Message' }).subscribe(result => {
      expect(mockDialog.open).toHaveBeenCalledWith(SuccessDialogComponent, expect.objectContaining({
        data: expect.objectContaining({ title: 'Test' })
      }));
      expect(result).toBe(true);
      done();
    });
  });

  it('should open ConfirmDialog on showConfirm', (done) => {
    service.showConfirm({ title: 'Confirm?', message: 'Are you sure?' }).subscribe(result => {
      expect(mockDialog.open).toHaveBeenCalledWith(ConfirmDialogComponent, expect.objectContaining({
        data: expect.objectContaining({ title: 'Confirm?' })
      }));
      expect(result).toBe(true);
      done();
    });
  });

  it('should open Error dialog on showError', (done) => {
    service.showError('Something failed').subscribe(() => {
      expect(mockDialog.open).toHaveBeenCalledWith(SuccessDialogComponent, expect.objectContaining({
        data: expect.objectContaining({ 
          title: '¡Algo salió mal!',
          message: 'Something failed',
          accentColor: 'warning'
        })
      }));
      done();
    });
  });
});
