import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BaseTableComponent } from './base-table.component';

@Component({
  template: `
    <table matSort></table>
    <mat-paginator></mat-paginator>
  `,
  standalone: true,
  imports: [MatPaginatorModule, MatSortModule]
})
class TestTableComponent extends BaseTableComponent<any> {
  dataSource = new MatTableDataSource<any>([]);
}

describe('BaseTableComponent', () => {
  let component: TestTableComponent;
  let fixture: ComponentFixture<TestTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestTableComponent, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TestTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should set paginator on dataSource when ViewChild is initialized', () => {
    expect(component.dataSource.paginator).toBeTruthy();
    expect(component.paginator).toBeInstanceOf(MatPaginator);
  });

  it('should set sort on dataSource when ViewChild is initialized', () => {
    expect(component.dataSource.sort).toBeTruthy();
    expect(component.sort).toBeInstanceOf(MatSort);
  });
});
