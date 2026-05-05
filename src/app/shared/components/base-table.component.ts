import { Component, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  template: '',
  standalone: true
})
export abstract class BaseTableComponent<T> {
  abstract dataSource: MatTableDataSource<T>;

  private _paginator?: MatPaginator;
  private _sort?: MatSort;

  @ViewChild(MatPaginator) set paginator(v: MatPaginator | undefined) {
    this._paginator = v;
    if (v && this.dataSource) {
      this.dataSource.paginator = v;
    }
  }
  get paginator(): MatPaginator | undefined {
    return this._paginator;
  }

  @ViewChild(MatSort) set sort(v: MatSort | undefined) {
    this._sort = v;
    if (v && this.dataSource) {
      this.dataSource.sort = v;
    }
  }
  get sort(): MatSort | undefined {
    return this._sort;
  }
}
