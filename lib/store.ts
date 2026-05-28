'use client';
import { create } from 'zustand';
import type { Plot } from './types';
import * as db from './supabase/plots';

type PlotInit = Partial<Omit<Plot, 'id' | 'createdAt' | 'lat' | 'lng'>>;

interface PlotState {
  plots: Record<string, Plot>;
  selectedId: string | null;
  /** 'idle' before first load, 'loading' during fetch, 'ready' once loaded. */
  loadState: 'idle' | 'loading' | 'ready' | 'error';
  loadError: string | null;
  loadPlots: () => Promise<void>;
  addPlot: (lat: number, lng: number, init?: PlotInit) => string;
  updatePlot: (
    id: string,
    patch: Partial<Omit<Plot, 'id' | 'createdAt'>>,
  ) => void;
  removePlot: (id: string) => void;
  select: (id: string | null) => void;
  reset: () => void;
}

// All mutations write through to Supabase optimistically: the local store is
// updated immediately, then a background `upsertPlot`/`deletePlot` runs. If
// the network call fails we log and keep the local state.
export const useStore = create<PlotState>()((set, get) => ({
  plots: {},
  selectedId: null,
  loadState: 'idle',
  loadError: null,

  loadPlots: async () => {
    set({ loadState: 'loading', loadError: null });
    try {
      const plots = await db.fetchPlots();
      const byId: Record<string, Plot> = {};
      for (const p of plots) byId[p.id] = p;
      set({ plots: byId, loadState: 'ready' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'failed to load plots';
      set({ loadState: 'error', loadError: msg });
    }
  },

  addPlot: (lat, lng, init) => {
    const id = crypto.randomUUID();
    const plot: Plot = {
      id,
      lat,
      lng,
      status: 'for_sale',
      title: 'New plot',
      createdAt: Date.now(),
      ...init,
    };
    set((s) => ({
      plots: { ...s.plots, [id]: plot },
      selectedId: id,
    }));
    db.upsertPlot(plot).catch((e) => console.error('upsertPlot failed', e));
    return id;
  },

  updatePlot: (id, patch) => {
    const current = get().plots[id];
    if (!current) return;
    const next = { ...current, ...patch };
    set((s) => ({ plots: { ...s.plots, [id]: next } }));
    db.upsertPlot(next).catch((e) => console.error('upsertPlot failed', e));
  },

  removePlot: (id) => {
    set((s) => {
      const rest = { ...s.plots };
      delete rest[id];
      return {
        plots: rest,
        selectedId: s.selectedId === id ? null : s.selectedId,
      };
    });
    db.deletePlot(id).catch((e) => console.error('deletePlot failed', e));
  },

  select: (id) => set({ selectedId: id }),
  reset: () =>
    set({ plots: {}, selectedId: null, loadState: 'idle', loadError: null }),
}));
