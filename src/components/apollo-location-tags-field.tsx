import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { APOLLO_HQ_LOCATION_SUGGESTIONS } from '@/data/apolloHqLocationSuggestions';

type Props = {
  id?: string;
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

export function ApolloLocationTagsField({
  id,
  label,
  hint,
  values,
  onChange,
  placeholder = 'Type a city, state, or country…',
}: Props) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) return [];
    const taken = new Set(values.map((v) => v.toLowerCase()));
    return APOLLO_HQ_LOCATION_SUGGESTIONS.filter((s) => s.includes(q) && !taken.has(s)).slice(0, 12);
  }, [input, values]);

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase();
    if (!t) return;
    if (values.some((v) => v.toLowerCase() === t)) return;
    onChange([...values, t]);
    setInput('');
    setOpen(false);
    setActiveIdx(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && suggestions.length > 0) {
        addTag(suggestions[Math.min(activeIdx, suggestions.length - 1)]!);
      } else {
        addTag(input);
      }
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown' && open && suggestions.length > 0) {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === 'ArrowUp' && open && suggestions.length > 0) {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <div className="relative">
        <Input
          id={id}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
            setActiveIdx(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 180)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
        />
        {open && suggestions.length > 0 && (
          <ul
            className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover text-sm shadow-md"
            role="listbox"
          >
            {suggestions.map((s, i) => (
              <li key={s} role="option" aria-selected={i === activeIdx}>
                <button
                  type="button"
                  className={cn('w-full px-3 py-2 text-left hover:bg-muted', i === activeIdx && 'bg-muted')}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => addTag(s)}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1" aria-label="Selected locations">
          {values.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs"
            >
              {tag}
              <button
                type="button"
                className="rounded-full px-0.5 leading-none text-muted-foreground hover:text-foreground"
                onClick={() => onChange(values.filter((v) => v !== tag))}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
