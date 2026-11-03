/**
 * Case-insensitive substring search over some text fields of each item.
 * An empty search keeps everything. Used by the flow view's "add item"
 * picker and the editor's mention picker.
 */
export function filterBySearch<T>(items: T[], searchText: string, fields: (keyof T)[]): T[] {
  const needle = (searchText ?? '').trim().toLowerCase();
  if (!needle) {
    return items;
  }
  return items.filter((item) => fields.some((field) => {
    const value = item[field];
    return typeof value === 'string' && value.toLowerCase().includes(needle);
  }));
}
