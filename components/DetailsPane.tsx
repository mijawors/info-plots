'use client';
import { useStore } from '@/lib/store';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/status';
import StatusBadge from './StatusBadge';
import type { PlotStatus } from '@/lib/types';

export default function DetailsPane() {
  const plots = useStore((s) => s.plots);
  const selectedId = useStore((s) => s.selectedId);
  const updatePlot = useStore((s) => s.updatePlot);
  const removePlot = useStore((s) => s.removePlot);
  const select = useStore((s) => s.select);

  const plot = selectedId ? plots[selectedId] : null;

  if (!plot) {
    return (
      <aside className="flex h-full w-full flex-col gap-3 border-l border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:w-80">
        <h2 className="text-base font-semibold">Plots</h2>
        <p className="text-sm text-zinc-500">
          Click on the map to add a plot. Click a marker to edit it here.
        </p>
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

  const set = <K extends keyof typeof plot>(
    key: K,
    value: (typeof plot)[K],
  ) => updatePlot(plot.id, { [key]: value });

  return (
    <aside className="flex h-full w-full flex-col gap-3 border-l border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:w-80">
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
          value={plot.title}
          onChange={(e) => set('title', e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Status">
        <select
          value={plot.status}
          onChange={(e) => set('status', e.target.value as PlotStatus)}
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
          value={plot.priceZl ?? ''}
          onChange={(e) =>
            set('priceZl', e.target.value ? Number(e.target.value) : undefined)
          }
          className={inputCls}
        />
      </Field>

      <Field label="Availability">
        <input
          value={plot.availability ?? ''}
          onChange={(e) => set('availability', e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Contact name">
        <input
          value={plot.contactName ?? ''}
          onChange={(e) => set('contactName', e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Phone">
        <input
          value={plot.phone ?? ''}
          onChange={(e) => set('phone', e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Notes">
        <textarea
          value={plot.notes ?? ''}
          onChange={(e) => set('notes', e.target.value)}
          rows={4}
          className={inputCls}
        />
      </Field>

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
