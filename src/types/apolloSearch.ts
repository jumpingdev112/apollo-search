/**
 * Apollo Organization Search (OpenAPI) does not declare `enum` types for filters.
 * Parameters are free-text strings, string arrays, or integers; see
 * https://docs.apollo.io/reference/organization-search
 *
 * Employee headcount uses strings like `min,max` (comma between bounds). UI presets
 * below match common Apollo buckets; they are not a separate official enum in the spec.
 */
export const APOLLO_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

/** Comma-separated lower,upper pairs as required by Apollo (e.g. `1,10`, `250,1000`). */
export const APOLLO_EMPLOYEE_RANGE_PRESETS: { value: string; label: string }[] = [
  { value: '1,10', label: '1–10' },
  { value: '11,50', label: '11–50' },
  { value: '51,200', label: '51–200' },
  { value: '201,500', label: '201–500' },
  { value: '501,1000', label: '501–1,000' },
  { value: '1001,5000', label: '1,001–5,000' },
  { value: '5001,10000', label: '5,001–10,000' },
  { value: '10001,10000000', label: '10,001+' },
];

const PRESET_EMPLOYEE_VALUES = new Set(APOLLO_EMPLOYEE_RANGE_PRESETS.map((p) => p.value));

/** Custom ranges only: split on `;` or newlines (commas are inside each range). */
export function splitEmployeeRangesCustom(s: string): string[] {
  return s
    .split(/[;\n]+/)
    .map((x) => x.trim())
    .filter((x) => /^\d+\s*,\s*\d+$/.test(x))
    .map((x) => x.replace(/\s/g, ''));
}

/** Payload sent to our backend → Apollo Organization Search (snake_case keys). */
export interface ApolloOrganizationFilters {
  q_organization_name?: string;
  q_organization_domains_list?: string[];
  organization_num_employees_ranges?: string[];
  organization_locations?: string[];
  organization_not_locations?: string[];
  revenue_range?: { min?: number; max?: number };
  q_organization_keyword_tags?: string[];
  currently_using_any_of_technology_uids?: string[];
  organization_ids?: string[];
  latest_funding_amount_range?: { min?: number; max?: number };
  total_funding_range?: { min?: number; max?: number };
  latest_funding_date_range?: { min?: string; max?: string };
  q_organization_job_titles?: string[];
  organization_job_locations?: string[];
  organization_num_jobs_range?: { min?: number; max?: number };
  organization_job_posted_at_range?: { min?: string; max?: string };
}

export interface ApolloPagination {
  page: number;
  per_page: number;
  total_entries: number;
  total_pages: number;
}

export interface ApolloOrganizationRow {
  id: string;
  name: string;
  website_url?: string | null;
  primary_domain?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  facebook_url?: string | null;
  phone?: string | null;
  primary_phone?: { number?: string; sanitized_number?: string } | null;
  founded_year?: number | null;
  alexa_ranking?: number | null;
}

export interface ApolloSearchResponse {
  organizations: ApolloOrganizationRow[];
  pagination: ApolloPagination | null;
  breadcrumbs?: unknown[];
  partial_results_only?: boolean;
  model_ids?: string[];
}

export interface CompanySavedSearchItem {
  id: string;
  name: string;
  filters: ApolloOrganizationFilters;
  createdAt: string;
  updatedAt: string;
}

