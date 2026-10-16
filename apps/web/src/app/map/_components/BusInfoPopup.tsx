'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { BusPosition } from '@/types/bus';
import { calculateOccupancyPercentage, getOccupancyColor, getOccupancyTextColor } from '@/lib/mapbox';

interface BusInfoPopupProps {
  bus: BusPosition;
  map: mapboxgl.Map | null;
  onClose: () => void;
}

export function BusInfoPopup({ bus, map, onClose }: BusInfoPopupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  const occupancyPercent = calculateOccupancyPercentage(bus.currentOccupancy, bus.capacity);
  const occupancyColor = getOccupancyColor(occupancyPercent);
  const occupancyTextColor = getOccupancyTextColor(occupancyPercent);

  useEffect(() => {
    if (!map || !containerRef.current) return;

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      anchor: 'bottom',
      offset: 25,
    })
      .setLngLat([bus.lng, bus.lat])
      .setDOMContent(containerRef.current)
      .addTo(map);

    popupRef.current = popup;

    return () => {
      popup.remove();
      popupRef.current = null;
    };
  }, [bus, map, onClose]);

  useEffect(() => {
    if (popupRef.current) {
      popupRef.current.setLngLat([bus.lng, bus.lat]);
    }
  }, [bus.lng, bus.lat]);

  // Non-modal dialog: Escape closes it and focus lands inside once it opens.
  useEffect(() => {
    containerRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const mutedLabel: React.CSSProperties = {
    fontSize: '11px',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label={`Thông tin xe buýt ${bus.licensePlate}`}
      tabIndex={-1}
      style={{
        minWidth: '240px',
        maxWidth: '280px',
        padding: '12px',
        background: '#ffffff',
        borderRadius: '10px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        outline: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
            {bus.licensePlate}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
            Route {bus.route.code} - {bus.route.name}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: '18px',
            lineHeight: 1,
          }}
          aria-label="Close popup"
        >
          ×
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '8px' }}>
        <div>
          <div style={mutedLabel}>Occupancy</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: occupancyTextColor }}>
            {occupancyPercent}%
          </div>
        </div>
        <div>
          <div style={mutedLabel}>Capacity</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
            {bus.currentOccupancy} / {bus.capacity}
          </div>
        </div>
        {bus.heading !== undefined && bus.heading !== null && (
          <div>
            <div style={mutedLabel}>Heading</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
              {Math.round(bus.heading)}°
            </div>
          </div>
        )}
        {bus.speed !== undefined && bus.speed !== null && (
          <div>
            <div style={mutedLabel}>Speed</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
              {bus.speed.toFixed(1)} km/h
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          width: '100%',
          height: '4px',
          background: '#e5e7eb',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${occupancyPercent}%`,
            height: '100%',
            background: occupancyColor,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280' }}>
        Last updated: {new Date(bus.updatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}