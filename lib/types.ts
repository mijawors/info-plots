export type PlotStatus =
  | 'for_sale'
  | 'interested'
  | 'viewed'
  | 'rejected'
  | 'bought';

export type LatLng = [number, number]; // [lat, lng]

export interface Plot {
  id: string;
  lat: number;
  lng: number;
  /** Outer ring of the cadastral parcel, [lat, lng] pairs. Absent if ULDK lookup failed. */
  polygon?: LatLng[];
  /** GUGiK parcel identifier (TERYT), e.g. "026401_1.0001.AR_27.47/5". */
  parcelId?: string;
  /** Human-readable address: "voivodeship / county / commune / region / parcel". */
  address?: string;
  status: PlotStatus;
  title: string;
  priceZl?: number;
  availability?: string;
  phone?: string;
  contactName?: string;
  notes?: string;
  listingUrl?: string;
  tags?: string[];
  /** ISO date, e.g. "2026-05-12". */
  visitedAt?: string;
  createdAt: number;
}
