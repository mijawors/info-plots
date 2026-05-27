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
const TILE_SIZE = 512;
const BUFFER = 128; // extra px on each side → server renders (512+256)×(512+256)

function GugikWMS() {
  const map = useMap();
  useEffect(() => {
    const GugikLayer = (L.TileLayer.WMS as unknown as { extend: (opts: object) => new (...a: unknown[]) => L.TileLayer.WMS }).extend({
      getTileUrl(coords: L.Coords) {
        const expanded = TILE_SIZE + 2 * BUFFER;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const self = this as any;
        const nwPoint = coords.scaleBy(L.point(TILE_SIZE, TILE_SIZE));
        const sePoint = nwPoint.add(L.point(TILE_SIZE, TILE_SIZE));
        const crs = map.options.crs ?? L.CRS.EPSG3857;
        const zoom = self._getZoomForUrl();
        const nw = crs.pointToLatLng(L.point(nwPoint.x, nwPoint.y), zoom);
        const se = crs.pointToLatLng(L.point(sePoint.x, sePoint.y), zoom);
        const swProj = crs.project(L.latLng(se.lat, nw.lng));
        const neProj = crs.project(L.latLng(nw.lat, se.lng));
        const bx = (neProj.x - swProj.x) * (BUFFER / TILE_SIZE);
        const by = (neProj.y - swProj.y) * (BUFFER / TILE_SIZE);
        const params = new URLSearchParams({
          SERVICE: 'WMS', VERSION: '1.1.1', REQUEST: 'GetMap',
          LAYERS: 'dzialki,numery_dzialek',
          FORMAT: 'image/png', TRANSPARENT: 'true',
          SRS: 'EPSG:3857',
          BBOX: `${swProj.x - bx},${swProj.y - by},${neProj.x + bx},${neProj.y + by}`,
          WIDTH: String(expanded), HEIGHT: String(expanded),
        });
        return `${GUGIK_WMS}?${params.toString()}`;
      },
      createTile(coords: L.Coords, done: L.DoneCallback) {
        const expanded = TILE_SIZE + 2 * BUFFER;
        const div = L.DomUtil.create('div') as HTMLDivElement;
        div.style.cssText = `width:${TILE_SIZE}px;height:${TILE_SIZE}px;overflow:hidden;`;
        const img = document.createElement('img');
        img.style.cssText = `display:block;width:${expanded}px;height:${expanded}px;margin:-${BUFFER}px 0 0 -${BUFFER}px;`;
        img.crossOrigin = '';
        img.addEventListener('load', () => done(undefined, div));
        img.addEventListener('error', () => done(new Error('tile load failed'), div));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        img.src = (this as any).getTileUrl(coords);
        div.appendChild(img);
        return div;
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layer = new (GugikLayer as any)(GUGIK_WMS, {
      tileSize: TILE_SIZE,
      opacity: 0.7,
      keepBuffer: 3,
    });
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map]);
  return null;
}

function ClickHandler() {
  const addPlot = useStore((s) => s.addPlot);
  const updatePlot = useStore((s) => s.updatePlot);

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      const id = addPlot(lat, lng, { title: 'Loading parcel…' });
      try {
        const parcel = await fetchParcelAt(lat, lng);
        if (parcel) {
          updatePlot(id, {
            polygon: parcel.polygon,
            parcelId: parcel.parcelId,
            address: parcel.address,
            title: parcel.address || 'New plot',
          });
        } else {
          updatePlot(id, { title: 'New plot' });
        }
      } catch {
        updatePlot(id, { title: 'New plot' });
      }
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
