'use client';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon,
  Popup,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { useMemo, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/status';
import { fetchParcelAt } from '@/lib/uldk';
import type { Plot } from '@/lib/types';

// --- Wrocław viewport lock --------------------------------------------------
const WROCLAW_CENTER: L.LatLngTuple = [51.1079, 17.0385];
const WROCLAW_BOUNDS: L.LatLngBoundsLiteral = [
  [50.83, 16.55],
  [51.39, 17.55],
];
const INITIAL_ZOOM = 12;
const MIN_ZOOM = 10;
const MAX_ZOOM = 19;

const GUGIK_WMS =
  'https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow';

// --- Default marker icon fix (Leaflet + bundlers) ---------------------------
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const coloredIcon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

// --- Buffered WMS layer to prevent label/line clipping at tile boundaries ---
// We request (TILE_SIZE + 2*BUFFER)² images with an expanded BBOX, then CSS-crop
// back to TILE_SIZE so labels near edges have room to render fully on the server.
const TILE_SIZE = 512;
const BUFFER = 256; // 50 % extra on each side → server renders 1024×1024

function GugikWMS() {
  const map = useMap();
  useEffect(() => {
    const crs = map.options.crs ?? L.CRS.EPSG3857;
    const expanded = TILE_SIZE + 2 * BUFFER;

    const GugikLayer = (L.TileLayer.WMS as unknown as {
      extend: (opts: object) => new (...a: unknown[]) => L.TileLayer.WMS;
    }).extend({
      getTileUrl(coords: L.Coords) {
        // Use map.unproject (same path Leaflet's own WMS uses internally).
        const tileSize = L.point(TILE_SIZE, TILE_SIZE);
        const nwPx = coords.scaleBy(tileSize);
        const sePx = nwPx.add(tileSize);
        const nw = map.unproject(nwPx, coords.z);
        const se = map.unproject(sePx, coords.z);
        // Project to EPSG:3857 metres, then find the four BBOX edges.
        const nwM = crs.project(nw);
        const seM = crs.project(se);
        const west  = Math.min(nwM.x, seM.x);
        const east  = Math.max(nwM.x, seM.x);
        const south = Math.min(nwM.y, seM.y);
        const north = Math.max(nwM.y, seM.y);
        const bx = (east  - west)  * (BUFFER / TILE_SIZE);
        const by = (north - south) * (BUFFER / TILE_SIZE);
        const params = new URLSearchParams({
          SERVICE: 'WMS', VERSION: '1.1.1', REQUEST: 'GetMap',
          LAYERS: 'dzialki,numery_dzialek',
          FORMAT: 'image/png', TRANSPARENT: 'true',
          SRS: 'EPSG:3857',
          BBOX: `${west - bx},${south - by},${east + bx},${north + by}`,
          WIDTH: String(expanded), HEIGHT: String(expanded),
        });
        return `${GUGIK_WMS}?${params.toString()}`;
      },
      createTile(coords: L.Coords, done: L.DoneCallback) {
        const div = L.DomUtil.create('div') as HTMLDivElement;
        div.style.cssText = `width:${TILE_SIZE}px;height:${TILE_SIZE}px;overflow:hidden;`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const url = (this as any).getTileUrl(coords) as string;
        const MAX_ATTEMPTS = 3;
        let attempt = 0;
        const tryLoad = () => {
          attempt++;
          const img = document.createElement('img');
          img.style.cssText = `display:block;width:${expanded}px;height:${expanded}px;margin:-${BUFFER}px 0 0 -${BUFFER}px;`;
          img.addEventListener('load', () => {
            div.replaceChildren(img);
            done(undefined, div);
          });
          img.addEventListener('error', () => {
            if (attempt < MAX_ATTEMPTS) {
              setTimeout(tryLoad, 300 * attempt);
            } else {
              done(new Error('tile load failed'), div);
            }
          });
          // Cache-bust on retry so the browser actually re-requests instead of replaying the cached failure.
          img.src = attempt === 1 ? url : `${url}&_r=${attempt}`;
        };
        tryLoad();
        return div;
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layer = new (GugikLayer as any)(GUGIK_WMS, {
      tileSize: TILE_SIZE,
      opacity: 0.7,
      keepBuffer: 3,
      maxZoom: MAX_ZOOM,
    });
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map]);
  return null;
}

function ClickHandler() {
  const addPlot = useStore((s) => s.addPlot);

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      try {
        const parcel = await fetchParcelAt(lat, lng);
        if (parcel) {
          addPlot(lat, lng, {
            polygon: parcel.polygon,
            parcelId: parcel.parcelId,
            address: parcel.address,
            title: parcel.address || 'New plot',
          });
          return;
        }
      } catch {
        // fall through to marker fallback
      }
      addPlot(lat, lng, { title: 'New plot' });
    },
  });
  return null;
}

export default function LeafletMap() {
  const plots = useStore((s) => s.plots);
  const select = useStore((s) => s.select);
  const list = useMemo<Plot[]>(() => Object.values(plots), [plots]);

  return (
    <MapContainer
      center={WROCLAW_CENTER}
      zoom={INITIAL_ZOOM}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      maxBounds={WROCLAW_BOUNDS}
      maxBoundsViscosity={1.0}
      className="h-full w-full"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={MAX_ZOOM}
      />
      <GugikWMS />
      <ClickHandler />
      {list.map((p) => {
        const color = STATUS_COLORS[p.status];
        if (p.polygon && p.polygon.length >= 3) {
          return (
            <Polygon
              key={p.id}
              positions={p.polygon}
              pathOptions={{
                color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.4,
              }}
              bubblingMouseEvents={false}
              eventHandlers={{ click: () => select(p.id) }}
            >
              <Popup>
                <strong>{p.title}</strong>
                <br />
                {STATUS_LABELS[p.status]}
                {p.parcelId && (
                  <>
                    <br />
                    <span className="text-xs">{p.parcelId}</span>
                  </>
                )}
              </Popup>
            </Polygon>
          );
        }
        return (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={coloredIcon(color)}
            eventHandlers={{ click: () => select(p.id) }}
          >
            <Popup>
              <strong>{p.title}</strong>
              <br />
              {STATUS_LABELS[p.status]}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
