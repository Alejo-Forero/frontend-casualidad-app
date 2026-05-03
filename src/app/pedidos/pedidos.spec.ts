import { OrderService } from '../core/services/order.service';
import { ClientService } from '../core/services/client.service';
import { InventoryService } from '../core/services/inventory.service';
import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PedidosComponent } from './pedidos';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';

const mockOrder = { idPedido: 1, codigoUnico: 'PED-001', estadoPedido: 'DONE', nombreCliente: 'Alpha', clientName: 'Alpha', saldoPendiente: 0, fechaEntrega: '2026-01-01' };

const mockOrderService = {
  getAll: () => of([]),
  delete: () => of({}),
  create: () => of({ codigoUnico: 'PED-001', estado: 'EN_PRODUCCION' }),
  update: () => of({}),
  cancelar: () => of({}),
  getById: () => of({ idPedido: 1, cliente: { idCliente: 1, nombreCompleto: 'Alpha' }, fechaEntrega: '2026-01-01', productos: [] }),
  activarProduccion: () => of({ codigoUnico: 'PED-001', estado: 'EN_PRODUCCION' })
};

const mockClientService = {
  getAll: () => of([])
};

const mockInventoryService = {
  getAll: () => of([])
};

describe('PedidosComponent', () => {
  let component: PedidosComponent;
  let fixture: ComponentFixture<PedidosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        { provide: OrderService, useValue: mockOrderService },
        { provide: ClientService, useValue: mockClientService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } }
      ],
      imports: [PedidosComponent, BrowserAnimationsModule],
    })
    .overrideProvider(MatDialog, { useValue: { open: () => ({ afterClosed: () => of(false) }) } })
    .compileComponents();

    fixture = TestBed.createComponent(PedidosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have clientsList and productsList after init', () => {
    expect(component.clientsList).toBeDefined();
    expect(component.productsList).toBeDefined();
  });

  it('should handle search via dataSource filter', () => {
    component.searchTerm = 'Alpha';
    component.onSearchChange();
    expect(component.dataSource.filter).toContain('alpha');
  });

  it('should handle openAddForm and closeForm', () => {
    component.openAddForm();
    expect(component.viewMode).toBe('add');
    component.closeForm();
    expect(component.viewMode).toBe('list');
  });

  it('should handle saveOrder with invalid form (stays on add)', () => {
    component.openAddForm();
    // form is invalid, save should mark as touched and stay
    component.saveOrder();
    expect(component.viewMode).toBe('add');
  });

  it('should handle saveOrder with valid form', () => {
    component.openAddForm();
    Object.defineProperty(component.orderForm, 'valid', { get: () => true });
    component.saveOrder();
    expect(component).toBeTruthy();
  });

  it('should handle openDeleteModal', () => {
    component.openDeleteModal(mockOrder as any);
    expect(component).toBeTruthy();
  });

  it('should handle openActivarProduccionModal', () => {
    component.openActivarProduccionModal(mockOrder as any);
    expect(component).toBeTruthy();
  });

  it('should handle addItem and removeItem', () => {
    component.openAddForm();
    expect(component.itemsFormArray.length).toBe(1);
    component.addItem();
    expect(component.itemsFormArray.length).toBe(2);
    component.removeItem(0);
    expect(component.itemsFormArray.length).toBe(1);
  });

  it('should calculate subtotalEstimate', () => {
    component.openAddForm();
    component.itemsFormArray.at(0).patchValue({ quantity: 2, unitPrice: 50 });
    expect(component.subtotalEstimate).toBe(100);
  });

  it('should handle openEditForm', () => {
    component.openEditForm(mockOrder as any);
    expect(component).toBeTruthy();
  });

  it('should handle confirmActivarProduccion when no selectedOrder', () => {
    component.confirmActivarProduccion();
    expect(component).toBeTruthy();
  });
});
