import { describe, it, expect } from 'vitest';
import {
  busStatusSchema,
  routeSchema,
  busPositionSchema,
  busRealtimePayloadSchema,
  busPositionInputSchema,
  nearbyBusesQuerySchema,
  viewportBoundsSchema,
  type BusStatus,
  type Route,
  type BusPosition,
  type BusRealtimePayload,
  type BusPositionInput,
  type NearbyBusesQuery,
  type ViewportBounds,
} from '../bus';

describe('Bus Validators', () => {
  describe('busStatusSchema', () => {
    it('accepts valid statuses', () => {
      expect(busStatusSchema.parse('ACTIVE')).toBe('ACTIVE');
      expect(busStatusSchema.parse('INACTIVE')).toBe('INACTIVE');
      expect(busStatusSchema.parse('MAINTENANCE')).toBe('MAINTENANCE');
      expect(busStatusSchema.parse('OFFLINE')).toBe('OFFLINE');
    });

    it('rejects invalid status', () => {
      expect(() => busStatusSchema.parse('UNKNOWN')).toThrow();
    });
  });

  describe('routeSchema', () => {
    const validRoute = {
      id: 'cm1abc123def456',
      name: 'Route 1',
      code: 'R1',
      color: '#3B82F6',
    };

    it('accepts valid route', () => {
      const result = routeSchema.parse(validRoute);
      expect(result).toEqual(validRoute);
    });

    it('rejects invalid color format', () => {
      expect(() => routeSchema.parse({ ...validRoute, color: 'blue' })).toThrow();
    });

    it('rejects missing fields', () => {
      expect(() => routeSchema.parse({ ...validRoute, name: '' })).toThrow();
    });
  });

  describe('busPositionSchema', () => {
    const validBusPosition = {
      id: 'cm1abc123def456',
      licensePlate: '51A-12345',
      lat: 21.0285,
      lng: 105.8342,
      heading: 90,
      speed: 30,
      status: 'ACTIVE' as BusStatus,
      route: {
        id: 'cm1abc123def456',
        name: 'Route 1',
        code: 'R1',
        color: '#3B82F6',
      },
      capacity: 40,
      currentOccupancy: 25,
      updatedAt: '2024-01-15T10:30:00.000Z',
    };

    it('accepts valid bus position', () => {
      const result = busPositionSchema.parse(validBusPosition);
      expect(result).toEqual(validBusPosition);
    });

    it('accepts optional heading and speed', () => {
      const { heading, speed, ...rest } = validBusPosition;
      const result = busPositionSchema.parse(rest);
      expect(result.heading).toBeUndefined();
      expect(result.speed).toBeUndefined();
    });

    it('rejects invalid license plate', () => {
      expect(() => busPositionSchema.parse({ ...validBusPosition, licensePlate: 'ABC-123' })).toThrow();
    });

    it('rejects invalid latitude', () => {
      expect(() => busPositionSchema.parse({ ...validBusPosition, lat: 100 })).toThrow();
    });

    it('rejects invalid longitude', () => {
      expect(() => busPositionSchema.parse({ ...validBusPosition, lng: 200 })).toThrow();
    });

    it('rejects invalid heading range', () => {
      expect(() => busPositionSchema.parse({ ...validBusPosition, heading: 400 })).toThrow();
    });

    it('rejects negative speed', () => {
      expect(() => busPositionSchema.parse({ ...validBusPosition, speed: -10 })).toThrow();
    });

    it('rejects negative capacity', () => {
      expect(() => busPositionSchema.parse({ ...validBusPosition, capacity: 0 })).toThrow();
    });

    it('rejects negative occupancy', () => {
      expect(() => busPositionSchema.parse({ ...validBusPosition, currentOccupancy: -1 })).toThrow();
    });

    it('rejects invalid datetime', () => {
      expect(() => busPositionSchema.parse({ ...validBusPosition, updatedAt: 'invalid' })).toThrow();
    });
  });

  describe('busRealtimePayloadSchema', () => {
    const validPayload = {
      eventType: 'INSERT' as const,
      new: {
        id: 'cm1abc123def456',
        licensePlate: '51A-12345',
        lat: 21.0285,
        lng: 105.8342,
        status: 'ACTIVE' as BusStatus,
        route: {
          id: 'cm1abc123def456',
          name: 'Route 1',
          code: 'R1',
          color: '#3B82F6',
        },
        capacity: 40,
        currentOccupancy: 25,
        updatedAt: '2024-01-15T10:30:00.000Z',
      },
      old: null,
    };

    it('accepts INSERT payload', () => {
      const result = busRealtimePayloadSchema.parse(validPayload);
      expect(result.eventType).toBe('INSERT');
      expect(result.old).toBeNull();
    });

    it('accepts UPDATE payload with old data', () => {
      const payload = {
        ...validPayload,
        eventType: 'UPDATE' as const,
        old: validPayload.new,
      };
      const result = busRealtimePayloadSchema.parse(payload);
      expect(result.eventType).toBe('UPDATE');
      expect(result.old).toEqual(validPayload.new);
    });

    it('accepts DELETE payload', () => {
      const payload = {
        ...validPayload,
        eventType: 'DELETE' as const,
      };
      const result = busRealtimePayloadSchema.parse(payload);
      expect(result.eventType).toBe('DELETE');
    });

    it('rejects invalid eventType', () => {
      expect(() => busRealtimePayloadSchema.parse({ ...validPayload, eventType: 'UPSERT' })).toThrow();
    });
  });

  describe('busPositionInputSchema', () => {
    const validInput = {
      licensePlate: '51A-12345',
      lat: 21.0285,
      lng: 105.8342,
      heading: 90,
      speed: 30,
      status: 'ACTIVE' as BusStatus,
      routeId: 'cm1abc123def456',
    };

    it('accepts valid input', () => {
      const result = busPositionInputSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('accepts optional fields', () => {
      const { heading, speed, status, ...rest } = validInput;
      const result = busPositionInputSchema.parse(rest);
      expect(result.heading).toBeUndefined();
      expect(result.speed).toBeUndefined();
      expect(result.status).toBeUndefined();
    });

    it('rejects invalid license plate', () => {
      expect(() => busPositionInputSchema.parse({ ...validInput, licensePlate: 'ABC-123' })).toThrow();
    });

    it('rejects invalid routeId', () => {
      expect(() => busPositionInputSchema.parse({ ...validInput, routeId: 'invalid' })).toThrow();
    });
  });

  describe('nearbyBusesQuerySchema', () => {
    const validQuery = {
      lat: 21.0285,
      lng: 105.8342,
      radiusMeters: 1000,
      limit: 50,
    };

    it('accepts valid query', () => {
      const result = nearbyBusesQuerySchema.parse(validQuery);
      expect(result).toEqual(validQuery);
    });

    it('accepts optional limit', () => {
      const { limit, ...rest } = validQuery;
      const result = nearbyBusesQuerySchema.parse(rest);
      expect(result.limit).toBeUndefined();
    });

    it('rejects radius too large', () => {
      expect(() => nearbyBusesQuerySchema.parse({ ...validQuery, radiusMeters: 60000 })).toThrow();
    });

    it('rejects limit too large', () => {
      expect(() => nearbyBusesQuerySchema.parse({ ...validQuery, limit: 150 })).toThrow();
    });
  });

  describe('viewportBoundsSchema', () => {
    const validBounds = {
      north: 21.1,
      south: 20.9,
      east: 105.9,
      west: 105.7,
    };

    it('accepts valid bounds', () => {
      const result = viewportBoundsSchema.parse(validBounds);
      expect(result).toEqual(validBounds);
    });

    it('rejects invalid latitude bounds', () => {
      expect(() => viewportBoundsSchema.parse({ ...validBounds, north: 100 })).toThrow();
    });

    it('rejects invalid longitude bounds', () => {
      expect(() => viewportBoundsSchema.parse({ ...validBounds, east: 200 })).toThrow();
    });
  });
});