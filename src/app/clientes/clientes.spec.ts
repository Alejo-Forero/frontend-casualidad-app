import { ClientService } from '../core/services/client.service';
import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientesComponent } from './clientes';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

const mockClientService = {
  getAll: () => of([]),
  delete: () => of({}),
  create: () => of({}),
  update: () => of({})
};

const mockClient = {
  idCliente: 1, id: '1', nombre: 'Alpha', name: 'Alpha',
  direccion: '', address: '', telefonos: ['1'], phones: ['1'],
  isActive: true, ordersSummary: { total: 0, pending: 0, inProduction: 0 }, createdAt: ''
} as any;

describe('ClientesComponent', () => {
  let component: ClientesComponent;
  let fixture: ComponentFixture<ClientesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        { provide: ClientService, useValue: mockClientService }
      ],
      imports: [ClientesComponent, BrowserAnimationsModule],
    })
    .overrideProvider(MatDialog, { useValue: { open: () => ({ afterClosed: () => of({ action: 'primary' }) }) } })
    .compileComponents();

    fixture = TestBed.createComponent(ClientesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter clients via dataSource filter', () => {
    component.clientsData = [
      { ...mockClient, id: '1', name: 'Alpha' },
      { ...mockClient, id: '2', name: 'Beta' }
    ];
    component.dataSource.data = component.clientsData;
    component.searchTerm = 'Alpha';
    component.onSearchChange();
    expect(component.dataSource.filter).toBe('alpha');
  });

  it('should handle search and clear', () => {
    component.clientsData = Array(10).fill(mockClient);
    component.dataSource.data = component.clientsData;
    component.searchTerm = 'test';
    component.onSearchChange();
    expect(component.dataSource.filter).toBe('test');
    component.searchTerm = '';
    component.onSearchChange();
    expect(component.dataSource.filter).toBe('');
  });

  it('should handle openProductsModal', () => {
    component.clientsData = [mockClient];
    // Should call dialog.open without errors
    component.openProductsModal(mockClient);
    expect(component).toBeTruthy();
  });

  it('should handle openDeleteModal', () => {
    component.clientsData = [mockClient];
    // Should call dialog.open without errors
    component.openDeleteModal(mockClient);
    expect(component).toBeTruthy();
  });

  it('should handle openAddForm and closeForm', () => {
    component.openAddForm();
    expect(component.viewMode).toBe('add');
    component.closeForm();
    expect(component.viewMode).toBe('list');
  });

  it('should handle openEditForm', () => {
    component.openEditForm({ id: '1', phones: ['123', '456'] } as any);
    expect(component.viewMode).toBe('edit');
  });

  it('should handle saveClient with invalid form', () => {
    component.openAddForm();
    component.saveClient();
    expect(component.viewMode).toBe('add');
  });

  it('should handle addPhoneField and removePhoneField', () => {
    component.openAddForm();
    component.addPhoneField();
    const before = component.phonesFormArray.length;
    component.removePhoneField(0);
    expect(component.phonesFormArray.length).toBe(before - 1);
  });
});
