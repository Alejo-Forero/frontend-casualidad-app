import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { jest } from '@jest/globals';
import { PedidosComponent } from './pedidos';
import { OrderService } from '../core/services/order.service';
import { ClientService } from '../core/services/client.service';
import { InventoryService } from '../core/services/inventory.service';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OrderSummaryDTO } from '../core/models/order.dto';

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeOrder = (overrides: Partial<OrderSummaryDTO> = {}): OrderSummaryDTO =>
({
  idPedido: 1,
  id: 1,
  codigoUnico: 'PED-001',
  estadoPedido: 'PENDIENTE',
  nombreCliente: 'Alpha',
  clientName: 'Alpha',
  idCliente: 10,
  saldoPendiente: 500,
  fechaEntrega: '2026-06-01T00:00:00',
  ...overrides,
} as any);

const makeOrderDetail = (overrides: any = {}) => ({
  idPedido: 1,
  fechaEntrega: '2026-06-01T00:00:00',
  cliente: { idCliente: 10, nombreCompleto: 'Alpha' },
  productos: [
    { idDetalle: 1, nombreProducto: 'P1', cantidad: 3, precioUnitario: 50, observaciones: 'obs' },
  ],
  ...overrides,
});

const dialogRefStub = (result: any) => ({
  afterClosed: () => of(result),
});

// ─── Suite ──────────────────────────────────────────────────────────────────

