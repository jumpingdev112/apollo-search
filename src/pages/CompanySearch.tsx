import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApolloLocationTagsField } from '@/components/apollo-location-tags-field';
import { ApolloKeywordTagsField } from '@/components/apollo-keyword-tags-field';
import {
  APOLLO_EMPLOYEE_RANGE_PRESETS,
  APOLLO_PER_PAGE_OPTIONS,
  ApolloOrganizationFilters,
  ApolloSearchResponse,
  ApolloSearchFormState,
  buildApolloFiltersFromFormState,
  filtersAreEmpty,
  formStateFromFilters,
  getEmptyApolloSearchForm,
} from '@/types/apolloSearch';
import {
  ApolloApiError,
  fetchAllOrganizationsForFilters,
  filterOrganizationsByFoundedYear,
  getApolloApiKey,
  parseMinFoundedYear,
  postApolloOrganizationSearch,
} from '@/services/apolloOrganizationService';
import { downloadCsvFile, organizationsToCsv } from '@/services/csvExport';
import {
  deleteSavedSearch,
  listSavedSearches,
  saveSearch,
  type SavedSearchItem,
} from '@/services/savedSearches';

export function CompanySearchPage() {
  const [form, setForm] = useState<ApolloSearchFormState>(() => getEmptyApolloSearchForm());
  const [saveName, setSaveName] = useState('');
  const [page, setPage] = useState(1);
  const [searchResult, setSearchResult] = useState<ApolloSearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState('');
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractProgress, setExtractProgress] = useState('');
  const [extractMessage, setExtractMessage] = useState('');
  const [extractMinFoundedYear, setExtractMinFoundedYear] = useState('1950');

  const hasApiKey = useMemo(() => {
    const useProxy = import.meta.env.DEV && import.meta.env.VITE_APOLLO_USE_DEV_PROXY !== 'false';
    return useProxy || Boolean(getApolloApiKey());
  }, []);

  const filters = useMemo(() => buildApolloFiltersFromFormState(form), [form]);
  const canSearch = useMemo(() => !filtersAreEmpty(filters), [filters]);
  const canSave = useMemo(() => !filtersAreEmpty(filters) && saveName.trim().length > 0, [filters, saveName]);
  const perPageNum = Math.min(100, Math.max(1, parseInt(form.per_page, 10) || 25));

  const loadSavedSearches = useCallback(() => {
    setSavedSearches(listSavedSearches());
  }, []);

  useEffect(() => {
    loadSavedSearches();
  }, [loadSavedSearches]);

  function setField<K extends keyof ApolloSearchFormState>(key: K, value: ApolloSearchFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleEmployeePreset(value: string) {
    setForm((prev) => {
      const next = new Set(prev.employee_ranges_presets);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, employee_ranges_presets: [...next] };
    });
  }

  async function runSearch(nextPage: number) {
    setError('');
    setSearchLoading(true);
    setPage(nextPage);
    try {
      const data = await postApolloOrganizationSearch(filters, nextPage, perPageNum);
      setSearchResult(data);
    } catch (err) {
      setSearchResult(null);
      setError(err instanceof ApolloApiError ? err.message : err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    await runSearch(1);
  }

  function handleSaveSearch() {
    if (!canSave) return;
    setError('');
    try {
      saveSearch(saveName.trim(), filters);
      setSaveName('');
      loadSavedSearches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  function applySavedSearch(id: string) {
    setSelectedSavedId(id);
    const item = savedSearches.find((s) => s.id === id);
    if (!item) return;
    setForm(formStateFromFilters(item.filters as ApolloOrganizationFilters));
  }

  function handleDeleteSaved() {
    if (!selectedSavedId) return;
    if (!window.confirm('Delete this saved search?')) return;
    deleteSavedSearch(selectedSavedId);
    setSelectedSavedId('');
    loadSavedSearches();
  }

  function parsedMinFoundedYear(): number {
    return parseMinFoundedYear(extractMinFoundedYear);
  }

  async function downloadCsv() {
    if (filtersAreEmpty(filters)) {
      setError('Set at least one filter before extracting.');
      return;
    }
    setExtractLoading(true);
    setError('');
    setExtractMessage('');
    setExtractProgress('');
    const minFoundedYear = parsedMinFoundedYear();
    try {
      const { organizations, totalPages } = await fetchAllOrganizationsForFilters(filters, 500, (p, tp) => {
        setExtractProgress(`Fetching page ${p} of ${tp}…`);
      });
      const totalFetched = organizations.length;
      const filtered = filterOrganizationsByFoundedYear(organizations, minFoundedYear);
      const csv = organizationsToCsv(filtered);
      downloadCsvFile(csv, `apollo-organizations-founded-ge-${minFoundedYear}.csv`);
      setExtractMessage(
        `CSV downloaded (${filtered.length} rows, founded ≥ ${minFoundedYear}; ${totalFetched} fetched from Apollo across ${totalPages} page(s) before year filter).`
      );
    } catch (err) {
      setError(err instanceof ApolloApiError ? err.message : err instanceof Error ? err.message : 'CSV export failed');
    } finally {
      setExtractLoading(false);
      setExtractProgress('');
    }
  }

  const totalPages = searchResult?.pagination?.total_pages ?? 1;
  const totalEntries = searchResult?.pagination?.total_entries ?? 0;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 space-y-4 rounded-lg border bg-card p-4 lg:w-96 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Apollo search</h2>
          <p className="text-xs text-muted-foreground">
            Filters match{' '}
            <a
              href="https://docs.apollo.io/reference/organization-search"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              Apollo Organization Search
            </a>
            . Saved searches are stored in your browser.
          </p>
        </div>

        {!hasApiKey && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Set <code className="text-[11px]">VITE_APOLLO_API_KEY</code> in <code className="text-[11px]">.env</code>, or
            use the dev proxy (default in development).
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="saved-search">Saved searches</Label>
          <div className="flex gap-2">
            <select
              id="saved-search"
              className="flex h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={selectedSavedId}
              onChange={(e) => applySavedSearch(e.target.value)}
            >
              <option value="">Select to load…</option>
              {savedSearches.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selectedSavedId}
              onClick={handleDeleteSaved}
            >
              Delete
            </Button>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div>
            <Label htmlFor="q_organization_name">Company name</Label>
            <Input
              id="q_organization_name"
              value={form.q_organization_name}
              onChange={(e) => setField('q_organization_name', e.target.value)}
              placeholder="Partial match"
            />
          </div>
          <div>
            <Label htmlFor="domains">Domains</Label>
            <Textarea
              id="domains"
              rows={2}
              value={form.q_organization_domains_list}
              onChange={(e) => setField('q_organization_domains_list', e.target.value)}
              placeholder="apollo.io, microsoft.com"
            />
          </div>
          <div>
            <Label>Employees (headcount)</Label>
            <p className="mb-2 text-xs text-muted-foreground">
              Presets use Apollo’s <code className="text-[11px]">min,max</code> format.
            </p>
            <div className="mb-2 flex flex-wrap gap-2">
              {APOLLO_EMPLOYEE_RANGE_PRESETS.map((p) => (
                <label
                  key={p.value}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted/60"
                >
                  <input
                    type="checkbox"
                    className="rounded border-input"
                    checked={form.employee_ranges_presets.includes(p.value)}
                    onChange={() => toggleEmployeePreset(p.value)}
                  />
                  {p.label}
                </label>
              ))}
            </div>
            <Label htmlFor="emp-custom" className="text-xs text-muted-foreground">
              Custom ranges (<code className="text-[11px]">min,max</code>; separate with ; or newline)
            </Label>
            <Textarea
              id="emp-custom"
              rows={2}
              className="mt-1"
              value={form.organization_num_employees_ranges_custom}
              onChange={(e) => setField('organization_num_employees_ranges_custom', e.target.value)}
              placeholder="250,500; 10000,20000"
            />
          </div>
          <div>
            <Label htmlFor="per-page">Results per page</Label>
            <select
              id="per-page"
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={form.per_page}
              onChange={(e) => setField('per_page', e.target.value)}
            >
              {APOLLO_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <ApolloLocationTagsField
            id="hq-locations"
            label="HQ locations"
            hint="HQ is the company headquarters. Pick from suggestions or type any term and press Enter."
            values={form.organization_locations}
            onChange={(v) => setField('organization_locations', v)}
            placeholder="e.g. germany, texas, tokyo"
          />
          <ApolloLocationTagsField
            id="hq-locations-exclude"
            label="Exclude HQ locations"
            hint="Companies whose headquarters is in these places are omitted."
            values={form.organization_not_locations}
            onChange={(v) => setField('organization_not_locations', v)}
            placeholder="e.g. ireland, china"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="revmin">Revenue min</Label>
              <Input id="revmin" value={form.revenue_min} onChange={(e) => setField('revenue_min', e.target.value)} placeholder="integer" />
            </div>
            <div>
              <Label htmlFor="revmax">Revenue max</Label>
              <Input id="revmax" value={form.revenue_max} onChange={(e) => setField('revenue_max', e.target.value)} />
            </div>
          </div>
          <ApolloKeywordTagsField
            id="kw"
            label="Keyword tags"
            hint="Apollo keyword tags (e.g. mining, sales strategy). Add with Enter or comma."
            valueCsv={form.q_organization_keyword_tags}
            onChangeCsv={(v) => setField('q_organization_keyword_tags', v)}
            placeholder="e.g. mining, consulting"
          />
          <div>
            <Label htmlFor="tech">Technologies (UIDs)</Label>
            <Textarea
              id="tech"
              rows={2}
              value={form.currently_using_any_of_technology_uids}
              onChange={(e) => setField('currently_using_any_of_technology_uids', e.target.value)}
              placeholder="salesforce, google_analytics"
            />
          </div>
          <div>
            <Label htmlFor="oids">Apollo organization IDs</Label>
            <Input id="oids" value={form.organization_ids} onChange={(e) => setField('organization_ids', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="lfamin">Latest funding amt min</Label>
              <Input id="lfamin" value={form.latest_funding_amount_min} onChange={(e) => setField('latest_funding_amount_min', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="lfamax">Latest funding amt max</Label>
              <Input id="lfamax" value={form.latest_funding_amount_max} onChange={(e) => setField('latest_funding_amount_max', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="tfmin">Total funding min</Label>
              <Input id="tfmin" value={form.total_funding_min} onChange={(e) => setField('total_funding_min', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tfmax">Total funding max</Label>
              <Input id="tfmax" value={form.total_funding_max} onChange={(e) => setField('total_funding_max', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="lfdmin">Latest funding date from</Label>
              <Input id="lfdmin" type="date" value={form.latest_funding_date_min} onChange={(e) => setField('latest_funding_date_min', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="lfdmax">Latest funding date to</Label>
              <Input id="lfdmax" type="date" value={form.latest_funding_date_max} onChange={(e) => setField('latest_funding_date_max', e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="jobs">Job titles (postings)</Label>
            <Textarea id="jobs" rows={2} value={form.q_organization_job_titles} onChange={(e) => setField('q_organization_job_titles', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="joblocs">Job locations</Label>
            <Textarea id="joblocs" rows={2} value={form.organization_job_locations} onChange={(e) => setField('organization_job_locations', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="njmin"># jobs min</Label>
              <Input id="njmin" value={form.organization_num_jobs_min} onChange={(e) => setField('organization_num_jobs_min', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="njmax"># jobs max</Label>
              <Input id="njmax" value={form.organization_num_jobs_max} onChange={(e) => setField('organization_num_jobs_max', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="jpdmin">Jobs posted from</Label>
              <Input id="jpdmin" type="date" value={form.organization_job_posted_min} onChange={(e) => setField('organization_job_posted_min', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="jpdmax">Jobs posted to</Label>
              <Input id="jpdmax" type="date" value={form.organization_job_posted_max} onChange={(e) => setField('organization_job_posted_max', e.target.value)} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={searchLoading || !canSearch || !hasApiKey}>
            {searchLoading ? 'Searching…' : 'Search'}
          </Button>
        </form>

        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="save-as">Save search as</Label>
          <Input id="save-as" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="e.g. SaaS in Germany" />
          <Button type="button" disabled={!canSave} className="w-full" variant="secondary" onClick={handleSaveSearch}>
            Save search
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <h2 className="text-2xl font-semibold">Results</h2>
          <p className="text-sm text-muted-foreground">Results from Apollo (credits apply per your Apollo plan).</p>
        </div>

        {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        {extractMessage && <div className="rounded border bg-muted/40 p-3 text-sm">{extractMessage}</div>}

        <div className="space-y-2 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={extractLoading || filtersAreEmpty(filters) || !hasApiKey}
              onClick={downloadCsv}
            >
              {extractLoading ? extractProgress || 'Preparing CSV…' : 'Extract to CSV'}
            </Button>
            <div className="flex shrink-0 items-center gap-2 border-l border-border pl-3">
              <Label htmlFor="extract-min-founded" className="mb-0 text-xs whitespace-nowrap">
                Founded year ≥
              </Label>
              <Input
                id="extract-min-founded"
                type="number"
                min={1000}
                max={2100}
                className="h-9 w-[5.5rem]"
                value={extractMinFoundedYear}
                onChange={(e) => setExtractMinFoundedYear(e.target.value)}
                placeholder="1950"
              />
            </div>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Extract includes rows with <code className="text-[10px]">founded_year</code> ≥ this value. Rows without a year
            count only when this minimum is 1950 (default); for stricter years, rows without a founded year are omitted.
            Fetches up to 500 pages from Apollo.
          </p>
        </div>

        {searchLoading && <div className="py-12 text-center text-muted-foreground">Loading…</div>}

        {!searchLoading && searchResult && (
          <>
            <p className="text-sm text-muted-foreground">
              {searchResult.organizations.length} on this page
              {searchResult.page_organization_count != null && searchResult.page_account_count != null
                ? ` (${searchResult.page_organization_count} orgs, ${searchResult.page_account_count} CRM accounts)`
                : ''}
              {totalEntries != null ? ` · ${totalEntries} total matches · page ${page} of ${totalPages}` : ` · page ${page}`}
              {searchResult.partial_results_only ? ' · partial results' : ''}
            </p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Founded</th>
                    <th className="px-3 py-2 font-medium">Domain</th>
                    <th className="px-3 py-2 font-medium">Phone</th>
                    <th className="px-3 py-2 font-medium">LinkedIn</th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  {(searchResult.organizations || []).map((org) => (
                    <tr
                      key={org.apollo_account_id ? `account-${org.apollo_account_id}` : `org-${org.id}`}
                      className="hover:bg-muted/30"
                    >
                      <td className="px-3 py-2 font-medium">{org.name}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {org.source === 'account' ? 'CRM account' : 'Organization'}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {org.founded_year != null ? String(org.founded_year) : '—'}
                      </td>
                      <td className="px-3 py-2">{org.primary_domain || '—'}</td>
                      <td className="px-3 py-2">
                        {org.phone || org.primary_phone?.sanitized_number || org.primary_phone?.number || '—'}
                      </td>
                      <td className="px-3 py-2">
                        {org.linkedin_url ? (
                          <a href={org.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Link
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page <= 1 || searchLoading} onClick={() => runSearch(page - 1)}>
                  Previous
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={page >= totalPages || searchLoading} onClick={() => runSearch(page + 1)}>
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {!searchLoading && !searchResult && (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            Run a search to see Apollo organizations here.
          </div>
        )}
      </div>
    </div>
  );
}
