import type { LatLng } from './types';

export interface ParcelLookup {
  polygon: LatLng[];
  parcelId: string;
  address: string;
}

/**
 * Query GUGiK's ULDK service for the cadastral parcel at the given WGS84 point.
 * Returns null if no parcel is found (e.g. clicked on water / outside Poland).
 *
 * Endpoint: https://uldk.gugik.gov.pl/
 * Response format (newline-separated):
 *   line 0:  "0"  (success) or "-1" (no result)
 *   line 1+: pipe-separated fields in the order requested by `result`
 */
export async function fetchParcelAt(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<ParcelLookup | null> {
  const params = new URLSearchParams({
    request: 'GetParcelByXY',
    xy: `${lng},${lat},4326`,
    result: 'geom_wkt,id,voivodeship,county,commune,region,parcel',
    srid: '4326',
  });
  const url = `https://uldk.gugik.gov.pl/?${params.toString()}`;

  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const text = await res.text();

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2 || lines[0] !== '0') return null;

  const [wkt, id, voiv, county, commune, region, parcel] =
    lines[1].split('|');

  const polygon = parseWktPolygon(wkt);
  if (!polygon) return null;

  return {
    polygon,
    parcelId: id ?? '',
    address: [voiv, county, commune, region, parcel]
      .filter(Boolean)
      .join(' / '),
  };
}

/**
 * Minimal WKT POLYGON parser — extracts the outer ring as [lat, lng] pairs.
 * Input examples:
 *   "SRID=4326;POLYGON((lng lat,lng lat,...))"
 *   "POLYGON((lng lat,lng lat,...),(hole...))"
 * Holes are ignored (parcels rarely have them and we only need the boundary).
 */
function parseWktPolygon(wkt: string): LatLng[] | null {
  const match = wkt.match(/POLYGON\s*\(\s*\(([^)]*)\)/i);
  if (!match) return null;
  const ring = match[1]
    .split(',')
    .map((pair) => {
      const [x, y] = pair.trim().split(/\s+/).map(Number);
      // WKT order is "x y" = "lng lat"; Leaflet wants [lat, lng].
      return Number.isFinite(x) && Number.isFinite(y)
        ? ([y, x] as LatLng)
        : null;
    })
    .filter((p): p is LatLng => p !== null);
  return ring.length >= 3 ? ring : null;
}
