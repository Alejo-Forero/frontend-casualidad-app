import { Component, inject, OnInit, AfterViewInit, ChangeDetectorRef, DestroyRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { ClientDTO } from '../core/models/client.dto';
import { ClientService } from '../core/services/client.service';
import { ScreenSizeService } from '../core/services/screen-size.service';
import { UIService } from '../core/services/ui.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SuccessDialogComponent } from '../shared/components/success-dialog/success-dialog';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog';
import { ListHelper } from '../shared/utils/list-helper';
import { BaseTableComponent } from '../shared/components/base-table.component';
@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule
  ],
  templateUrl: './clientes.html',
  styleUrls: ['./clientes.css']
})
export class ClientesComponent extends BaseTableComponent<ClientDTO> implements OnInit, AfterViewInit {
  clientsData: ClientDTO[] = [];
  dataSource = new MatTableDataSource<ClientDTO>([]);
  displayedColumns: string[] = [ 'name', 'correo', 'telefonos'];
  searchTerm = '';

  // Modals state
  selectedClient: ClientDTO | null = null;

  // Forms state
  viewMode: 'list' | 'add' | 'edit' | 'details' = 'list';
  clientForm: FormGroup;
  errorMessage: string | null = null;
  acquiredProducts: any[] = []; // To store products for the details view

  private readonly fb = inject(FormBuilder);
  private readonly clientService = inject(ClientService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly uiService = inject(UIService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  isFromPedidos = false;
  readonly screenSize = inject(ScreenSizeService);

  constructor() {
    super();

    this.clientForm = this.fb.group({
      id: [''],
      name: ['', Validators.required],
      phones: this.fb.array([this.fb.control('', Validators.required)]),
      email: ['', Validators.email],
      address: ['']
    });
  }

  get phonesFormArray(): FormArray {
    return this.clientForm.get('phones') as FormArray;
  }

  addPhoneField(): void {
    this.phonesFormArray.push(this.fb.control(''));
  }

  removePhoneField(index: number): void {
    if (this.phonesFormArray.length > 1) {
      this.phonesFormArray.removeAt(index);
    }
  }

  ngOnInit(): void {
    this.loadClients();
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params['from'] === 'pedidos') {
        this.isFromPedidos = true;
        this.openAddForm();
      }
    });
  }

  ngAfterViewInit() {
    this.dataSource.sortingDataAccessor = (item: ClientDTO, property: string) => {
      switch (property) {
        case 'name': return item.name.toLowerCase();
        case 'correo': return item.correo?.toLowerCase() ?? '';
        default: return (item as any)[property as keyof ClientDTO] as string | number ?? '';
      }
    };

    this.dataSource.filterPredicate = (data, filter) => {
      const matchTelefonos = data.telefonos?.some(phone => phone.toLowerCase().includes(filter)) ?? false;

      const matchPhones = data.phones?.some(phone => phone.toLowerCase().includes(filter)) ?? false;

      return matchTelefonos || matchPhones;
    };
  }

  loadClients(): void {
    this.clientService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.clientsData = data;
        this.dataSource.data = this.clientsData;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading clients', err)
    });
  }

  onSearchChange(): void {
    ListHelper.handleSearch(this.dataSource, this.searchTerm);
  }

  viewDetails(client: ClientDTO): void {
    this.selectedClient = client;
    this.viewMode = 'details';

    // Reset acquired products list
    this.acquiredProducts = [];

    this.cdr.detectChanges();
  }

  openDeleteModal(client: ClientDTO): void {
    this.uiService.showConfirm({
      title: '¿Eliminar cliente?',
      message: 'Estás a punto de eliminar a ',
      highlightText: client.name,
      warningText: 'El cliente será eliminado permanentemente del sistema y ',
      confirmLabel: 'Sí, eliminar cliente',
      icon: 'person_remove',
      accentColor: 'error'
    }).subscribe(result => {
      if (result) {
        this.confirmDelete(client);
      }
    });
  }

  confirmDelete(client: ClientDTO): void {
    this.clientService.delete(client.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loadClients();
        this.uiService.showSuccess({
          title: '¡Cliente Eliminado!',
          message: 'El cliente ha sido eliminado permanentemente del sistema.'
        });
      },
      error: (err) => {
        console.error('Error deleting client', err);
        this.uiService.showError('No se pudo eliminar el cliente. Es posible que tenga pedidos asociados o un problema de red.');
      }
    });
  }

  // --- FORM ACTIONS ---
  openAddForm(): void {
    this.errorMessage = null;
    this.clientForm.reset();
    this.phonesFormArray.clear();
    this.phonesFormArray.push(this.fb.control('', Validators.required));
    this.viewMode = 'add';
    this.cdr.detectChanges();
  }

  openEditForm(client: ClientDTO): void {
    this.errorMessage = null;
    this.clientForm.patchValue({
      id: client.id,
      name: client.name,
      email: client.correo,
      address: client.address
    });

    this.phonesFormArray.clear();
    if (client.phones && client.phones.length > 0) {
      client.phones.forEach(p => this.phonesFormArray.push(this.fb.control(p, Validators.required)));
    } else {
      this.phonesFormArray.push(this.fb.control('', Validators.required));
    }

    this.viewMode = 'edit';
    this.cdr.detectChanges();
  }

  closeForm(): void {
    this.viewMode = 'list';
    this.cdr.detectChanges();
  }

  saveClient(): void {
    this.errorMessage = null;
    if (this.clientForm.valid) {
      const clientData = this.clientForm.value;
      const request = this.viewMode === 'edit'
        ? this.clientService.update(clientData.id, clientData)
        : this.clientService.create(clientData);

      request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.loadClients();
          const isEdit = this.viewMode === 'edit';
          this.uiService.showSuccess({
            title: isEdit ? 'Cliente Actualizado' : 'Cliente Añadido con Éxito',
            message: isEdit ? 'Los datos han sido modificados correctamente.' : 'El perfil para el nuevo cliente ha sido creado.',
            primaryActionLabel: this.isFromPedidos && !isEdit ? 'Ir a Crear Pedido' : 'Ir al Listado',
            secondaryActionLabel: isEdit ? 'Seguir editando' : 'Añadir otro'
          }).subscribe(result => {
            if (this.isFromPedidos && !isEdit) {
              this.router.navigate(['/pedidos'], { queryParams: { new: 'true' } });
              return;
            }

            if (!result || result.action === 'primary' || result.action === 'close') {
              this.viewMode = 'list';
            } else if (result.action === 'secondary' && !isEdit) {
              this.openAddForm();
            }
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          console.error('Error saving client', err);
          if (err.status === 400 || err.status === 409 || err.status === 500) {
            this.errorMessage = 'No es posible realizar la operaci\u00f3n porque el n\u00famero de tel\u00e9fono ya existe.';
          } else {
            this.errorMessage = 'Ocurri\u00f3 un error al guardar el cliente.';
          }
          this.cdr.detectChanges();
        }
      });
    } else {
      this.clientForm.markAllAsTouched();
    }
  }
}
