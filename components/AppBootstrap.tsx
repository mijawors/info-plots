'use client';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';

// Loads plots from Supabase on first mount. Renders nothing.
export default function AppBootstrap() {
  const loadPlots = useStore((s) => s.loadPlots);
  const loadState = useStore((s) => s.loadState);

  useEffect(() => {
    if (loadState === 'idle') loadPlots();
  }, [loadPlots, loadState]);

  return null;
}