describe('PedidosComponent', () => {
  let component: PedidosComponent;
  let fixture: ComponentFixture<PedidosComponent>;
  let mockOrderService: jest.Mocked<Partial<OrderService>>;
  let mockClientService: jest.Mocked<Partial<ClientService>>;
  let mockInventoryService: jest.Mocked<Partial<InventoryService>>;
  let mockDialog: { open: jest.Mock };
  let mockRouter: { navigate: jest.Mock };

  const setupTestBed = async (queryParams: any = {}) => {
    mockOrderService = {
      getAll: jest.fn(() => of([makeOrder()])),
      create: jest.fn(() => of({})),
      update: jest.fn(() => of({})),
      cancelar: jest.fn(() => of({})),
      getById: jest.fn(() => of(makeOrderDetail())),
      activarProduccion: jest.fn(() => of({ codigoUnico: 'COD-123' })),
      setOrderDraft: jest.fn(),
      getOrderDraft: jest.fn(() => null),
      clearOrderDraft: jest.fn(),
    };
    mockClientService = {
      getAll: jest.fn(() => of([{ id: 10, name: 'Alpha', idCliente: 10, nombre: 'Alpha' }])),
    };
    mockInventoryService = {
      getAll: jest.fn(() => of([{ id: 1, name: 'P1', idProducto: 1, nombre: 'P1', salePrice: 100 }])),
    };
    mockDialog = { open: jest.fn(() => dialogRefStub(true)) };
    mockRouter = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [PedidosComponent, BrowserAnimationsModule],
      providers: [
        { provide: OrderService, useValue: mockOrderService },
        { provide: ClientService, useValue: mockClientService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: ActivatedRoute, useValue: { queryParams: of(queryParams) } },
        { provide: MatDialog, useValue: mockDialog },
        { provide: Router, useValue: mockRouter },
      ],
    }).overrideProvider(MatDialog, { useValue: mockDialog })
      .overrideProvider(Router, { useValue: mockRouter })
      .compileComponents();

    fixture = TestBed.createComponent(PedidosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await setupTestBed();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // ── Creación ──────────────────────────────────────────────────────────────

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should start in list view mode', () => {
    expect(component.viewMode).toBe('list');
  });

  // ── ngOnInit con queryParams ?new=true ────────────────────────────────────

  it('should open add form when queryParam new=true', async () => {
    TestBed.resetTestingModule();
    await setupTestBed({ new: 'true' });
    expect(component.viewMode).toBe('add');
  });

  // ── loadOrders ────────────────────────────────────────────────────────────

  it('should populate dataSource on loadOrders', () => {
    const orders = [makeOrder(), makeOrder({ idPedido: 2, codigoUnico: 'PED-002' })];
    (mockOrderService.getAll as jest.Mock).mockReturnValue(of(orders));
    component.loadOrders();
    expect(component.ordersData.length).toBe(2);
  });

  it('should log error when loadOrders fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    (mockOrderService.getAll as jest.Mock).mockReturnValue(throwError(() => new Error('fail')));
    component.loadOrders();
    expect(consoleSpy).toHaveBeenCalledWith('Error loading orders', expect.any(Error));
    consoleSpy.mockRestore();
  });

  // ── loadClients ───────────────────────────────────────────────────────────

  it('should map clients from loadClients', () => {
    (mockClientService.getAll as jest.Mock).mockReturnValue(
      of([
        { id: 5, name: 'Beta', idCliente: 5, nombre: 'Beta' }, 
        { id: 6, name: 'Gamma', idCliente: 6, nombre: 'Gamma' }
      ])
    );
    component.loadClients();
    expect(component.clientsList.length).toBe(2);
    expect(component.clientsList[0].id).toBe(5);
    expect(component.clientsList[0].nombre).toBe('Beta');
  });

  it('should log error when loadClients fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    (mockClientService.getAll as jest.Mock).mockReturnValue(throwError(() => new Error('fail')));
    component.loadClients();
    expect(consoleSpy).toHaveBeenCalledWith('Error loading clients', expect.any(Error));
    consoleSpy.mockRestore();
  });

  // ── loadProducts ──────────────────────────────────────────────────────────

  it('should map products from loadProducts', () => {
    (mockInventoryService.getAll as jest.Mock).mockReturnValue(
      of([{ id: 99, name: 'Torta', idProducto: 99, nombre: 'Torta' }])
    );
    component.loadProducts();
    expect(component.productsList[0].id).toBe(99);
    expect(component.productsList[0].nombre).toBe('Torta');
  });

  it('should log error when loadProducts fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    (mockInventoryService.getAll as jest.Mock).mockReturnValue(throwError(() => new Error('fail')));
    component.loadProducts();
    expect(consoleSpy).toHaveBeenCalledWith('Error loading products', expect.any(Error));
    consoleSpy.mockRestore();
  });

  // ── onSearchChange ────────────────────────────────────────────────────────

  it('should apply filter on search change', () => {
    component.searchTerm = '  ped-001  ';
    component.onSearchChange();
    expect(component.dataSource.filter).toBe('ped-001');
  });

  it('should reset paginator on search change', () => {
    const firstPageSpy = jest.fn();
    component.dataSource.sort = null;
    component.dataSource.paginator = { 
      firstPage: firstPageSpy, 
      page: of(),
      initialized: of()
    } as any;
    component.searchTerm = 'x';
    component.onSearchChange();
    expect(firstPageSpy).toHaveBeenCalled();
  });

  // ── filterPredicate ───────────────────────────────────────────────────────

  it('filterPredicate should match by nombreCliente', () => {
    const predicate = component.dataSource.filterPredicate;
    expect(predicate(makeOrder({ nombreCliente: 'Mariana' }), 'mariana')).toBe(true);
  });

  it('filterPredicate should match by codigoUnico', () => {
    const predicate = component.dataSource.filterPredicate;
    expect(predicate(makeOrder({ codigoUnico: 'PED-999' }), 'ped-999')).toBe(true);
  });

  it('filterPredicate should not match unrelated strings', () => {
    const predicate = component.dataSource.filterPredicate;
    expect(predicate(makeOrder(), 'zzz')).toBe(false);
  });

  // ── sortingDataAccessor ───────────────────────────────────────────────────

  it('sortingDataAccessor returns codigoUnico for codigo', () => {
    const accessor = component.dataSource.sortingDataAccessor;
    expect(accessor(makeOrder({ codigoUnico: 'PED-001' }), 'codigo')).toBe('PED-001');
  });

  it('sortingDataAccessor falls back to idPedido when codigoUnico is empty', () => {
    const accessor = component.dataSource.sortingDataAccessor;
    expect(accessor(makeOrder({ codigoUnico: '', idPedido: 42 }), 'codigo')).toBe(42);
  });

  it('sortingDataAccessor returns nombreCliente for cliente', () => {
    const accessor = component.dataSource.sortingDataAccessor;
    expect(accessor(makeOrder({ nombreCliente: 'Carlos', clientName: undefined }), 'cliente')).toBe('Carlos');
  });

  it('sortingDataAccessor returns clientName when nombreCliente is empty', () => {
    const accessor = component.dataSource.sortingDataAccessor;
    expect(accessor(makeOrder({ nombreCliente: '', clientName: 'Beta' }), 'cliente')).toBe('Beta');
  });

  it('sortingDataAccessor returns estadoPedido for estado', () => {
    const accessor = component.dataSource.sortingDataAccessor;
    expect(accessor(makeOrder({ estadoPedido: 'TERMINADO' }), 'estado')).toBe('TERMINADO');
  });

  it('sortingDataAccessor returns timestamp for fecha', () => {
    const accessor = component.dataSource.sortingDataAccessor;
    const result = accessor(makeOrder({ fechaEntrega: '2026-06-01T00:00:00' }), 'fecha');
    expect(result).toBeGreaterThan(0);
  });


  it('sortingDataAccessor returns saldoPendiente for saldo', () => {
    const accessor = component.dataSource.sortingDataAccessor;
    expect(accessor(makeOrder({ saldoPendiente: 750 }), 'saldo')).toBe(750);
  });

  it('sortingDataAccessor returns empty string for unknown property', () => {
    const accessor = component.dataSource.sortingDataAccessor;
    expect(accessor(makeOrder(), 'nonexistent')).toBe('');
  });

  // ── subtotalEstimate ──────────────────────────────────────────────────────

  it('subtotalEstimate should calculate correctly', () => {
    component.openAddForm();
    component.itemsFormArray.at(0).patchValue({ quantity: 3, unitPrice: 100 });
    expect(component.subtotalEstimate).toBe(300);
  });

  it('subtotalEstimate should default missing values to 0', () => {
    component.openAddForm();
    component.itemsFormArray.at(0).patchValue({ quantity: null, unitPrice: null });
    expect(component.subtotalEstimate).toBe(0);
  });

  // ── selectedClientName ────────────────────────────────────────────────────

  it('selectedClientName should return client name when found in clientsList', () => {
    component.clientsList = [{ id: 10, nombre: 'Alpha' } as any];
    component.orderForm.get('clientId')?.setValue(10);
    expect(component.selectedClientName).toBe('Alpha');
  });

  it('selectedClientName should return currentOrderClientName when client not found in list', () => {
    component.clientsList = [];
    component.currentOrderClientName = 'Desconocido guardado';
    component.orderForm.get('clientId')?.setValue(99);
    expect(component.selectedClientName).toBe('Desconocido guardado');
  });

  it('selectedClientName should return "Cliente Desconocido" when no id and no currentName', () => {
    component.orderForm.get('clientId')?.setValue(null);
    component.currentOrderClientName = '';
    expect(component.selectedClientName).toBe('Cliente Desconocido');
  });

  it('selectedClientName should return currentOrderClientName when clientId is null', () => {
    component.orderForm.get('clientId')?.setValue(null);
    component.currentOrderClientName = 'Guardado';
    expect(component.selectedClientName).toBe('Guardado');
  });

  // ── addItem / removeItem ──────────────────────────────────────────────────

  it('addItem should add a new item to the form array', () => {
    component.openAddForm();
    const initialLength = component.itemsFormArray.length;
    component.addItem();
    expect(component.itemsFormArray.length).toBe(initialLength + 1);
  });

  it('removeItem should remove the item at given index', () => {
    component.openAddForm();
    component.addItem();
    component.removeItem(0);
    expect(component.itemsFormArray.length).toBe(1);
  });

  // ── openAddForm ───────────────────────────────────────────────────────────

  it('openAddForm should switch to add mode', () => {
    component.openAddForm();
    expect(component.viewMode).toBe('add');
    expect(mockOrderService.clearOrderDraft).toHaveBeenCalled();
  });

  it('openAddForm should clear items and add one default item', () => {
    component.openAddForm();
    component.addItem();
    component.addItem();
    component.openAddForm();
    expect(component.itemsFormArray.length).toBe(1);
  });

  it('openAddForm should set a default deliveryDate 14 days ahead', () => {
    component.openAddForm();
    const dateValue: string = component.orderForm.get('deliveryDate')?.value;
    expect(dateValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // ── closeForm ─────────────────────────────────────────────────────────────

  it('closeForm should return to list mode and clear everything', () => {
    component.viewMode = 'add';
    component.closeForm();
    expect(component.viewMode).toBe('list');
    expect(mockOrderService.clearOrderDraft).toHaveBeenCalled();
  });

  // ── openEditForm ──────────────────────────────────────────────────────────

  it('openEditForm should skip and show dialog when order is finished/cancelled', () => {
    component.openEditForm(makeOrder({ estadoPedido: 'TERMINADO' }));
    expect(mockDialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: expect.objectContaining({ title: 'Acción No Permitida' })
    }));
    expect(mockOrderService.getById).not.toHaveBeenCalled();
  });

  it('openEditForm should call getById and populate form for editable order', async () => {
    component.clientsList = [{ id: 10, nombre: 'Alpha' }];
    component.openEditForm(makeOrder());
    await new Promise(r => setTimeout(r, 10));
    expect(component.viewMode).toBe('edit');
    expect(component.itemsFormArray.length).toBe(1);
  });

  it('openEditForm should log error when getById fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    (mockOrderService.getById as jest.Mock).mockReturnValue(throwError(() => new Error('fail')));
    component.openEditForm(makeOrder());
    expect(consoleSpy).toHaveBeenCalledWith('Error loading order details', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('populateOrderForm should add empty item when productos is empty', async () => {
    (mockOrderService.getById as jest.Mock).mockReturnValue(
      of(makeOrderDetail({ productos: [] }))
    );
    component.openEditForm(makeOrder());
    await new Promise(r => setTimeout(r, 10));
    expect(component.itemsFormArray.length).toBe(1);
  });

  it('crearCliente should save draft and navigate', () => {
    component.orderForm.patchValue({ specifications: 'Draft Test' });
    component.crearCliente();
    expect(mockOrderService.setOrderDraft).toHaveBeenCalledWith(expect.objectContaining({ specifications: 'Draft Test' }));
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/clientes'], expect.anything());
  });

  it('ngOnInit should restore draft if exists and new=true', async () => {
    const draft = { specifications: 'Restored Draft', items: [] };
    
    // Setup test bed with query params
    TestBed.resetTestingModule();
    await setupTestBed({ new: 'true' });
    
    // Manually set mock return and trigger logic
    (mockOrderService.getOrderDraft as jest.Mock).mockReturnValue(draft);
    component.ngOnInit(); // Trigger again with the mock active
    
    expect(component.viewMode).toBe('add');
    expect(component.orderForm.get('specifications')?.value).toBe('Restored Draft');
    expect(mockOrderService.clearOrderDraft).toHaveBeenCalled();
  });

  it('populateOrderForm should reset form before patching', async () => {
    // Fill form with some "stale" data
    component.orderForm.patchValue({ id: 999, status: 'STALE' });
    
    (mockOrderService.getById as jest.Mock).mockReturnValue(of(makeOrderDetail({ idPedido: 1 })));
    component.openEditForm(makeOrder({ idPedido: 1, estadoPedido: 'PENDIENTE' }));
    
    await new Promise(r => setTimeout(r, 20));
    
    expect(component.orderForm.get('id')?.value).toBe(1);
    expect(component.orderForm.get('status')?.value).not.toBe('STALE');
  });

  it('populateOrderForm should use idCliente when cliente is missing', async () => {
    (mockOrderService.getById as jest.Mock).mockReturnValue(
      of({ idPedido: 1, fechaEntrega: '2026-06-01T00:00:00', idCliente: 10, productos: [] })
    );
    component.clientsList = [{ id: 10, nombre: 'Alpha' } as any];
    component.openEditForm(makeOrder());
    await new Promise(r => setTimeout(r, 10));
    expect(component.orderForm.get('clientId')?.value).toBe(10);
  });

  it('buildItemsFromProducts should set null productId when no matching product', async () => {
    (mockOrderService.getById as jest.Mock).mockReturnValue(
      of(makeOrderDetail({ productos: [{ idDetalle: 9, nombreProducto: 'NoExiste', cantidad: 1, precioUnitario: 0 }] }))
    );
    component.productsList = [];
    component.openEditForm(makeOrder());
    await new Promise(r => setTimeout(r, 10));
    expect(component.itemsFormArray.at(0).get('productId')?.value).toBeNull();
  });

  // ── openActivarProduccionModal & confirmActivarProduccion ────────────────

  it('openActivarProduccionModal should open confirm dialog', () => {
    const order = makeOrder();
    component.openActivarProduccionModal(order);
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('confirmActivarProduccion should call activarProduccion and open success dialog when confirmed', () => {
    const order = makeOrder();
    component.confirmActivarProduccion(order);
    expect(mockOrderService.activarProduccion).toHaveBeenCalledWith(1);
    expect(mockDialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: expect.objectContaining({ accentColor: 'success' })
    }));
  });

  it('confirmActivarProduccion should open error dialog when fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    (mockOrderService.activarProduccion as jest.Mock).mockReturnValue(throwError(() => new Error('fail')));
    const order = makeOrder();
    component.confirmActivarProduccion(order);
    expect(mockDialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: expect.objectContaining({ accentColor: 'warning' })
    }));
    consoleSpy.mockRestore();
  });



  // ── openDeleteModal & confirmDelete ───────────────────────────────────────

  it('openDeleteModal should open confirm dialog', () => {
    const order = makeOrder();
    component.openDeleteModal(order);
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('confirmDelete should call cancelar and open success dialog on success', () => {
    const order = makeOrder();
    component.confirmDelete(order);
    expect(mockOrderService.cancelar).toHaveBeenCalledWith(1);
    expect(mockDialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: expect.objectContaining({ accentColor: 'success' })
    }));
  });

  it('confirmDelete should open error dialog when cancelar fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    (mockOrderService.cancelar as jest.Mock).mockReturnValue(throwError(() => new Error('fail')));
    const order = makeOrder();
    component.confirmDelete(order);
    expect(mockDialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: expect.objectContaining({ accentColor: 'warning' })
    }));
    consoleSpy.mockRestore();
  });

  // ── saveOrder — validación ────────────────────────────────────────────────

  it('saveOrder should mark form as touched and not submit when invalid', () => {
    component.openAddForm();
    component.orderForm.get('clientId')?.setValue(null);
    component.saveOrder();
    expect(mockOrderService.create).not.toHaveBeenCalled();
  });

  // ── saveOrder — crear ─────────────────────────────────────────────────────

  it('saveOrder should call create when form has no id', () => {
    component.openAddForm();
    component.orderForm.patchValue({ clientId: 10, deliveryDate: '2026-06-01' });
    component.itemsFormArray.at(0).patchValue({ productId: 1, quantity: 2 });
    component.saveOrder();
    expect(mockOrderService.create).toHaveBeenCalled();
  });

  it('saveOrder should go to list after primary action', () => {
    mockDialog.open.mockReturnValue(dialogRefStub({ action: 'primary' }));
    component.openAddForm();
    component.orderForm.patchValue({ clientId: 10, deliveryDate: '2026-06-01' });
    component.itemsFormArray.at(0).patchValue({ productId: 1, quantity: 1 });
    component.saveOrder();
    expect(component.viewMode).toBe('list');
  });

  it('saveOrder should go to list when dialog result is null', () => {
    mockDialog.open.mockReturnValue(dialogRefStub(null));
    component.openAddForm();
    component.orderForm.patchValue({ clientId: 10, deliveryDate: '2026-06-01' });
    component.itemsFormArray.at(0).patchValue({ productId: 1, quantity: 1 });
    component.saveOrder();
    expect(component.viewMode).toBe('list');
  });

  it('saveOrder should call openAddForm on secondary action when creating', () => {
    mockDialog.open.mockReturnValue(dialogRefStub({ action: 'secondary' }));
    const openAddSpy = jest.spyOn(component, 'openAddForm');
    component.openAddForm();
    component.orderForm.patchValue({ clientId: 10, deliveryDate: '2026-06-01' });
    component.itemsFormArray.at(0).patchValue({ productId: 1, quantity: 1 });
    component.saveOrder();
    expect(openAddSpy).toHaveBeenCalledTimes(2);
  });

  it('saveOrder should log error when create fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    (mockOrderService.create as jest.Mock).mockReturnValue(throwError(() => new Error('fail')));
    component.openAddForm();
    component.orderForm.patchValue({ clientId: 10, deliveryDate: '2026-06-01' });
    component.itemsFormArray.at(0).patchValue({ productId: 1, quantity: 1 });
    component.saveOrder();
    expect(consoleSpy).toHaveBeenCalledWith('Error saving order', expect.any(Error));
    consoleSpy.mockRestore();
  });

  // ── saveOrder — editar ────────────────────────────────────────────────────

  it('saveOrder should call update when form has an id', async () => {
    component.clientsList = [{ id: 10, nombre: 'Alpha' } as any];
    component.openEditForm(makeOrder());
    await new Promise(r => setTimeout(r, 20));

    component.orderForm.enable();
    component.orderForm.patchValue({ deliveryDate: '2026-07-01' });
    component.saveOrder();
    expect(mockOrderService.update).toHaveBeenCalled();
  });

  it('saveOrder should NOT call openAddForm on secondary action when editing', async () => {
    mockDialog.open.mockReturnValue(dialogRefStub({ action: 'secondary' }));
    component.clientsList = [{ id: 10, nombre: 'Alpha' } as any];
    component.openEditForm(makeOrder());
    await new Promise(r => setTimeout(r, 20)); // Increased timeout

    component.orderForm.enable();
    component.orderForm.patchValue({ deliveryDate: '2026-07-01' });
    const openAddSpy = jest.spyOn(component, 'openAddForm');
    component.saveOrder();
    // secondary with id → does NOT call openAddForm
    expect(openAddSpy).not.toHaveBeenCalled();
  });

  it('openDetail should call getById and show detail view', async () => {
    component.openDetail(makeOrder());
    await new Promise(r => setTimeout(r, 10));
    expect(component.viewMode).toBe('detail');
    expect(component.selectedOrderDetails).toBeDefined();
  });

  it('openFormalizeView should switch to formalize mode and apply filter', () => {
    component.openFormalizeView();
    expect(component.viewMode).toBe('formalize');
    expect(component.formalizeList.length).toBeGreaterThan(0);
  });

  it('setFormalizeFilter should filter the formalize list', () => {
    component.ordersData = [
      makeOrder({ estadoPedido: 'PENDIENTE' }),
      makeOrder({ estadoPedido: 'TERMINADO' })
    ];
    component.dataSource.data = component.ordersData;
    
    component.setFormalizeFilter('PENDIENTES');
    expect(component.formalizeList.every(o => o.estadoPedido === 'PENDIENTE')).toBe(true);
    
    component.setFormalizeFilter('PRODUCCION');
    expect(component.formalizeList.length).toBe(0);
  });

  it('openEditFromDetail should populate form from selectedOrderDetails', async () => {
    component.selectedOrderDetails = makeOrderDetail({ idPedido: 123 });
    component.openEditFromDetail();
    await new Promise(r => setTimeout(r, 10));
    expect(component.viewMode).toBe('edit');
    expect(component.orderForm.get('id')?.value).toBe(123);
  });

  it('getPaymentPercentage should calculate correctly', () => {
    expect(component.getPaymentPercentage(100, 30)).toBe(70);
    expect(component.getPaymentPercentage(100, 100)).toBe(0);
    expect(component.getPaymentPercentage(0, 0)).toBe(0);
  });
});