import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PaginationComponent } from '../shared/pagination/pagination';

import { UserDTO } from '../core/models/auth.dto';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PaginationComponent],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css']
})
export class UsuariosComponent implements OnInit {
  usersData: UserDTO[] = [];

  filteredUsers: UserDTO[] = [];
  paginatedUsers: UserDTO[] = [];

  searchTerm = '';
  currentPage = 1;
  pageSize = 3;

  currentSort = { column: '', direction: 'asc' as 'asc' | 'desc' };

  // Modals state
  showDeleteModal = false;
  showSuccessModal = false;
  userToDelete: UserDTO | null = null;

  // Forms state
  viewMode: 'list' | 'add' | 'edit' = 'list';
  userForm: FormGroup;
  showFormSuccessModal = false;

  private readonly fb = inject(FormBuilder);

  constructor() {
    this.userForm = this.fb.group({
      id: [''],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['']
    });
  }

  ngOnInit() {
    this.applyFilters();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.applyFilters();
  }

  onPageChange(page: number) {
    this.currentPage = page;
    this.applyFilters();
  }

  private applyFilters() {
    // 1. Filter
    if (this.searchTerm.trim() === '') {
      this.filteredUsers = [...this.usersData];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredUsers = this.usersData.filter(user => 
        user.nombre.toLowerCase().includes(term) || 
        user.email.toLowerCase().includes(term)
      );
    }

    // Sort
    if (this.currentSort.column) {
      this.filteredUsers.sort((a, b) => {
        const valA = (a as any)[this.currentSort.column];
        const valB = (b as any)[this.currentSort.column];
        if (valA < valB) return this.currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return this.currentSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // 2. Paginate
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(start, end);

    // Failsafe if we are on a page that doesn't exist anymore after filtering
    if (this.paginatedUsers.length === 0 && this.currentPage > 1) {
        this.currentPage = 1;
        this.applyFilters();
    }
  }

  handleSort(column: string) {
    if (this.currentSort.column === column) {
      this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSort.column = column;
      this.currentSort.direction = 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(column: string): string {
    if (this.currentSort.column !== column) return 'unfold_more';
    return this.currentSort.direction === 'asc' ? 'expand_less' : 'expand_more';
  }

  openDeleteModal(user: UserDTO) {
    this.userToDelete = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.userToDelete = null;
  }

  confirmDelete() {
    if (this.userToDelete) {
      this.usersData = this.usersData.filter(u => u.id !== this.userToDelete!.id);
      this.applyFilters();
      this.closeDeleteModal();
      this.showSuccessModal = true;
    }
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
  }

  // --- FORM ACTIONS ---
  openAddForm() {
    this.userForm.reset();
    this.viewMode = 'add';
  }

  openEditForm(user: UserDTO) {
    this.userForm.patchValue({
      id: user.id,
      firstName: user.nombre.split(' ')[0], // Simulating keeping the form fields for now
      lastName: user.nombre.split(' ').slice(1).join(' '),
      email: user.email,
      phone: '' // We don't have phone in UserDTO anymore
    });
    this.viewMode = 'edit';
  }

  closeForm() {
    this.viewMode = 'list';
  }

  saveUser() {
    if (this.userForm.valid) {
      this.showFormSuccessModal = true;
      // Aquí normalmente se llamaría a un servicio
    } else {
      this.userForm.markAllAsTouched();
    }
  }

  closeFormSuccessModal(goToList: boolean) {
    this.showFormSuccessModal = false;
    if (goToList) {
      this.viewMode = 'list';
    } else if (this.viewMode === 'add') {
      this.userForm.reset();
    }
  }
}
