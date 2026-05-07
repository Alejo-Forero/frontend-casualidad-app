import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { LogoutDialogComponent } from './logout-dialog';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

describe('LogoutDialogComponent', () => {
  let component: LogoutDialogComponent;
  let fixture: ComponentFixture<LogoutDialogComponent>;
  let mockDialogRef: any;
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockDialogRef = {
      close: jest.fn()
    };

    mockAuthService = {
      clearSession: jest.fn()
    };

    mockRouter = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [LogoutDialogComponent, CommonModule, MatDialogModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LogoutDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call clearSession and navigate to login on confirm', () => {
    component.onConfirm();
    expect(mockAuthService.clearSession).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalled();
    expect(mockAuthService.clearSession).not.toHaveBeenCalled();
  });
});
