'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Plot } from './types';

type PlotInit = Partial<Omit<Plot, 'id' | 'createdAt' | 'lat' | 'lng'>>;

interface PlotState {
  plots: Record<string, Plot>;
  selectedId: string | null;
  addPlot: (lat: number, lng: number, init?: PlotInit) => string;
  updatePlot: (
    id: string,
    patch: Partial<Omit<Plot, 'id' | 'createdAt'>>,
  ) => void;
  removePlot: (id: string) => void;
  select: (id: string | null) => void;
}

export const useStore = create<PlotState>()(
  persist(
    (set) => ({
      plots: {},
      selectedId: null,
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
        return id;
      },
      updatePlot: (id, patch) =>
        set((s) =>
          s.plots[id]
            ? { plots: { ...s.plots, [id]: { ...s.plots[id], ...patch } } }
            : s,
        ),
      removePlot: (id) =>
        set((s) => {
          const { [id]: _removed, ...rest } = s.plots;
          return {
            plots: rest,
            selectedId: s.selectedId === id ? null : s.selectedId,
          };
        }),
      select: (id) => set({ selectedId: id }),
    }),
    { name: 'info-plots-store', version: 1 },
  ),
);
