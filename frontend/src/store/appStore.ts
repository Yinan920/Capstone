import { create } from 'zustand';
import type { Tier } from '@/lib/types';

/**
 * Lightweight client state. `tier` drives the Free ⇄ Premium demo toggle that
 * gates the competitor board, alerts and reply studio. When the backend lands,
 * `tier` is hydrated from the authenticated user instead of a local toggle.
 */
interface AppState {
  tier: Tier;
  datasetId: string;
  setTier: (tier: Tier) => void;
  toggleTier: () => void;
  setDatasetId: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  tier: 'premium',
  datasetId: 'ds_amazon',
  setTier: (tier) => set({ tier }),
  toggleTier: () => set((s) => ({ tier: s.tier === 'premium' ? 'free' : 'premium' })),
  setDatasetId: (datasetId) => set({ datasetId }),
}));
