"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

function normalizeList(values: string[]) {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    ordered.push(trimmed);
  }

  return ordered;
}

type TagEditorProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  helperText?: string;
  suggestions?: string[];
  emptyMessage?: string;
  maxVisibleSuggestions?: number;
};

export function TagEditor({
  label,
  values,
  onChange,
  placeholder,
  helperText,
  suggestions = [],
  emptyMessage = "No items added yet.",
  maxVisibleSuggestions = 8,
}: TagEditorProps) {
  const [draft, setDraft] = useState("");
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const normalizedSuggestions = normalizeList(suggestions).filter(
    (suggestion) => !values.some((value) => value.toLowerCase() === suggestion.toLowerCase()),
  );
  const visibleSuggestions = useMemo(
    () =>
      showAllSuggestions
        ? normalizedSuggestions
        : normalizedSuggestions.slice(0, maxVisibleSuggestions),
    [maxVisibleSuggestions, normalizedSuggestions, showAllSuggestions],
  );

  function commitValue(rawValue: string) {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return;
    }

    onChange(normalizeList([...values, trimmed]));
    setDraft("");
  }

  function removeValue(value: string) {
    onChange(values.filter((item) => item.toLowerCase() !== value.toLowerCase()));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitValue(draft);
    }
  }

  return (
    <div className="space-y-3 rounded-[1.5rem] border border-blue-100 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
          {label}
        </p>
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={values.length === 0}
          className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-45"
        >
          Clear
        </button>
      </div>

      {values.length ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-black/80"
            >
              {value}
              <button
                type="button"
                onClick={() => removeValue(value)}
                className="rounded-full text-black/50 transition hover:text-black"
                aria-label={`Remove ${value}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-black/60">{emptyMessage}</p>
      )}

      <div className="flex flex-col gap-3 md:flex-row">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-black/80 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
        />
        <button
          type="button"
          onClick={() => commitValue(draft)}
          className="rounded-2xl border border-blue-200 bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Add
        </button>
      </div>

      {helperText ? (
        <p className="text-xs leading-6 text-black/60">{helperText}</p>
      ) : null}

      {normalizedSuggestions.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
            Suggestions
          </p>
          <div className="flex flex-wrap gap-2">
            {visibleSuggestions.map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                onClick={() => commitValue(suggestion)}
                className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 transition hover:border-black hover:text-black"
              >
                {suggestion}
              </button>
            ))}
            {normalizedSuggestions.length > maxVisibleSuggestions ? (
              <button
                type="button"
                onClick={() => setShowAllSuggestions((current) => !current)}
                className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 transition hover:border-black hover:text-black"
              >
                {showAllSuggestions
                  ? "Show fewer"
                  : `Show ${normalizedSuggestions.length - maxVisibleSuggestions} more`}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
