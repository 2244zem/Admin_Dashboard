/**
 * Consolidated response unwrapping utilities.
 * Single source of truth for extracting data from API responses.
 */

// Single unwrapData for simple responses
export function unwrapData<T>(response: any): T {
  if (response?.data !== undefined) return response.data;
  return response as T;
}

// Extract array from various response structures
export function extractArray<T = any>(payload: any, key?: string): T[] {
  // Direct array
  if (Array.isArray(payload)) return payload;

  const data = payload?.data ?? payload;

  // Keyed array
  if (key && Array.isArray(data?.[key])) return data[key];

  // Common array fields in priority order
  const arrayFields = ['items', 'laporan', 'data', 'users', 'user', 'checklist', 'tugas', 'kategori'];
  for (const field of arrayFields) {
    if (Array.isArray(data?.[field])) return data[field];
    // Handle nested structure { field: { items: [...] } }
    if (data?.[field]?.items && Array.isArray(data[field].items)) return data[field].items;
  }

  // Direct data array
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;

  return [];
}

// Flatten nested OB→tasks structure (checklist-harian specific)
export function flattenChecklistItems(arr: any[]): any[] {
  return arr.flatMap((item) => {
    if (Array.isArray(item.items) && item.items.length > 0) {
      return flattenChecklistItems(item.items);
    }
    return [{
      ...item,
      _ob_id: item.ob_id ?? item._ob_id ?? null,
      _ob: item.ob ?? item._ob ?? null,
    }];
  });
}

// Strip ID prefix (gd-, lt-, etc)
export function stripIdPrefix(id: string): string {
  if (!id) return id;
  return String(id).replace(/^[a-z]+-/, '');
}
