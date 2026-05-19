import type { ApolloOrganizationRow } from '@/types/apolloSearch';

const CSV_HEADER = [
  'apollo_id',
  'name',
  'primary_domain',
  'website_url',
  'phone',
  'linkedin_url',
  'twitter_url',
  'facebook_url',
  'founded_year',
  'alexa_ranking',
] as const;

function csvEscape(val: unknown): string {
  const s = val == null ? '' : String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function apolloOrgToCsvRow(org: ApolloOrganizationRow): string[] {
  const phone =
    org.phone ||
    (org.primary_phone && (org.primary_phone.sanitized_number || org.primary_phone.number)) ||
    '';
  return [
    org.apollo_account_id || org.id,
    org.name,
    org.primary_domain,
    org.website_url,
    phone,
    org.linkedin_url,
    org.twitter_url,
    org.facebook_url,
    org.founded_year,
    org.alexa_ranking,
  ].map(csvEscape);
}

export function organizationsToCsv(organizations: ApolloOrganizationRow[]): string {
  const lines = [CSV_HEADER.join(',')];
  for (const org of organizations) {
    lines.push(apolloOrgToCsvRow(org).join(','));
  }
  return lines.join('\r\n');
}

export function downloadCsvFile(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
