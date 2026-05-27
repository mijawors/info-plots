import MapView from '@/components/MapView';
import DetailsPane from '@/components/DetailsPane';

export default function Home() {
  return (
    <div className="flex flex-1 flex-col sm:flex-row">
      <div className="relative flex-1 min-h-[60vh] sm:min-h-0">
        <MapView />
      </div>
      <DetailsPane />
    </div>
  );
}
