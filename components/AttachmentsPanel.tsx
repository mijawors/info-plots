'use client';
import { useEffect, useRef, useState } from 'react';
import {
  listAttachments,
  uploadAttachment,
  deleteAttachment,
  type Attachment,
} from '@/lib/supabase/attachments';

export default function AttachmentsPanel({ plotId }: { plotId: string }) {
  const [items, setItems] = useState<Attachment[]>([]);
  // Mounted via `key={plot.id}` from the parent — so first render is always
  // the start of a fresh load; no need to setStatus('loading') in the effect.
  const [status, setStatus] = useState<'loading' | 'idle' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAttachments(plotId)
      .then((list) => {
        if (cancelled) return;
        setItems(list);
        setStatus('idle');
      })
      .catch((e) => {
        if (cancelled) return;
        setStatus('error');
        setError(e instanceof Error ? e.message : 'failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, [plotId]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setError(null);
    try {
      const att = await uploadAttachment(plotId, file);
      setItems((prev) => [...prev, att]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(att: Attachment) {
    if (!confirm('Delete this attachment?')) return;
    try {
      await deleteAttachment(att);
      setItems((prev) => prev.filter((a) => a.id !== att.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'delete failed');
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Photos &amp; files
        </span>
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input
          ref={fileInput}
          type="file"
          className="hidden"
          accept="image/*,application/pdf"
          onChange={onPick}
        />
      </div>

      {status === 'loading' && (
        <p className="text-xs text-zinc-500">Loading…</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {items.length > 0 && (
        <ul className="grid grid-cols-3 gap-1">
          {items.map((a) => (
            <li key={a.id} className="group relative">
              {a.mimeType?.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.signedUrl}
                  alt={a.caption ?? ''}
                  className="aspect-square w-full rounded object-cover"
                />
              ) : (
                <a
                  href={a.signedUrl}
                  target="_blank"
                  rel="noopener"
                  className="grid aspect-square w-full place-items-center rounded bg-zinc-100 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  {a.storagePath.split('/').pop()?.slice(0, 18) ?? 'file'}
                </a>
              )}
              <button
                onClick={() => onDelete(a)}
                aria-label="Delete attachment"
                className="absolute right-0.5 top-0.5 hidden rounded bg-black/60 px-1 text-xs text-white group-hover:block"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
