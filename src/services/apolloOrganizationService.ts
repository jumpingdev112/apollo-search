import type {
  ApolloAccountRow,
  ApolloOrganizationFilters,
  ApolloOrganizationRow,
  ApolloSearchResponse,
} from '@/types/apolloSearch';

const APOLLO_SEARCH_PATH = '/api/v1/mixed_companies/search';
const DEFAULT_MIN_FOUNDED_YEAR = 1950;

function toStr(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

export function getApolloApiKey(): string {
  return (import.meta.env.VITE_APOLLO_API_KEY || '').trim();
}

/** Base URL for Apollo API calls (dev proxy or direct). */
export function getApolloBaseUrl(): string {
  const useProxy = import.meta.env.DEV && import.meta.env.VITE_APOLLO_USE_DEV_PROXY !== 'false';
  if (useProxy) return '/apollo-proxy';
  return (import.meta.env.VITE_APOLLO_API_BASE_URL || 'https://api.apollo.io').replace(/\/$/, '');
}

export function buildApolloSearchQuery(
  filters: ApolloOrganizationFilters,
  page: number,
  perPage: number
): URLSearchParams {
  const sp = new URLSearchParams();
  const p = Math.max(1, parseInt(String(page), 10) || 1);
  const pp = Math.min(100, Math.max(1, parseInt(String(perPage), 10) || 25));
  sp.set('page', String(p));
  sp.set('per_page', String(pp));

  const f = filters && typeof filters === 'object' ? filters : {};

  if (toStr(f.q_organization_name)) sp.set('q_organization_name', toStr(f.q_organization_name));

  for (const d of f.q_organization_domains_list || []) {
    const t = toStr(d);
    if (t) sp.append('q_organization_domains_list[]', t);
  }

  for (const r of f.organization_num_employees_ranges || []) {
    const t = toStr(r);
    if (t) sp.append('organization_num_employees_ranges[]', t);
  }

  for (const x of f.organization_locations || []) {
    const t = toStr(x);
    if (t) sp.append('organization_locations[]', t);
  }

  for (const x of f.organization_not_locations || []) {
    const t = toStr(x);
    if (t) sp.append('organization_not_locations[]', t);
  }

  const rr = f.revenue_range || {};
  if (rr.min != null) sp.set('revenue_range[min]', String(rr.min));
  if (rr.max != null) sp.set('revenue_range[max]', String(rr.max));

  for (const x of f.currently_using_any_of_technology_uids || []) {
    const t = toStr(x);
    if (t) sp.append('currently_using_any_of_technology_uids[]', t);
  }

  for (const x of f.q_organization_keyword_tags || []) {
    const t = toStr(x);
    if (t) sp.append('q_organization_keyword_tags[]', t);
  }

  for (const x of f.organization_ids || []) {
    const t = toStr(x);
    if (t) sp.append('organization_ids[]', t);
  }

  const lfa = f.latest_funding_amount_range || {};
  if (lfa.min != null) sp.set('latest_funding_amount_range[min]', String(lfa.min));
  if (lfa.max != null) sp.set('latest_funding_amount_range[max]', String(lfa.max));

  const tfa = f.total_funding_range || {};
  if (tfa.min != null) sp.set('total_funding_range[min]', String(tfa.min));
  if (tfa.max != null) sp.set('total_funding_range[max]', String(tfa.max));

  const lfd = f.latest_funding_date_range || {};
  if (toStr(lfd.min)) sp.set('latest_funding_date_range[min]', toStr(lfd.min));
  if (toStr(lfd.max)) sp.set('latest_funding_date_range[max]', toStr(lfd.max));

  for (const x of f.q_organization_job_titles || []) {
    const t = toStr(x);
    if (t) sp.append('q_organization_job_titles[]', t);
  }

  for (const x of f.organization_job_locations || []) {
    const t = toStr(x);
    if (t) sp.append('organization_job_locations[]', t);
  }

  const nj = f.organization_num_jobs_range || {};
  if (nj.min != null) sp.set('organization_num_jobs_range[min]', String(nj.min));
  if (nj.max != null) sp.set('organization_num_jobs_range[max]', String(nj.max));

  const jpr = f.organization_job_posted_at_range || {};
  if (toStr(jpr.min)) sp.set('organization_job_posted_at_range[min]', toStr(jpr.min));
  if (toStr(jpr.max)) sp.set('organization_job_posted_at_range[max]', toStr(jpr.max));

  return sp;
}

function asOrgRow(raw: Record<string, unknown>, source: 'organization' | 'account'): ApolloOrganizationRow {
  const accountId = source === 'account' ? String(raw.id || '') : '';
  return {
    id: String(raw.organization_id || raw.id || ''),
    apollo_account_id: source === 'account' ? accountId || null : null,
    name: String(raw.name || 'Unknown'),
    website_url: (raw.website_url as string) || null,
    primary_domain: (raw.primary_domain as string) || (raw.domain as string) || null,
    linkedin_url: (raw.linkedin_url as string) || null,
    twitter_url: (raw.twitter_url as string) || null,
    facebook_url: (raw.facebook_url as string) || null,
    phone: (raw.phone as string) || null,
    primary_phone: (raw.primary_phone as ApolloOrganizationRow['primary_phone']) || null,
    founded_year: typeof raw.founded_year === 'number' ? raw.founded_year : null,
    alexa_ranking: typeof raw.alexa_ranking === 'number' ? raw.alexa_ranking : null,
    source,
  };
}

/**
 * mixed_companies/search returns up to per_page hits split across `organizations` and
 * `accounts`. `model_ids` is the authoritative ordered list for the page.
 */
export function normalizeMixedCompaniesResponse(j: Record<string, unknown>): ApolloSearchResponse {
  const orgRows = ((j.organizations as Record<string, unknown>[]) || []).map((o) => asOrgRow(o, 'organization'));
  const accountRows = ((j.accounts as Record<string, unknown>[]) || []).map((a) => asOrgRow(a, 'account'));

  const orgById = new Map(orgRows.map((o) => [o.id, o]));
  const accountById = new Map(
    ((j.accounts as ApolloAccountRow[]) || []).map((a) => [String(a.id), asOrgRow(a as unknown as Record<string, unknown>, 'account')])
  );

  const modelIds = (j.model_ids as string[]) || [];
  const merged: ApolloOrganizationRow[] = [];
  const seen = new Set<string>();

  for (const mid of modelIds) {
    const account = accountById.get(mid);
    if (account) {
      const key = `a:${account.apollo_account_id || mid}`;
      if (!seen.has(key)) {
        merged.push(account);
        seen.add(key);
      }
      continue;
    }
    const org = orgById.get(mid);
    if (org) {
      const key = `o:${org.id}`;
      if (!seen.has(key)) {
        merged.push(org);
        seen.add(key);
      }
    }
  }

  if (merged.length === 0) {
    for (const o of orgRows) merged.push(o);
    for (const a of accountRows) merged.push(a);
  } else {
    for (const o of orgRows) {
      const key = `o:${o.id}`;
      if (!seen.has(key)) {
        merged.push(o);
        seen.add(key);
      }
    }
    for (const a of accountRows) {
      const key = `a:${a.apollo_account_id || a.id}`;
      if (!seen.has(key)) {
        merged.push(a);
        seen.add(key);
      }
    }
  }

  return {
    organizations: merged,
    pagination: (j.pagination as ApolloSearchResponse['pagination']) || null,
    breadcrumbs: j.breadcrumbs as unknown[] | undefined,
    partial_results_only: j.partial_results_only as boolean | undefined,
    model_ids: modelIds,
    page_organization_count: orgRows.length,
    page_account_count: accountRows.length,
  };
}

export class ApolloApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApolloApiError';
    this.status = status;
    this.details = details;
  }
}

