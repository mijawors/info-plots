'use client';
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center text-zinc-500">
      Loading map…
    </div>
  ),
});

export default function MapView() {
  return (
    <div className="h-full w-full">
      <LeafletMap />
    </div>
  );
}
