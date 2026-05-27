import { STATUS_COLORS, STATUS_LABELS } from '@/lib/status';
import type { PlotStatus } from '@/lib/types';

export default function StatusBadge({ status }: { status: PlotStatus }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: STATUS_COLORS[status] }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
