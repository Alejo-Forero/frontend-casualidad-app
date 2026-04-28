import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PedidosComponent } from './pedidos';

describe('PedidosComponent', () => {
  let component: PedidosComponent;
  let fixture: ComponentFixture<PedidosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PedidosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PedidosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter orders', () => {
    component.ordersData = [
      { idPedido: 1, id: '1', codigoUnico: '001', code: '001', cliente: { idCliente: 1, nombreCompleto: 'Alpha', telefono: '' }, clientName: 'Alpha', total: 100, totalAmount: 100, saldoPendiente: 0, pendingBalance: 0, estadoPedido: 'DONE', status: 'DONE', paymentStatus: 'PAID', fechaEntrega: '2026', deliveryDate: '2026' }
    ];
    component.searchTerm = 'Alpha';
    component.onSearchChange();
    expect(component.filteredOrders.length).toBe(1);
  });

  it('should handle pagination', () => {
    component.ordersData = Array(10).fill({ idPedido: 1, id: '1', codigoUnico: '001', code: '001', cliente: { idCliente: 1, nombreCompleto: 'Alpha', telefono: '' }, clientName: 'Alpha', total: 100, totalAmount: 100, saldoPendiente: 0, pendingBalance: 0, estadoPedido: 'DONE', status: 'DONE', paymentStatus: 'PAID', fechaEntrega: '2026', deliveryDate: '2026' });
    component.pageSize = 5;
    component.onSearchChange();
    
    component.onPageChange(2);
    expect(component.paginatedOrders.length).toBe(5);
  });

  it('should sort correctly', () => {
    component.ordersData = [
      { idPedido: 1, id: '1', codigoUnico: '001', code: '001', cliente: { idCliente: 1, nombreCompleto: 'Z', telefono: '' }, clientName: 'Z', total: 100, totalAmount: 100, saldoPendiente: 50, pendingBalance: 50, estadoPedido: 'DONE', status: 'DONE', paymentStatus: 'PARTIAL', fechaEntrega: '2026-01-01', deliveryDate: '2026-01-01' },
      { idPedido: 2, id: '2', codigoUnico: '002', code: '002', cliente: { idCliente: 2, nombreCompleto: 'A', telefono: '' }, clientName: 'A', total: 100, totalAmount: 100, saldoPendiente: 0, pendingBalance: 0, estadoPedido: 'DONE', status: 'DONE', paymentStatus: 'PAID', fechaEntrega: '2026-02-01', deliveryDate: '2026-02-01' }
    ];
    component.handleSort('cliente');
    expect(component.filteredOrders[0].clientName).toBe('A');
    component.handleSort('cliente');
    expect(component.filteredOrders[0].clientName).toBe('Z');
    
    component.handleSort('id');
    component.handleSort('estado');
    component.handleSort('fecha');
    component.handleSort('saldo');
    component.handleSort('unknown');
    
    expect(component.getSortIcon('unknown')).toBe('expand_less');
  });

  it('should handle delete modal and confirm', () => {
    component.ordersData = [
      { idPedido: 1, id: '1', codigoUnico: '001', code: '001', cliente: { idCliente: 1, nombreCompleto: 'Z', telefono: '' }, clientName: 'Z', total: 100, totalAmount: 100, saldoPendiente: 50, pendingBalance: 50, estadoPedido: 'DONE', status: 'DONE', paymentStatus: 'PARTIAL', fechaEntrega: '2026-01-01', deliveryDate: '2026-01-01' },
    ];
    const o = component.ordersData[0];
    component.openDeleteModal(o);
    expect(component.showDeleteModal).toBe(true);
    
    component.confirmDelete();
    expect(component.ordersData.length).toBe(0);
    expect(component.showSuccessModal).toBe(true);
    
    component.closeSuccessModal();
    expect(component.showSuccessModal).toBe(false);
  });
});
