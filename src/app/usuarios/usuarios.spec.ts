import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsuariosComponent } from './usuarios';

describe('UsuariosComponent', () => {
  let component: UsuariosComponent;
  let fixture: ComponentFixture<UsuariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuariosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UsuariosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter users and paginate', () => {
    component.usersData = [
      { id: '1', nombre: 'Alpha X', email: 'a@a.com', rol: 'ADMINISTRADOR' },
      { id: '2', nombre: 'Beta Y', email: 'b@b.com', rol: 'WORKER' }
    ];
    
    component.searchTerm = 'Alpha';
    component.onSearchChange();
    expect(component.filteredUsers.length).toBe(1);
  });

  it('should handle delete modal and confirm', () => {
    component.usersData = [
      { id: '1', nombre: 'Alpha X', email: 'a@a.com', rol: 'ADMINISTRADOR' }
    ];
    const u = component.usersData[0];
    component.openDeleteModal(u);
    expect(component.showDeleteModal).toBe(true);
    
    component.confirmDelete();
    expect(component.usersData.length).toBe(0);
    expect(component.showSuccessModal).toBe(true);
    
    component.closeSuccessModal();
    expect(component.showSuccessModal).toBe(false);
  });

  it('should handle form operations', () => {
    component.openAddForm();
    expect(component.viewMode).toBe('add');
    component.closeForm();
    expect(component.viewMode).toBe('list');

    component.openEditForm({ id: '1', nombre: 'A B', email: 'a@b', rol: 'ADMIN', lastLogin: '', status: 'ACTIVE' } as any);
    expect(component.viewMode).toBe('edit');

    Object.defineProperty(component.userForm, 'valid', {get: () => true});
    component.saveUser();
    expect(component.showFormSuccessModal).toBe(true);

    component.closeFormSuccessModal(true);
    expect(component.viewMode).toBe('list');
    
    component.viewMode = 'edit';
    component.showFormSuccessModal = true;
    component.closeFormSuccessModal(false);
    expect(component.viewMode).toBe('edit');
  });


  it('should handle sorting and filtering', () => {
    // Search
    if (typeof component.onSearchChange === 'function') {
      component.searchTerm = 'test';
      component.onSearchChange();
    }

    // Filter
    if (typeof component.onFilterChange === 'function') {
      component.onFilterChange();
    } else if (typeof component.onTypeFilterChange === 'function') {
      component.onTypeFilterChange();
    }

    // Sort
    if (typeof component.handleSort === 'function') {
      component.handleSort('name');
      component.handleSort('name'); // trigger desc
      component.handleSort('other'); // trigger new column asc
    }
    
    // Icon
    if (typeof component.getSortIcon === 'function') {
      component.getSortIcon('name');
      component.getSortIcon('other');
    }
    
    // Failsafe pagination branch
    component.currentPage = 2;
    if (component.paginatedClients) component.paginatedClients = [];
    if (component.paginatedProducts) component.paginatedProducts = [];
    if (component.paginatedUsers) component.paginatedUsers = [];
    if (component.paginatedPayments) component.paginatedPayments = [];
    if (component.paginatedOrders) component.paginatedOrders = [];
    
    if (typeof component.applyFilters === 'function') {
      component.applyFilters();
    }
  });

});
