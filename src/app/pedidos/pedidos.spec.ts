import { OrderService } from '../core/services/order.service';
import { ClientService } from '../core/services/client.service';
import { InventoryService } from '../core/services/inventory.service';
import { of, throwError } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PedidosComponent } from './pedidos';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { jest } from '@jest/globals';

const mockOrder = { idPedido: 1, id: 1, codigoUnico: 'PED-001', estadoPedido: 'DONE', nombreCliente: 'Alpha', clientName: 'Alpha', saldoPendiente: 0, fechaEntrega: '2026-01-01' };

describe('PedidosComponent', () => {
  let component: PedidosComponent;
  let fixture: ComponentFixture<PedidosComponent>;
  let mockOrderService: any;
  let mockClientService: any;
  let mockInventoryService: any;
  let mockDialog: any;

  beforeEach(async () => {
    mockOrderService = {
      getAll: jest.fn(() => of([mockOrder])),
      delete: jest.fn(() => of({})),
      create: jest.fn(() => of({ codigoUnico: 'P1' })),
      update: jest.fn(() => of({})),
      cancelar: jest.fn(() => of({})),
      getById: jest.fn(() => of({ 
        idPedido: 1, 
        cliente: { idCliente: 1, nombreCompleto: 'A' }, 
        fechaEntrega: '2026-01-01', 
        productos: [{idDetalle: 1, idProducto: 1, cantidad: 5, precioUnitario: 10}] 
      })),
      activarProduccion: jest.fn(() => of({}))
    };
    mockClientService = { getAll: jest.fn(() => of([{ idCliente: 1, nombre: 'A' }])) };
    mockInventoryService = { getAll: jest.fn(() => of([{ idProducto: 1, name: 'P1', salePrice: 100 }])) };
    mockDialog = { open: jest.fn(() => ({ afterClosed: () => of(true) })) };

    await TestBed.configureTestingModule({
      imports: [PedidosComponent, BrowserAnimationsModule],
      providers: [
        { provide: OrderService, useValue: mockOrderService },
        { provide: ClientService, useValue: mockClientService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: MatDialog, useValue: mockDialog }
      ],
    })
    .overrideProvider(MatDialog, { useValue: mockDialog })
    .compileComponents();

    fixture = TestBed.createComponent(PedidosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should handle sorting all directions', () => {
    component.handleSort('cliente');
    expect(component.currentSort.direction).toBe('asc');
    component.handleSort('cliente');
    expect(component.currentSort.direction).toBe('desc');
    component.handleSort('saldo');
    expect(component.currentSort.column).toBe('saldo');
    expect(component.currentSort.direction).toBe('asc');
  });

  it('should handle helpers and branches', (done) => {
    const accessor = component.dataSource.sortingDataAccessor;
    expect(accessor(mockOrder as any, 'cliente')).toBe('Alpha');
    
    component.openAddForm();
    component.itemsFormArray.at(0).get('productId')?.setValue(1);
    component.onProductChange(0);
    expect(component.itemsFormArray.at(0).get('unitPrice')?.value).toBe(100);
    
    component.openEditForm(mockOrder as any);
    setTimeout(() => {
      expect(component.itemsFormArray.length).toBe(1);
      done();
    }, 50);
  });

  it('should handle save and delete', () => {
    component.openAddForm();
    component.orderForm.get('clientId')?.setValue(1);
    component.orderForm.get('deliveryDate')?.setValue('2026-01-01');
    component.itemsFormArray.at(0).patchValue({ productId: 1, quantity: 1 });
    component.saveOrder();
    expect(mockOrderService.create).toHaveBeenCalled();

    component.openDeleteModal(mockOrder as any);
    expect(mockOrderService.cancelar).toHaveBeenCalled();
  });
});
