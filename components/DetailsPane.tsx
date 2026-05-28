'use client';
import { useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/status';
import StatusBadge from './StatusBadge';
import AttachmentsPanel from './AttachmentsPanel';
import type { Plot, PlotStatus } from '@/lib/types';

export default function DetailsPane() {
  const plots = useStore((s) => s.plots);
  const selectedId = useStore((s) => s.selectedId);
  const loadState = useStore((s) => s.loadState);
  const loadError = useStore((s) => s.loadError);
  const select = useStore((s) => s.select);

  const plot = selectedId ? plots[selectedId] : null;

  if (!plot) {
    return (
      <aside className="flex h-full w-full flex-col gap-3 border-l border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:w-80">
        <h2 className="text-base font-semibold">Plots</h2>
        {loadState === 'loading' && (
          <p className="text-sm text-zinc-500">Loading…</p>
        )}
        {loadState === 'error' && (
          <p className="text-sm text-red-600">{loadError}</p>
        )}
        {loadState === 'ready' && Object.keys(plots).length === 0 && (
          <p className="text-sm text-zinc-500">
            Click on the map to add your first plot.
          </p>
        )}
        <ul className="flex flex-col gap-1 overflow-auto">
          {Object.values(plots)
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => select(p.id)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
                >
                  <span className="truncate">{p.title}</span>
                  <StatusBadge status={p.status} />
                </button>
              </li>
            ))}
        </ul>
      </aside>
    );
  }

  // Re-mount the form (and attachments) on selection change so all local state
  // resets cleanly — see https://react.dev/learn/preserving-and-resetting-state.
  return <PlotForm key={plot.id} plot={plot} />;
}

// Local fields the form owns until the user pauses typing or blurs, so we
// don't fire a DB write per keystroke.
const DEBOUNCE_MS = 600;

type TextField =
  | 'title'
  | 'availability'
  | 'phone'
  | 'contactName'
  | 'notes'
  | 'listingUrl';

type Draft = Pick<Plot, TextField | 'priceZl' | 'visitedAt'>;

function draftFrom(plot: Plot): Draft {
  return {
    title: plot.title,
    availability: plot.availability,
    phone: plot.phone,
    contactName: plot.contactName,
    notes: plot.notes,
    listingUrl: plot.listingUrl,
    priceZl: plot.priceZl,
    visitedAt: plot.visitedAt,
  };
}

function PlotForm({ plot }: { plot: Plot }) {
  const updatePlot = useStore((s) => s.updatePlot);
  const removePlot = useStore((s) => s.removePlot);
  const select = useStore((s) => s.select);

  const [draft, setDraft] = useState<Draft>(() => draftFrom(plot));
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(() => {
      updatePlot(plot.id, { [key]: value });
    }, DEBOUNCE_MS);
  }

  function onBlurFlush() {
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    updatePlot(plot.id, draft);
  }

  return (
    <aside className="flex h-full w-full flex-col gap-3 overflow-auto border-l border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:w-80">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Plot details</h2>
        <button
          onClick={() => select(null)}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {plot.parcelId && (
        <div className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="font-medium text-zinc-700 dark:text-zinc-300">
            Parcel {plot.parcelId}
          </div>
          {plot.address && (
            <div className="text-zinc-500">{plot.address}</div>
          )}
        </div>
      )}

      <Field label="Title">
        <input
          value={draft.title ?? ''}
          onChange={(e) => onChange('title', e.target.value)}
          onBlur={onBlurFlush}
          className={inputCls}
        />
      </Field>

      <Field label="Status">
        <select
          value={plot.status}
          onChange={(e) =>
            updatePlot(plot.id, { status: e.target.value as PlotStatus })
          }
          className={inputCls}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Price (zł)">
        <input
          type="number"
          inputMode="decimal"
          value={draft.priceZl ?? ''}
          onChange={(e) =>
            onChange(
              'priceZl',
              e.target.value ? Number(e.target.value) : undefined,
            )
          }
          onBlur={onBlurFlush}
          className={inputCls}
        />
      </Field>

      <Field label="Availability">
        <input
          value={draft.availability ?? ''}
          onChange={(e) => onChange('availability', e.target.value)}
          onBlur={onBlurFlush}
          className={inputCls}
        />
      </Field>

      <Field label="Contact name">
        <input
          value={draft.contactName ?? ''}
          onChange={(e) => onChange('contactName', e.target.value)}
          onBlur={onBlurFlush}
          className={inputCls}
        />
      </Field>

      <Field label="Phone">
        <input
          value={draft.phone ?? ''}
          onChange={(e) => onChange('phone', e.target.value)}
          onBlur={onBlurFlush}
          className={inputCls}
        />
      </Field>

      <Field label="Listing URL">
        <input
          type="url"
          value={draft.listingUrl ?? ''}
          onChange={(e) => onChange('listingUrl', e.target.value)}
          onBlur={onBlurFlush}
          placeholder="https://otodom.pl/…"
          className={inputCls}
        />
      </Field>

      <Field label="Visited on">
        <input
          type="date"
          value={draft.visitedAt ?? ''}
          onChange={(e) => onChange('visitedAt', e.target.value || undefined)}
          onBlur={onBlurFlush}
          className={inputCls}
        />
      </Field>

      <Field label="Notes">
        <textarea
          value={draft.notes ?? ''}
          onChange={(e) => onChange('notes', e.target.value)}
          onBlur={onBlurFlush}
          rows={4}
          className={inputCls}
        />
      </Field>

      <AttachmentsPanel plotId={plot.id} />

      <div className="mt-auto flex items-center justify-between pt-2 text-xs text-zinc-500">
        <span>
          {plot.lat.toFixed(5)}, {plot.lng.toFixed(5)}
        </span>
        <button
          onClick={() => removePlot(plot.id)}
          className="rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
        >
          Delete
        </button>
      </div>
    </aside>
  );
}

const inputCls =
  'w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}
