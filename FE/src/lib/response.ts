/**
 * Consolidated response unwrapping utilities.
 * Single source of truth for extracting data from API responses.
 */

// Single unwrapData for simple responses
export function unwrapData<T>(response: unknown): T {
  if (response && typeof response === "object" && "data" in response && (response as { data?: unknown }).data !== undefined) {
    return (response as { data: T }).data;
  }
  return response as T;
}

// Extract array from various response structures
export function extractArray<T = unknown>(payload: unknown, key?: string): T[] {
  const p = payload as Record<string, unknown> | null;
  // Direct array
  if (Array.isArray(payload)) return payload as T[];

  const data = (p?.data ?? p) as Record<string, unknown> | null;

  // Keyed array
  if (key && Array.isArray(data?.[key])) return data[key] as T[];

  // Common array fields in priority order
  const arrayFields = ['items', 'laporan', 'data', 'users', 'user', 'checklist', 'tugas', 'kategori'];
  for (const field of arrayFields) {
    if (Array.isArray(data?.[field])) return data[field] as T[];
    // Handle nested structure { field: { items: [...] } }
    if (data?.[field] && typeof data[field] === "object" && Array.isArray((data[field] as { items?: unknown }).items)) {
      return (data[field] as { items: T[] }).items;
    }
  }

  // Direct data array
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) return (data as { data: T[] }).data;

  return [];
}

// Flatten nested OB→tasks structure (checklist-harian specific)
export function flattenChecklistItems<T = Record<string, unknown>>(arr: T[]): T[] {
  return arr.flatMap((item) => {
    const i = item as T & { items?: T[]; ob_id?: unknown; _ob_id?: unknown; ob?: unknown; _ob?: unknown };
    if (Array.isArray(i.items) && i.items.length > 0) {
      return flattenChecklistItems(i.items);
    }
    return [{
      ...item,
      _ob_id: i.ob_id ?? i._ob_id ?? null,
      _ob: i.ob ?? i._ob ?? null,
    } as T];
  });
}

// Strip ID prefix (gd-, lt-, etc)
export function stripIdPrefix(id: string): string {
  if (!id) return id;
  return String(id).replace(/^[a-z]+-/, '');
}
