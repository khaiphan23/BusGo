import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { debounce } from 'lodash-es';
import type { BusPosition } from '@/types/bus';
import { busPositionSchema, type BusPosition as BusPositionValidated } from '@bus/validators';

interface BusPositionsState {
  buses: Map<string, BusPosition>;
  setBuses: (buses: BusPosition[]) => void;
  upsertBus: (bus: BusPosition) => void;
  removeBus: (busId: string) => void;
  clear: () => void;
}

const DEBOUNCE_MS = 500;

export const useBusPositionsStore = create<BusPositionsState>()(
  subscribeWithSelector((set) => ({
    buses: new Map(),

    setBuses: (buses) => {
      const map = new Map<string, BusPosition>();
      buses.forEach((bus) => map.set(bus.id, bus));
      set({ buses: map });
    },

    upsertBus: (bus) =>
      set((state) => {
        const newMap = new Map(state.buses);
        newMap.set(bus.id, bus);
        return { buses: newMap };
      }),

    removeBus: (busId) =>
      set((state) => {
        const newMap = new Map(state.buses);
        newMap.delete(busId);
        return { buses: newMap };
      }),

    clear: () => set({ buses: new Map() }),
  }))
);

export function useBusPositions() {
  const queryClient = useQueryClient();
  const { buses, upsertBus, removeBus, setBuses, clear } = useBusPositionsStore();

  const { data: initialBuses, isLoading, error, refetch } = useQuery({
    queryKey: ['busPositions'],
    queryFn: async (): Promise<BusPosition[]> => {
      const res = await fetch('/api/buses');
      if (!res.ok) throw new Error('Failed to fetch buses');
      const data = await res.json();
      return busPositionSchema.array().parse(data) as BusPosition[];
    },
    staleTime: 30_000,
    gcTime: 60_000,
  });

  const debouncedUpsert = useRef(
    debounce((bus: BusPosition) => {
      upsertBus(bus);
      queryClient.setQueryData<BusPosition[]>(['busPositions'], (old) => {
        if (!old) return [bus];
        const exists = old.find((b) => b.id === bus.id);
        if (exists) return old.map((b) => (b.id === bus.id ? bus : b));
        return [...old, bus];
      });
    }, DEBOUNCE_MS)
  ).current;

  const debouncedRemove = useRef(
    debounce((busId: string) => {
      removeBus(busId);
      queryClient.setQueryData<BusPosition[]>(['busPositions'], (old) =>
        old?.filter((b) => b.id !== busId) ?? []
      );
    }, DEBOUNCE_MS)
  ).current;

  useEffect(() => {
    if (initialBuses) {
      setBuses(initialBuses);
    }
  }, [initialBuses, setBuses]);

  const handleRealtimeInsert = useCallback(
    (bus: BusPosition) => {
      debouncedUpsert(bus);
    },
    [debouncedUpsert]
  );

  const handleRealtimeUpdate = useCallback(
    (bus: BusPosition) => {
      debouncedUpsert(bus);
    },
    [debouncedUpsert]
  );

  const handleRealtimeDelete = useCallback(
    (busId: string) => {
      debouncedRemove(busId);
    },
    [debouncedRemove]
  );

  const busesArray = Array.from(buses.values());

  return {
    buses: busesArray,
    isLoading,
    error,
    refetch,
    handleRealtimeInsert,
    handleRealtimeUpdate,
    handleRealtimeDelete,
  };
}