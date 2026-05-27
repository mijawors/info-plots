import type { PlotStatus } from './types';

export const STATUS_COLORS: Record<PlotStatus, string> = {
  for_sale: '#22c55e',
  interested: '#3b82f6',
  viewed: '#eab308',
  rejected: '#ef4444',
  bought: '#a855f7',
};

export const STATUS_LABELS: Record<PlotStatus, string> = {
  for_sale: 'For Sale',
  interested: 'Interested',
  viewed: 'Viewed',
  rejected: 'Rejected',
  bought: 'Bought',
};

export const STATUS_ORDER: PlotStatus[] = [
  'for_sale',
  'interested',
  'viewed',
  'rejected',
  'bought',
];
