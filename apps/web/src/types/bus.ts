export type BusStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'OFFLINE';

export interface Route {
  id: string;
  name: string;
  code: string;
  color: string;
}

export interface BusPosition {
  id: string;
  licensePlate: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  status: BusStatus;
  route: Route;
  capacity: number;
  currentOccupancy: number;
  updatedAt: string;
}

export interface BusRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: BusPosition;
  old: BusPosition | null;
}

export interface BusPositionInput {
  licensePlate: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  status?: BusStatus;
  routeId: string;
}

export interface NearbyBusesQuery {
  lat: number;
  lng: number;
  radiusMeters: number;
  limit?: number;
}

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}