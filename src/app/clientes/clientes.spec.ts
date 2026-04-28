import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientesComponent } from './clientes';

describe('ClientesComponent', () => {
  let component: ClientesComponent;
  let fixture: ComponentFixture<ClientesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter clients correctly', () => {
    component.clientsData = [
      { idCliente: 1, id: '1', nombre: 'Alpha', name: 'Alpha', direccion: '', address: '', telefonos: ['1'], phones: ['1'], isActive: true, ordersSummary: {total:0, pending:0, inProduction:0}, createdAt: '' },
      { idCliente: 2, id: '2', nombre: 'Beta', name: 'Beta', direccion: '', address: '', telefonos: ['2'], phones: ['2'], isActive: true, ordersSummary: {total:0, pending:0, inProduction:0}, createdAt: '' }
    ];
    
    component.searchTerm = 'Alpha';
    component.onSearchChange();
    expect(component.filteredClients.length).toBe(1);
    expect(component.filteredClients[0].name).toBe('Alpha');
  });

  it('should handle pagination', () => {
    component.clientsData = Array(10).fill({ idCliente: 1, id: '1', nombre: 'Alpha', name: 'Alpha', direccion: '', address: '', telefonos: ['1'], phones: ['1'], isActive: true, ordersSummary: {total:0, pending:0, inProduction:0}, createdAt: '' });
    component.pageSize = 3;
    component.searchTerm = '';
    component.onSearchChange();
    
    component.onPageChange(2);
    expect(component.paginatedClients.length).toBe(3);
  });

  it('should handle products modal', () => {
    const c = component.clientsData[0];
    component.openProductsModal(c);
    expect(component.showProductsModal).toBe(true);
    component.closeProductsModal();
    expect(component.showProductsModal).toBe(false);
  });

  it('should handle delete modal and confirm', () => {
    component.clientsData = [
      { idCliente: 1, id: '1', nombre: 'Alpha', name: 'Alpha', direccion: '', address: '', telefonos: ['1'], phones: ['1'], isActive: true, ordersSummary: {total:0, pending:0, inProduction:0}, createdAt: '' }
    ];
    const c = component.clientsData[0];
    
    component.openDeleteModal(c);
    expect(component.showDeleteModal).toBe(true);
    
    component.confirmDelete();
    expect(component.clientsData.length).toBe(0);
    expect(component.showDeleteModal).toBe(false);
  });
});
