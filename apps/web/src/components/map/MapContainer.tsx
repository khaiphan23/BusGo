'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { MapboxOptions } from 'mapbox-gl';
import { initializeMapbox, TokenValidationResult } from '@/lib/mapbox';
import { MapboxTokenError } from '@/app/map/_components/MapboxTokenError';

interface MapContainerProps {
  children: (map: mapboxgl.Map | null, tokenValidation: TokenValidationResult) => React.ReactNode;
  options?: Partial<MapboxOptions>;
  onMapLoad?: (map: mapboxgl.Map) => void;
  onMapError?: (error: Error) => void;
}

export function MapContainer({
  children,
  options = {},
  onMapLoad,
  onMapError,
}: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [tokenValidation] = useState<TokenValidationResult>(() => initializeMapbox());

  // Latest-props refs: the map instance is created once on mount, so callbacks and
  // options must be read through refs instead of living in the effect dependencies
  // (an unstable `options` object identity re-runs the effect and recreates the map
  // on every render, which previously caused an infinite render loop).
  const optionsRef = useRef(options);
  const onMapLoadRef = useRef(onMapLoad);
  const onMapErrorRef = useRef(onMapError);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);
  useEffect(() => {
    onMapLoadRef.current = onMapLoad;
  }, [onMapLoad]);
  useEffect(() => {
    onMapErrorRef.current = onMapError;
  }, [onMapError]);

  useEffect(() => {
    if (!containerRef.current || !tokenValidation.valid) return;

    let mounted = true;

    const handleMapError = (err: Error) => {
      if (!mounted) return;
      setLoadError(err);
      onMapErrorRef.current?.(err);
    };

    const initializeMap = async () => {
      try {
        const mapboxgl = await import('mapbox-gl');

        if (!mounted || !containerRef.current) return;

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [105.8342, 21.0285],
          zoom: 12,
          minZoom: 8,
          maxZoom: 18,
          maxBounds: [102.14, 8.18, 109.46, 23.39],
          preserveDrawingBuffer: true,
          attributionControl: false,
          ...optionsRef.current,
        });

        mapRef.current = map;

        map.on('load', () => {
          if (mounted) {
            setMapLoaded(true);
            onMapLoadRef.current?.(map);
          }
        });

        map.on('error', (event) => {
          if (mounted && event.error) {
            handleMapError(
              event.error instanceof Error ? event.error : new Error(String(event.error))
            );
          }
        });
      } catch (error) {
        handleMapError(
          error instanceof Error ? error : new Error('Failed to initialize map')
        );
      }
    };

    initializeMap();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [tokenValidation.valid]);

  const getMap = useCallback(() => mapRef.current, []);

  if (!tokenValidation.valid) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
        }}
        role="application"
        aria-label="Interactive bus tracking map - configuration required"
      >
        <MapboxTokenError validation={tokenValidation} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
      }}
      role="application"
      aria-label="Interactive bus tracking map"
    >
      {loadError && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            right: '16px',
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            fontSize: '14px',
            zIndex: 1000,
          }}
        >
          Failed to load map: {loadError.message}
        </div>
      )}
      {!mapLoaded && !loadError && tokenValidation.valid && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9fafb',
            zIndex: 100,
          }}
          aria-live="polite"
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                border: '3px solid #e5e7eb',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                margin: '0 auto 12px',
                animation: 'spin 1s linear infinite',
              }}
            />
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading map...</p>
          </div>
        </div>
      )}
      {children(getMap(), tokenValidation)}
    </div>
  );
}

export function useMapContainer() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [map, setMap] = useState<mapboxgl.Map | null>(null);

  const registerMap = useCallback((m: mapboxgl.Map | null) => {
    mapRef.current = m;
    setMap(m);
  }, []);

  return { map, registerMap };
}