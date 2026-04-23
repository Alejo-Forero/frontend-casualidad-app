import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange, SimpleChanges } from '@angular/core';
import { jest } from '@jest/globals';
import { PaginationComponent } from './pagination';

describe('PaginationComponent', () => {
  let component: PaginationComponent;
  let fixture: ComponentFixture<PaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate pagination correctly on changes', () => {
    component.totalItems = 55;
    component.pageSize = 10;
    component.currentPage = 1;
    
    const changes: SimpleChanges = {
      totalItems: new SimpleChange(0, 55, true)
    };
    
    component.ngOnChanges(changes);
    
    expect(component.totalPages).toBe(6);
    expect(component.pages.length).toBe(6);
    expect(component.displayedItems).toBe(10);
  });

  it('should calculate displayed items correctly for last page', () => {
    component.totalItems = 55;
    component.pageSize = 10;
    component.currentPage = 6;
    
    const changes: SimpleChanges = {
      currentPage: new SimpleChange(1, 6, false)
    };
    
    component.ngOnChanges(changes);
    
    expect(component.displayedItems).toBe(5);
  });

  it('should prevent negative displayed items', () => {
    component.totalItems = 5;
    component.pageSize = 10;
    component.currentPage = 2; // Invalid state but testing the boundary
    
    const changes: SimpleChanges = {
      currentPage: new SimpleChange(1, 2, false)
    };
    
    component.ngOnChanges(changes);
    
    expect(component.displayedItems).toBe(0);
  });

  it('should default totalPages to 1 if totalItems is 0', () => {
    component.totalItems = 0;
    component.pageSize = 10;
    component.currentPage = 1;
    
    component.ngOnChanges({ totalItems: new SimpleChange(undefined, 0, true) });
    
    expect(component.totalPages).toBe(1);
    expect(component.pages.length).toBe(1);
  });

  it('should emit pageChange when onPageChange is called with a valid page', () => {
    jest.spyOn(component.pageChange, 'emit');
    component.totalPages = 5;
    component.currentPage = 1;
    
    component.onPageChange(3);
    
    expect(component.pageChange.emit).toHaveBeenCalledWith(3);
  });

  it('should not emit pageChange for out of bounds or same page', () => {
    jest.spyOn(component.pageChange, 'emit');
    component.totalPages = 5;
    component.currentPage = 3;
    
    component.onPageChange(3); // Same page
    component.onPageChange(0); // Out of bounds
    component.onPageChange(6); // Out of bounds
    
    expect(component.pageChange.emit).not.toHaveBeenCalled();
  });
});
