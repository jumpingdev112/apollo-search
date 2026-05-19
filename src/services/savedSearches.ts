import type { ApolloOrganizationFilters } from '@/types/apolloSearch';

export interface SavedSearchItem {
  id: string;
  name: string;
  filters: ApolloOrganizationFilters;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'apollo-search.saved-searches';

function loadAll(): SavedSearchItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSearchItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(items: SavedSearchItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function listSavedSearches(): SavedSearchItem[] {
  return loadAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function saveSearch(name: string, filters: ApolloOrganizationFilters): SavedSearchItem {
  const items = loadAll();
  const now = new Date().toISOString();
  const item: SavedSearchItem = {
    id: crypto.randomUUID(),
    name: name.trim(),
    filters,
    createdAt: now,
    updatedAt: now,
  };
  items.unshift(item);
  persist(items);
  return item;
}

export function deleteSavedSearch(id: string): boolean {
  const items = loadAll();
  const next = items.filter((s) => s.id !== id);
  if (next.length === items.length) return false;
  persist(next);
  return true;
}