function splitList(s: string): string[] {
  return s
    .split(/[,;\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function numOrUndef(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** Build Apollo filters from sidebar form strings (empty → omitted). */
export function buildApolloFiltersFromFormState(f: ApolloSearchFormState): ApolloOrganizationFilters {
  const out: ApolloOrganizationFilters = {};
  if (f.q_organization_name.trim()) out.q_organization_name = f.q_organization_name.trim();
  const domains = splitList(f.q_organization_domains_list);
  if (domains.length) out.q_organization_domains_list = domains;
  const empCustom = splitEmployeeRangesCustom(f.organization_num_employees_ranges_custom);
  const emp = [...new Set([...(f.employee_ranges_presets || []), ...empCustom])];
  if (emp.length) out.organization_num_employees_ranges = emp;
  const locs = [...new Set((f.organization_locations || []).map((x) => String(x).trim().toLowerCase()))].filter(
    Boolean
  );
  if (locs.length) out.organization_locations = locs;
  const notLocs = [
    ...new Set((f.organization_not_locations || []).map((x) => String(x).trim().toLowerCase())),
  ].filter(Boolean);
  if (notLocs.length) out.organization_not_locations = notLocs;
  const rmin = numOrUndef(f.revenue_min);
  const rmax = numOrUndef(f.revenue_max);
  if (rmin != null || rmax != null) out.revenue_range = { ...(rmin != null ? { min: rmin } : {}), ...(rmax != null ? { max: rmax } : {}) };
  const kw = splitList(f.q_organization_keyword_tags);
  if (kw.length) out.q_organization_keyword_tags = kw;
  const tech = splitList(f.currently_using_any_of_technology_uids);
  if (tech.length) out.currently_using_any_of_technology_uids = tech;
  const oids = splitList(f.organization_ids);
  if (oids.length) out.organization_ids = oids;
  const lfamin = numOrUndef(f.latest_funding_amount_min);
  const lfamax = numOrUndef(f.latest_funding_amount_max);
  if (lfamin != null || lfamax != null) {
    out.latest_funding_amount_range = {
      ...(lfamin != null ? { min: lfamin } : {}),
      ...(lfamax != null ? { max: lfamax } : {}),
    };
  }
  const tfmin = numOrUndef(f.total_funding_min);
  const tfmax = numOrUndef(f.total_funding_max);
  if (tfmin != null || tfmax != null) {
    out.total_funding_range = { ...(tfmin != null ? { min: tfmin } : {}), ...(tfmax != null ? { max: tfmax } : {}) };
  }
  if (f.latest_funding_date_min.trim() || f.latest_funding_date_max.trim()) {
    out.latest_funding_date_range = {
      ...(f.latest_funding_date_min.trim() ? { min: f.latest_funding_date_min.trim() } : {}),
      ...(f.latest_funding_date_max.trim() ? { max: f.latest_funding_date_max.trim() } : {}),
    };
  }
  const jt = splitList(f.q_organization_job_titles);
  if (jt.length) out.q_organization_job_titles = jt;
  const jl = splitList(f.organization_job_locations);
  if (jl.length) out.organization_job_locations = jl;
  const njmin = numOrUndef(f.organization_num_jobs_min);
  const njmax = numOrUndef(f.organization_num_jobs_max);
  if (njmin != null || njmax != null) {
    out.organization_num_jobs_range = {
      ...(njmin != null ? { min: njmin } : {}),
      ...(njmax != null ? { max: njmax } : {}),
    };
  }
  if (f.organization_job_posted_min.trim() || f.organization_job_posted_max.trim()) {
    out.organization_job_posted_at_range = {
      ...(f.organization_job_posted_min.trim() ? { min: f.organization_job_posted_min.trim() } : {}),
      ...(f.organization_job_posted_max.trim() ? { max: f.organization_job_posted_max.trim() } : {}),
    };
  }
  return out;
}

export interface ApolloSearchFormState {
  q_organization_name: string;
  q_organization_domains_list: string;
  /** Selected preset values (each is `lower,upper`). */
  employee_ranges_presets: string[];
  /** Extra ranges, `min,max` each; separate with `;` or newline. */
  organization_num_employees_ranges_custom: string;
  per_page: string;
  /** HQ location filters (lowercase tags). */
  organization_locations: string[];
  organization_not_locations: string[];
  revenue_min: string;
  revenue_max: string;
  q_organization_keyword_tags: string;
  currently_using_any_of_technology_uids: string;
  organization_ids: string;
  latest_funding_amount_min: string;
  latest_funding_amount_max: string;
  total_funding_min: string;
  total_funding_max: string;
  latest_funding_date_min: string;
  latest_funding_date_max: string;
  q_organization_job_titles: string;
  organization_job_locations: string;
  organization_num_jobs_min: string;
  organization_num_jobs_max: string;
  organization_job_posted_min: string;
  organization_job_posted_max: string;
}

export function getEmptyApolloSearchForm(): ApolloSearchFormState {
  return {
    q_organization_name: '',
    q_organization_domains_list: '',
    employee_ranges_presets: [],
    organization_num_employees_ranges_custom: '',
    per_page: '25',
    organization_locations: [],
    organization_not_locations: [],
    revenue_min: '',
    revenue_max: '',
    q_organization_keyword_tags: '',
    currently_using_any_of_technology_uids: '',
    organization_ids: '',
    latest_funding_amount_min: '',
    latest_funding_amount_max: '',
    total_funding_min: '',
    total_funding_max: '',
    latest_funding_date_min: '',
    latest_funding_date_max: '',
    q_organization_job_titles: '',
    organization_job_locations: '',
    organization_num_jobs_min: '',
    organization_num_jobs_max: '',
    organization_job_posted_min: '',
    organization_job_posted_max: '',
  };
}

/** Inverse: fill form from saved filters object. */
export function formStateFromFilters(filters: ApolloOrganizationFilters): ApolloSearchFormState {
  const f = getEmptyApolloSearchForm();
  if (!filters || typeof filters !== 'object') return f;
  if (filters.q_organization_name) f.q_organization_name = filters.q_organization_name;
  if (filters.q_organization_domains_list?.length) {
    f.q_organization_domains_list = filters.q_organization_domains_list.join(', ');
  }
  if (filters.organization_num_employees_ranges?.length) {
    const presets: string[] = [];
    const custom: string[] = [];
    for (const r of filters.organization_num_employees_ranges) {
      const v = String(r).trim();
      if (PRESET_EMPLOYEE_VALUES.has(v)) presets.push(v);
      else custom.push(v);
    }
    f.employee_ranges_presets = presets;
    f.organization_num_employees_ranges_custom = custom.join('; ');
  }
  if (filters.organization_locations?.length) {
    f.organization_locations = filters.organization_locations.map((x) => String(x).trim().toLowerCase());
  }
  if (filters.organization_not_locations?.length) {
    f.organization_not_locations = filters.organization_not_locations.map((x) => String(x).trim().toLowerCase());
  }
  if (filters.revenue_range) {
    if (filters.revenue_range.min != null) f.revenue_min = String(filters.revenue_range.min);
    if (filters.revenue_range.max != null) f.revenue_max = String(filters.revenue_range.max);
  }
  if (filters.q_organization_keyword_tags?.length) {
    f.q_organization_keyword_tags = filters.q_organization_keyword_tags.join(', ');
  }
  if (filters.currently_using_any_of_technology_uids?.length) {
    f.currently_using_any_of_technology_uids = filters.currently_using_any_of_technology_uids.join(', ');
  }
  if (filters.organization_ids?.length) f.organization_ids = filters.organization_ids.join(', ');
  if (filters.latest_funding_amount_range) {
    if (filters.latest_funding_amount_range.min != null) {
      f.latest_funding_amount_min = String(filters.latest_funding_amount_range.min);
    }
    if (filters.latest_funding_amount_range.max != null) {
      f.latest_funding_amount_max = String(filters.latest_funding_amount_range.max);
    }
  }
  if (filters.total_funding_range) {
    if (filters.total_funding_range.min != null) f.total_funding_min = String(filters.total_funding_range.min);
    if (filters.total_funding_range.max != null) f.total_funding_max = String(filters.total_funding_range.max);
  }
  if (filters.latest_funding_date_range) {
    if (filters.latest_funding_date_range.min) f.latest_funding_date_min = filters.latest_funding_date_range.min;
    if (filters.latest_funding_date_range.max) f.latest_funding_date_max = filters.latest_funding_date_range.max;
  }
  if (filters.q_organization_job_titles?.length) {
    f.q_organization_job_titles = filters.q_organization_job_titles.join(', ');
  }
  if (filters.organization_job_locations?.length) {
    f.organization_job_locations = filters.organization_job_locations.join(', ');
  }
  if (filters.organization_num_jobs_range) {
    if (filters.organization_num_jobs_range.min != null) {
      f.organization_num_jobs_min = String(filters.organization_num_jobs_range.min);
    }
    if (filters.organization_num_jobs_range.max != null) {
      f.organization_num_jobs_max = String(filters.organization_num_jobs_range.max);
    }
  }
  if (filters.organization_job_posted_at_range) {
    if (filters.organization_job_posted_at_range.min) {
      f.organization_job_posted_min = filters.organization_job_posted_at_range.min;
    }
    if (filters.organization_job_posted_at_range.max) {
      f.organization_job_posted_max = filters.organization_job_posted_at_range.max;
    }
  }
  return f;
}

export function filtersAreEmpty(filters: ApolloOrganizationFilters): boolean {
  return Object.keys(filters).length === 0;
}
