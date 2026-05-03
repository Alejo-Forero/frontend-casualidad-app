import { ClientService } from '../core/services/client.service';
import { of, throwError } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientesComponent } from './clientes';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormControl, Validators } from '@angular/forms';
import { jest } from '@jest/globals';

const mockClient = { 
  idCliente: 1, id: '1', nombre: 'A', name: 'A', 
  direccion: 'D', address: 'D', 
  telefonos: ['1', '2'], isActive: true, ordersSummary: { total: 0 } 
} as any;

describe('ClientesComponent', () => {
  let component: ClientesComponent;
  let fixture: ComponentFixture<ClientesComponent>;
  let mockClientService: any;
  let mockDialog: any;

  beforeEach(async () => {
    mockClientService = {
      getAll: jest.fn(() => of([mockClient])),
      delete: jest.fn(() => of({})),
      create: jest.fn(() => of({ id: 1 })),
      update: jest.fn(() => of({}))
    };
    mockDialog = { open: jest.fn(() => ({ afterClosed: () => of({ action: 'primary' }) })) };

    await TestBed.configureTestingModule({
      imports: [ClientesComponent, BrowserAnimationsModule],
      providers: [
        { provide: ClientService, useValue: mockClientService },
        { provide: MatDialog, useValue: mockDialog }
      ],
    })
    .overrideProvider(MatDialog, { useValue: mockDialog })
    .compileComponents();

    fixture = TestBed.createComponent(ClientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should handle phone helpers', () => {
    component.openAddForm();
    expect(component.phonesFormArray.length).toBe(1);
    component.addPhone();
    expect(component.phonesFormArray.length).toBe(2);
    component.removePhone(0);
    expect(component.phonesFormArray.length).toBe(1);

    component.openEditForm(mockClient);
    expect(component.phonesFormArray.length).toBe(2);
    expect(component.phonesFormArray.at(0).value).toBe('1');
    
    component.closeForm();
    expect(component.viewMode).toBe('list');
  });

  it('should save client (create and update)', () => {
    component.openAddForm();
    component.clientForm.patchValue({ name: 'N', address: 'D' });
    component.phonesFormArray.at(0).setValue('123');
    component.saveClient();
    expect(mockClientService.create).toHaveBeenCalled();

    component.openEditForm(mockClient);
    component.clientForm.patchValue({ name: 'U' });
    component.saveClient();
    expect(mockClientService.update).toHaveBeenCalled();
  });
});
