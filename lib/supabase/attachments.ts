'use client';
import { createClient } from './client';

export interface Attachment {
  id: string;
  plotId: string;
  storagePath: string;
  mimeType: string | null;
  caption: string | null;
  createdAt: number;
  /** Time-limited signed URL for displaying the file. */
  signedUrl: string;
}

const BUCKET = 'plot-photos';
const SIGNED_URL_TTL = 60 * 60; // 1 hour

interface AttachmentRow {
  id: string;
  plot_id: string;
  user_id: string;
  storage_path: string;
  mime_type: string | null;
  caption: string | null;
  created_at: string;
}

export async function listAttachments(plotId: string): Promise<Attachment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('plot_attachments')
    .select('*')
    .eq('plot_id', plotId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const rows = data as AttachmentRow[];
  if (rows.length === 0) return [];

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(
      rows.map((r) => r.storage_path),
      SIGNED_URL_TTL,
    );
  if (signError) throw signError;

  return rows.map((r, i) => ({
    id: r.id,
    plotId: r.plot_id,
    storagePath: r.storage_path,
    mimeType: r.mime_type,
    caption: r.caption,
    createdAt: new Date(r.created_at).getTime(),
    signedUrl: signed[i]?.signedUrl ?? '',
  }));
}

export async function uploadAttachment(
  plotId: string,
  file: File,
): Promise<Attachment> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');

  // Storage policies require the first path segment to be the user's id.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${user.id}/${plotId}/${crypto.randomUUID()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw upErr;

  const { data: row, error: insErr } = await supabase
    .from('plot_attachments')
    .insert({
      plot_id: plotId,
      user_id: user.id,
      storage_path: path,
      mime_type: file.type || null,
    })
    .select('*')
    .single();
  if (insErr) throw insErr;

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signErr) throw signErr;

  const r = row as AttachmentRow;
  return {
    id: r.id,
    plotId: r.plot_id,
    storagePath: r.storage_path,
    mimeType: r.mime_type,
    caption: r.caption,
    createdAt: new Date(r.created_at).getTime(),
    signedUrl: signed.signedUrl,
  };
}

export async function deleteAttachment(att: Attachment): Promise<void> {
  const supabase = createClient();
  // Remove the row first; if Storage deletion fails the file becomes orphaned
  // but the UI stays consistent.
  const { error: rowErr } = await supabase
    .from('plot_attachments')
    .delete()
    .eq('id', att.id);
  if (rowErr) throw rowErr;
  await supabase.storage.from(BUCKET).remove([att.storagePath]);
}
