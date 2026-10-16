'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type mapboxgl from 'mapbox-gl';
import { MapContainer, useMapContainer } from '@/components/map/MapContainer';
import { useBusPositions } from '@/hooks/useBusPositions';
import { useBusRealtime } from '@/hooks/useBusRealtime';
import { syncBusMarkers, clearBusMarkers } from '@/lib/markerSync';
import type { BusPosition } from '@/types/bus';
import { BusInfoPopup } from './BusInfoPopup';

const CLUSTER_SOURCE_ID = 'buses-cluster';
const CLUSTER_LAYER_ID = 'buses-cluster-layer';
const CLUSTER_COUNT_LAYER_ID = 'buses-cluster-count';
const UNCLUSTERED_LAYER_ID = 'buses-unclustered-layer';
const CLUSTER_MAX_ZOOM = 14;

interface BusMapProps {
  onBusClick?: (bus: BusPosition) => void;
  onBusClose?: () => void;
  selectedBusId?: string | null;
  onViewportChange?: (viewport: {
    center: [number, number];
    zoom: number;
    bounds: mapboxgl.LngLatBounds;
  }) => void;
  showClustering?: boolean;
}

export function BusMap({
  onBusClick,
  onBusClose,
  selectedBusId,
  onViewportChange,
  showClustering = true,
}: BusMapProps) {
  const {
    buses,
    isLoading,
    error,
    handleRealtimeInsert,
    handleRealtimeUpdate,
    handleRealtimeDelete,
  } = useBusPositions();

  const { map, registerMap } = useMapContainer();
  const mapLoadedRef = useRef(false);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [showMarkers, setShowMarkers] = useState(false);

  const busesRef = useRef<BusPosition[]>(buses);
  const onBusClickRef = useRef(onBusClick);
  const onBusCloseRef = useRef(onBusClose);

  useEffect(() => {
    busesRef.current = buses;
  }, [buses]);
  useEffect(() => {
    onBusClickRef.current = onBusClick;
  }, [onBusClick]);
  useEffect(() => {
    onBusCloseRef.current = onBusClose;
  }, [onBusClose]);

  const selectedId = selectedBusId !== undefined ? selectedBusId : internalSelectedId;
  const selectedBus = selectedId ? buses.find((b) => b.id === selectedId) : undefined;

  useBusRealtime({
    onInsert: handleRealtimeInsert,
    onUpdate: handleRealtimeUpdate,
    onDelete: handleRealtimeDelete,
    enabled: true,
  });

  const activateBus = useCallback((bus: BusPosition) => {
    setInternalSelectedId(bus.id);
    onBusClickRef.current?.(bus);
  }, []);

  const closePopup = useCallback(() => {
    setInternalSelectedId(null);
    onBusCloseRef.current?.();
  }, []);

  const initializeClusterLayers = useCallback(
    (mapInstance: mapboxgl.Map) => {
      if (mapInstance.getSource(CLUSTER_SOURCE_ID)) return;

      if (!showClustering) return;

      mapInstance.addSource(CLUSTER_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        clusterRadius: 50,
      });

      mapInstance.addLayer({
        id: CLUSTER_LAYER_ID,
        type: 'circle',
        source: CLUSTER_SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#3b82f6', 10, '#f59e0b', 50, '#ef4444'],
          'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 50, 40],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      mapInstance.addLayer({
        id: CLUSTER_COUNT_LAYER_ID,
        type: 'symbol',
        source: CLUSTER_SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#1f2937',
          'text-halo-width': 1,
        },
      });

      mapInstance.addLayer({
        id: UNCLUSTERED_LAYER_ID,
        type: 'circle',
        source: CLUSTER_SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#22c55e',
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    },
    [showClustering]
  );

  const updateClusterData = useCallback(
    (mapInstance: mapboxgl.Map, busList: BusPosition[]) => {
      if (!showClustering) return;

      const source = mapInstance.getSource(CLUSTER_SOURCE_ID) as
        | mapboxgl.GeoJSONSource
        | undefined;
      if (!source) return;

      const features = busList.map((bus) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [bus.lng, bus.lat],
        },
        properties: {
          id: bus.id,
        },
      }));

      source.setData({ type: 'FeatureCollection', features });
    },
    [showClustering]
  );

  const handleMapLoad = useCallback(
    (mapInstance: mapboxgl.Map) => {
      registerMap(mapInstance);
      mapLoadedRef.current = true;
      initializeClusterLayers(mapInstance);
      updateClusterData(mapInstance, busesRef.current);

      if (showClustering) {
        mapInstance.on('click', CLUSTER_LAYER_ID, (event) => {
          const feature = mapInstance
            .queryRenderedFeatures(event.point, { layers: [CLUSTER_LAYER_ID] })
            .find((f) => typeof f.properties?.cluster_id === 'number');
          if (!feature) return;

          const clusterId = feature.properties!.cluster_id as number;
          const geometry = feature.geometry;
          if (!geometry || geometry.type !== 'Point') return;
          const coordinates = geometry.coordinates as [number, number];
          const source = mapInstance.getSource(CLUSTER_SOURCE_ID) as
            | mapboxgl.GeoJSONSource
            | undefined;
          if (!source) return;

          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err || typeof zoom !== 'number') return;
            mapInstance.easeTo({ center: coordinates, zoom });
          });
        });

        mapInstance.on('click', UNCLUSTERED_LAYER_ID, (event) => {
          const feature = mapInstance
            .queryRenderedFeatures(event.point, { layers: [UNCLUSTERED_LAYER_ID] })
            .find((f) => typeof f.properties?.id === 'string');
          const busId = feature?.properties?.id as string | undefined;
          if (!busId) return;
          const bus = busesRef.current.find((b) => b.id === busId);
          if (bus) activateBus(bus);
        });
      }
    },
    [initializeClusterLayers, updateClusterData, registerMap, showClustering, activateBus]
  );

  const handleMapMove = useCallback(() => {
    if (!map || !mapLoadedRef.current) return;
    const center = map.getCenter();
    const zoom = map.getZoom();
    const bounds = map.getBounds();
    if (bounds) {
      onViewportChange?.({ center: [center.lng, center.lat], zoom, bounds });
    }

    setShowMarkers(zoom >= CLUSTER_MAX_ZOOM);
  }, [map, onViewportChange]);

  useEffect(() => {
    if (!map || !mapLoadedRef.current) return;
    updateClusterData(map, buses);
  }, [map, buses, updateClusterData]);

  useEffect(() => {
    if (!map || !mapLoadedRef.current) return;
    if (showMarkers) {
      syncBusMarkers(map, buses, markersRef.current, activateBus, (id) =>
        busesRef.current.find((b) => b.id === id)
      );
    } else {
      clearBusMarkers(markersRef.current);
    }
  }, [map, buses, showMarkers, activateBus]);

  useEffect(() => {
    if (!map || !mapLoadedRef.current) return;
    const handleMove = () => handleMapMove();
    map.on('moveend', handleMove);
    handleMove();
    return () => {
      map.off('moveend', handleMove);
    };
  }, [map, handleMapMove]);

  useEffect(() => {
    if (!map) return;

    const layers: Array<[string, boolean]> = [
      [CLUSTER_LAYER_ID, showMarkers],
      [CLUSTER_COUNT_LAYER_ID, showMarkers],
      [UNCLUSTERED_LAYER_ID, showMarkers],
    ];

    for (const [layerId, visible] of layers) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'none' : 'visible');
      }
    }
  }, [map, showMarkers]);

  if (isLoading) {
    return (
      <MapContainer onMapLoad={handleMapLoad}>
        {() => (
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
            aria-live="polite"
          >
            <p style={{ color: '#6b7280' }}>Loading bus positions...</p>
          </div>
        )}
      </MapContainer>
    );
  }

  if (error) {
    return (
      <MapContainer onMapLoad={handleMapLoad}>
        {() => (
          <div role="alert" style={{ padding: '16px', color: '#ef4444' }}>
            Failed to load bus data: {error.message}
          </div>
        )}
      </MapContainer>
    );
  }

  return (
    <MapContainer onMapLoad={handleMapLoad}>
      {(mapInstance) => (
        <>
          {selectedBus && mapInstance && (
            <BusInfoPopup bus={selectedBus} map={mapInstance} onClose={closePopup} />
          )}
        </>
      )}
    </MapContainer>
  );
}