export async function postApolloOrganizationSearch(
  filters: ApolloOrganizationFilters,
  page: number,
  perPage: number
): Promise<ApolloSearchResponse> {
  const useProxy = import.meta.env.DEV && import.meta.env.VITE_APOLLO_USE_DEV_PROXY !== 'false';
  const apiKey = getApolloApiKey();

  if (!useProxy && !apiKey) {
    throw new ApolloApiError('VITE_APOLLO_API_KEY is not set in .env', 503);
  }

  const sp = buildApolloSearchQuery(filters, page, perPage);
  const url = `${getApolloBaseUrl()}${APOLLO_SEARCH_PATH}?${sp.toString()}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  };
  if (!useProxy && apiKey) headers['x-api-key'] = apiKey;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({}) });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      (json && (String(json.message || json.error || ''))) || text || res.statusText || 'Apollo search failed';
    throw new ApolloApiError(msg, res.status, json);
  }

  const j = json || {};
  return normalizeMixedCompaniesResponse(j);
}

export function parseMinFoundedYear(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? DEFAULT_MIN_FOUNDED_YEAR).trim(), 10);
  if (!Number.isFinite(n)) return DEFAULT_MIN_FOUNDED_YEAR;
  return Math.min(2100, Math.max(1000, n));
}

export function passesMinFoundedYear(org: { founded_year?: number | null }, minYear: number): boolean {
  const raw = org?.founded_year;
  if (raw == null || raw === ('' as unknown)) {
    return minYear <= DEFAULT_MIN_FOUNDED_YEAR;
  }
  const n = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n)) return minYear <= DEFAULT_MIN_FOUNDED_YEAR;
  return n >= minYear;
}

export function filterOrganizationsByFoundedYear<T extends { founded_year?: number | null }>(
  organizations: T[],
  minYear: number
): T[] {
  return organizations.filter((org) => passesMinFoundedYear(org, minYear));
}

const MAX_EXTRACT_PAGES = 500;

export async function fetchAllOrganizationsForFilters(
  filters: ApolloOrganizationFilters,
  maxPages = MAX_EXTRACT_PAGES,
  onProgress?: (page: number, totalPages: number) => void
): Promise<{ organizations: ApolloSearchResponse['organizations']; totalPages: number }> {
  const all: ApolloSearchResponse['organizations'] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= maxPages) {
    const data = await postApolloOrganizationSearch(filters, page, 100);
    const orgs = data.organizations || [];
    all.push(...orgs);
    const pag = data.pagination;
    totalPages = Math.max(1, pag?.total_pages ?? 1);
    onProgress?.(page, totalPages);
    if (orgs.length === 0) break;
    page += 1;
  }

  return { organizations: all, totalPages };
}
