'use client';
import { createClient } from './client';
import type { Plot, PlotStatus } from '../types';

interface PlotRow {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  polygon: [number, number][] | null;
  parcel_id: string | null;
  address: string | null;
  status: PlotStatus;
  title: string;
  price_zl: number | null;
  availability: string | null;
  phone: string | null;
  contact_name: string | null;
  notes: string | null;
  listing_url: string | null;
  tags: string[];
  visited_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToPlot(r: PlotRow): Plot {
  return {
    id: r.id,
    lat: r.lat,
    lng: r.lng,
    polygon: r.polygon ?? undefined,
    parcelId: r.parcel_id ?? undefined,
    address: r.address ?? undefined,
    status: r.status,
    title: r.title,
    priceZl: r.price_zl ?? undefined,
    availability: r.availability ?? undefined,
    phone: r.phone ?? undefined,
    contactName: r.contact_name ?? undefined,
    notes: r.notes ?? undefined,
    listingUrl: r.listing_url ?? undefined,
    tags: r.tags ?? [],
    visitedAt: r.visited_at ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
  };
}

function plotToRow(p: Plot, userId: string): Omit<PlotRow, 'created_at' | 'updated_at'> {
  return {
    id: p.id,
    user_id: userId,
    lat: p.lat,
    lng: p.lng,
    polygon: p.polygon ?? null,
    parcel_id: p.parcelId ?? null,
    address: p.address ?? null,
    status: p.status,
    title: p.title,
    price_zl: p.priceZl ?? null,
    availability: p.availability ?? null,
    phone: p.phone ?? null,
    contact_name: p.contactName ?? null,
    notes: p.notes ?? null,
    listing_url: p.listingUrl ?? null,
    tags: p.tags ?? [],
    visited_at: p.visitedAt ?? null,
  };
}

export async function fetchPlots(): Promise<Plot[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('plots')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as PlotRow[]).map(rowToPlot);
}

export async function upsertPlot(plot: Plot): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('not signed in');
  const row = plotToRow(plot, user.id);
  const { error } = await supabase.from('plots').upsert(row);
  if (error) throw error;
}

export async function deletePlot(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('plots').delete().eq('id', id);
  if (error) throw error;
}
