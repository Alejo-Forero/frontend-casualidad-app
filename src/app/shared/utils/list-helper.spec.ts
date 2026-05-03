import { ListHelper } from './list-helper';

describe('ListHelper', () => {
  it('should handle sort direction toggle', () => {
    const sort: { column: string; direction: 'asc' | 'desc' } = { column: 'name', direction: 'asc' };
    ListHelper.handleSort(sort, 'name');
    expect(sort.direction).toBe('desc');
    ListHelper.handleSort(sort, 'name');
    expect(sort.direction).toBe('asc');
  });

  it('should handle switching columns', () => {
    const sort: { column: string; direction: 'asc' | 'desc' } = { column: 'name', direction: 'asc' };
    ListHelper.handleSort(sort, 'id');
    expect(sort.column).toBe('id');
    expect(sort.direction).toBe('asc');
  });

  it('should get correct sort icon', () => {
    const sort: { column: string; direction: 'asc' | 'desc' } = { column: 'name', direction: 'asc' };
    expect(ListHelper.getSortIcon(sort, 'id')).toBe('unfold_more');
    expect(ListHelper.getSortIcon(sort, 'name')).toBe('expand_less');
    sort.direction = 'desc';
    expect(ListHelper.getSortIcon(sort, 'name')).toBe('expand_more');
  });

  it('should sort array asc', () => {
    const arr = [{ id: 2 }, { id: 1 }, { id: 3 }];
    ListHelper.sortArray(arr, { column: 'id', direction: 'asc' });
    expect(arr[0].id).toBe(1);
    expect(arr[2].id).toBe(3);
  });

  it('should sort array desc', () => {
    const arr = [{ id: 2 }, { id: 1 }, { id: 3 }];
    ListHelper.sortArray(arr, { column: 'id', direction: 'desc' });
    expect(arr[0].id).toBe(3);
    expect(arr[2].id).toBe(1);
  });

  it('should not sort if no column', () => {
    const arr = [{ id: 2 }, { id: 1 }];
    const original = [...arr];
    ListHelper.sortArray(arr, { column: '', direction: 'asc' });
    expect(arr).toEqual(original);
  });

  it('should handle equal values during sort', () => {
    const arr = [{ id: 1 }, { id: 1 }];
    ListHelper.sortArray(arr, { column: 'id', direction: 'asc' });
    expect(arr[0].id).toBe(1);
    expect(arr[1].id).toBe(1);
  });
});
