import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

function splitCsvLike(s: string): string[] {
  return String(s || '')
    .split(/[,;\n]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

type Props = {
  id?: string;
  label: string;
  hint?: string;
  valueCsv: string;
  onChangeCsv: (next: string) => void;
  placeholder?: string;
};

export function ApolloKeywordTagsField({
  id,
  label,
  hint,
  valueCsv,
  onChangeCsv,
  placeholder = 'Type a tag and press Enter',
}: Props) {
  const tags = useMemo(() => splitCsvLike(valueCsv), [valueCsv]);
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);

  function commitTokens(raw: string) {
    const tokens = splitCsvLike(raw);
    if (!tokens.length) return;

    const existing = new Set(tags);
    const nextTags = [...tags];
    for (const t of tokens) {
      if (!existing.has(t)) {
        existing.add(t);
        nextTags.push(t);
      }
    }
    onChangeCsv(nextTags.join(', '));
    setDraft('');
    setOpen(false);
  }

  function removeTag(tag: string) {
    onChangeCsv(tags.filter((t) => t !== tag).join(', '));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTokens(draft);
      return;
    }
    if (e.key === ',') {
      e.preventDefault();
      commitTokens(draft + ',');
      return;
    }
    if (e.key === 'Backspace' && !draft && tags.length) {
      removeTag(tags[tags.length - 1]!);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <div className="space-y-2">
        <Input
          id={id}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-expanded={open}
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1" aria-label="Selected keyword tags">
            {tags.map((t) => (
              <span
                key={t}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs'
                )}
              >
                {t}
                <button
                  type="button"
                  className="rounded-full px-0.5 leading-none text-muted-foreground hover:text-foreground"
                  onClick={() => removeTag(t)}
                  aria-label={`Remove ${t}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
