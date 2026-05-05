export class ListHelper {
  static handleSort(currentSort: { column: string; direction: 'asc' | 'desc' }, column: string) {
    if (currentSort.column === column) {
      currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort.column = column;
      currentSort.direction = 'asc';
    }
  }

  static getSortIcon(currentSort: { column: string; direction: 'asc' | 'desc' }, column: string): string {
    if (currentSort.column !== column) return 'unfold_more';
    return currentSort.direction === 'asc' ? 'expand_less' : 'expand_more';
  }

  static sortArray(array: any[], currentSort: { column: string; direction: 'asc' | 'desc' }) {
    if (!currentSort.column) return;
    array.sort((a, b) => {
      const valA = a[currentSort.column];
      const valB = b[currentSort.column];
      if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  static setupTable(dataSource: any, paginator: any, sort: any, cdr: any) {
    setTimeout(() => {
      dataSource.paginator = paginator || null;
      dataSource.sort = sort || null;
      cdr.detectChanges();
    }, 0);
  }

  static handleSearch(dataSource: any, term: string) {
    dataSource.filter = term.trim().toLowerCase();
    if (dataSource.paginator) {
      dataSource.paginator.firstPage();
    }
  }
}
