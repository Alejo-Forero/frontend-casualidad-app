import { ComponentFixture, TestBed } from '@angular/core/testing';
import { jest } from '@jest/globals';
import { ClientesComponent } from './clientes';
import { ClientService } from '../core/services/client.service';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { ClientDTO } from '../core/models/client.dto';

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeClient = (overrides: Partial<ClientDTO> = {}): ClientDTO =>
({
  id: '1',
  name: 'Juan Pérez',
  address: 'Calle 123',
  phones: ['3001234567'],
  isActive: true,
  ordersSummary: { total: 0 },
  ...overrides,
} as any);

const dialogRefStub = (result: any) => ({
  afterClosed: () => of(result),
});

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('ClientesComponent', () => {
  let component: ClientesComponent;
  let fixture: ComponentFixture<ClientesComponent>;
  let mockClientService: jest.Mocked<Partial<ClientService>>;
  let mockDialog: { open: jest.Mock };

  beforeEach(async () => {
    mockClientService = {
      getAll: jest.fn(() => of([])),
      create: jest.fn(() => of({ id: 1 })),
      update: jest.fn(() => of({})),
      delete: jest.fn(() => of<void>()),
    };

    mockDialog = { open: jest.fn(() => dialogRefStub({ action: 'primary' })) };

    await TestBed.configureTestingModule({
      imports: [ClientesComponent, BrowserAnimationsModule],
      providers: [
        { provide: ClientService, useValue: mockClientService },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).overrideProvider(MatDialog, { useValue: mockDialog })
      .compileComponents();

    fixture = TestBed.createComponent(ClientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Creación ──────────────────────────────────────────────────────────────

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should start in list view mode', () => {
    expect(component.viewMode).toBe('list');
  });

  // ── loadClients ───────────────────────────────────────────────────────────

  it('should load clients on init', () => {
    const clients = [makeClient(), makeClient({ id: '2', name: 'Ana' })];
    (mockClientService.getAll as jest.Mock).mockReturnValue(of(clients));
    component.loadClients();
    expect(component.clientsData.length).toBe(2);
    expect(component.dataSource.data.length).toBe(2);
  });

  it('should log error when loading clients fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    (mockClientService.getAll as jest.Mock).mockReturnValue(throwError(() => new Error('fail')));
    component.loadClients();
    expect(consoleSpy).toHaveBeenCalledWith('Error loading clients', expect.any(Error));
    consoleSpy.mockRestore();
  });

  // ── onSearchChange ────────────────────────────────────────────────────────

  it('should apply filter on search change', () => {
    component.searchTerm = '  Juan  ';
    component.onSearchChange();
    expect(component.dataSource.filter).toBe('juan');
  });

  it('should reset paginator on search change', () => {
    const firstPageSpy = jest.fn();
    component.dataSource.paginator = { firstPage: firstPageSpy, page: of() } as any;
    component.searchTerm = 'test';
    component.onSearchChange();
    expect(firstPageSpy).toHaveBeenCalled();
  });

  // ── filterPredicate ───────────────────────────────────────────────────────

  it('filterPredicate should match by name', () => {
    const predicate = component.dataSource.filterPredicate;
    const client = makeClient({ name: 'Carlos López', id: 'abc' });
    expect(predicate(client, 'carlos')).toBe(true);
  });

  it('filterPredicate should match by id', () => {
    const predicate = component.dataSource.filterPredicate;
    const client = makeClient({ name: 'X', id: 'xyz999' });
    expect(predicate(client, 'xyz999')).toBe(true);
  });

  it('filterPredicate should not match unrelated strings', () => {
    const predicate = component.dataSource.filterPredicate;
    const client = makeClient({ name: 'Carlos', id: '1' });
    expect(predicate(client, 'zzz')).toBe(false);
  });

  // ── sortingDataAccessor ───────────────────────────────────────────────────

  it('sortingDataAccessor should return lowercase name', () => {
    fixture.detectChanges();
    const accessor = component.dataSource.sortingDataAccessor;
    const client = makeClient({ name: 'JUAN' });
    expect(accessor(client, 'name')).toBe('juan');
  });

  it('sortingDataAccessor should return 1 for active client', () => {
    const accessor = component.dataSource.sortingDataAccessor;
    expect(accessor(makeClient({ isActive: true }), 'isActive')).toBe(1);
  });

  it('sortingDataAccessor should return 0 for inactive client', () => {
    const accessor = component.dataSource.sortingDataAccessor;
    expect(accessor(makeClient({ isActive: false }), 'isActive')).toBe(0);
  });

  it('sortingDataAccessor should return pedidos total', () => {
    const accessor = component.dataSource.sortingDataAccessor;
    const client = makeClient({ ordersSummary: { total: 7 } } as any);
    expect(accessor(client, 'pedidos')).toBe(7);
  });

  it('sortingDataAccessor should return empty string for unknown property', () => {
    const accessor = component.dataSource.sortingDataAccessor;
    expect(accessor(makeClient(), 'nonexistent')).toBe('');
  });

  // ── phonesFormArray helpers ────────────────────────────────────────────────

  it('addPhoneField should add a new phone control', () => {
    component.openAddForm();
    component.addPhoneField();
    expect(component.phonesFormArray.length).toBe(2);
  });

  it('removePhoneField should remove a phone when more than one exists', () => {
    component.openAddForm();
    component.addPhoneField();
    expect(component.phonesFormArray.length).toBe(2);
    component.removePhoneField(0);
    expect(component.phonesFormArray.length).toBe(1);
  });

  it('removePhoneField should NOT remove the last phone', () => {
    component.openAddForm();
    expect(component.phonesFormArray.length).toBe(1);
    component.removePhoneField(0);
    expect(component.phonesFormArray.length).toBe(1);
  });

  // ── openAddForm ───────────────────────────────────────────────────────────

  it('openAddForm should switch to add mode', () => {
    component.openAddForm();
    expect(component.viewMode).toBe('add');
  });

  it('openAddForm should reset error message', () => {
    component.errorMessage = 'old error';
    component.openAddForm();
    expect(component.errorMessage).toBeNull();
  });

  it('openAddForm should reset phones array with one empty control', () => {
    component.addPhoneField();
    component.addPhoneField();
    component.openAddForm();
    expect(component.phonesFormArray.length).toBe(1);
  });

  // ── openEditForm ──────────────────────────────────────────────────────────

  it('openEditForm should switch to edit mode', () => {
    component.openEditForm(makeClient());
    expect(component.viewMode).toBe('edit');
  });

  it('openEditForm should patch form values', () => {
    const client = makeClient({ name: 'María', address: 'Av 45' });
    component.openEditForm(client);
    expect(component.clientForm.get('name')?.value).toBe('María');
    expect(component.clientForm.get('address')?.value).toBe('Av 45');
  });

  it('openEditForm should populate phones from client.phones', () => {
    const client = makeClient({ phones: ['111', '222', '333'] });
    component.openEditForm(client);
    expect(component.phonesFormArray.length).toBe(3);
    expect(component.phonesFormArray.at(1).value).toBe('222');
  });

  it('openEditForm should add empty phone control when client has no phones', () => {
    const client = makeClient({ phones: [] });
    component.openEditForm(client);
    expect(component.phonesFormArray.length).toBe(1);
    expect(component.phonesFormArray.at(0).value).toBe('');
  });

  it('openEditForm should clear error message', () => {
    component.errorMessage = 'previous error';
    component.openEditForm(makeClient());
    expect(component.errorMessage).toBeNull();
  });

  // ── closeForm ─────────────────────────────────────────────────────────────

  it('closeForm should return to list mode', () => {
    component.viewMode = 'edit';
    component.closeForm();
    expect(component.viewMode).toBe('list');
  });

  // ── openProductsModal ─────────────────────────────────────────────────────

  it('openProductsModal should open a dialog', () => {
    const client = makeClient();
    component.openProductsModal(client);
    expect(mockDialog.open).toHaveBeenCalled();
  });

  // ── openDeleteModal ───────────────────────────────────────────────────────

  it('openDeleteModal should skip dialog when client has orders', () => {
    const client = makeClient({ ordersSummary: { total: 3 } } as any);
    component.openDeleteModal(client);
    expect(mockDialog.open).not.toHaveBeenCalled();
  });

  it('openDeleteModal should call delete when confirmed', () => {
    mockDialog.open.mockReturnValue(dialogRefStub(true));
    component.openDeleteModal(makeClient());
    expect(mockClientService.delete).toHaveBeenCalledWith('1');
  });

  it('openDeleteModal should NOT call delete when cancelled', () => {
    mockDialog.open.mockReturnValue(dialogRefStub(false));
    component.openDeleteModal(makeClient());
    expect(mockClientService.delete).not.toHaveBeenCalled();
  });

  it('openDeleteModal should log error when delete fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    mockDialog.open.mockReturnValue(dialogRefStub(true));
    (mockClientService.delete as jest.Mock).mockReturnValue(throwError(() => new Error('delete failed')));
    component.openDeleteModal(makeClient());
    expect(consoleSpy).toHaveBeenCalledWith('Error deleting client', expect.any(Error));
    consoleSpy.mockRestore();
  });

  // ── saveClient — validación ───────────────────────────────────────────────

  it('saveClient should mark form as touched and not submit when invalid', () => {
    component.openAddForm();
    component.clientForm.get('name')?.setValue('');
    component.saveClient();
    expect(mockClientService.create).not.toHaveBeenCalled();
  });

  // ── saveClient — crear ────────────────────────────────────────────────────

  it('saveClient should call create when in add mode', () => {
    component.openAddForm();
    component.clientForm.patchValue({ name: 'Nuevo Cliente', address: 'Cra 1' });
    component.phonesFormArray.at(0).setValue('3009876543');
    component.saveClient();
    expect(mockClientService.create).toHaveBeenCalled();
  });

  it('saveClient should go to list after primary action on success dialog', () => {
    mockDialog.open.mockReturnValue(dialogRefStub({ action: 'primary' }));
    component.openAddForm();
    component.clientForm.patchValue({ name: 'N', address: '' });
    component.phonesFormArray.at(0).setValue('3001111111');
    component.saveClient();
    expect(component.viewMode).toBe('list');
  });

  it('saveClient should go to list when dialog result is null', () => {
    mockDialog.open.mockReturnValue(dialogRefStub(null));
    component.openAddForm();
    component.clientForm.patchValue({ name: 'N' });
    component.phonesFormArray.at(0).setValue('300');
    component.saveClient();
    expect(component.viewMode).toBe('list');
  });

  it('saveClient should call openAddForm again on secondary action after create', () => {
    mockDialog.open.mockReturnValue(dialogRefStub({ action: 'secondary' }));
    const openAddSpy = jest.spyOn(component, 'openAddForm');
    component.openAddForm();
    component.clientForm.patchValue({ name: 'N' });
    component.phonesFormArray.at(0).setValue('300');
    component.saveClient();
    // called once manually + once from dialog secondary handler
    expect(openAddSpy).toHaveBeenCalledTimes(2);
  });

  it('saveClient should stay in edit mode on secondary action when editing', () => {
    mockDialog.open.mockReturnValue(dialogRefStub({ action: 'secondary' }));
    component.openEditForm(makeClient());
    component.clientForm.patchValue({ name: 'Editado' });
    component.saveClient();
    // secondary action with isEdit=true does NOT call openAddForm → stays in current state
    expect(mockClientService.update).toHaveBeenCalled();
  });

  // ── saveClient — editar ───────────────────────────────────────────────────

  it('saveClient should call update when in edit mode', () => {
    component.openEditForm(makeClient());
    component.clientForm.patchValue({ name: 'Editado' });
    component.saveClient();
    expect(mockClientService.update).toHaveBeenCalled();
  });

  // ── saveClient — errores HTTP ─────────────────────────────────────────────

  it('saveClient should set duplicate-phone error for status 400', () => {
    (mockClientService.create as jest.Mock).mockReturnValue(throwError(() => ({ status: 400 })));
    component.openAddForm();
    component.clientForm.patchValue({ name: 'N' });
    component.phonesFormArray.at(0).setValue('300');
    component.saveClient();
    expect(component.errorMessage).toContain('teléfono');
  });

  it('saveClient should set duplicate-phone error for status 409', () => {
    (mockClientService.create as jest.Mock).mockReturnValue(throwError(() => ({ status: 409 })));
    component.openAddForm();
    component.clientForm.patchValue({ name: 'N' });
    component.phonesFormArray.at(0).setValue('300');
    component.saveClient();
    expect(component.errorMessage).toContain('teléfono');
  });

  it('saveClient should set duplicate-phone error for status 500', () => {
    (mockClientService.create as jest.Mock).mockReturnValue(throwError(() => ({ status: 500 })));
    component.openAddForm();
    component.clientForm.patchValue({ name: 'N' });
    component.phonesFormArray.at(0).setValue('300');
    component.saveClient();
    expect(component.errorMessage).toContain('teléfono');
  });

  it('saveClient should set generic error for other status codes', () => {
    (mockClientService.create as jest.Mock).mockReturnValue(throwError(() => ({ status: 503 })));
    component.openAddForm();
    component.clientForm.patchValue({ name: 'N' });
    component.phonesFormArray.at(0).setValue('300');
    component.saveClient();
    expect(component.errorMessage).toContain('error al guardar');
  });
});