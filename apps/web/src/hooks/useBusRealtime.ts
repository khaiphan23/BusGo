import { useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { BusPosition } from '@/types/bus';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseBusRealtimeOptions {
  onInsert?: (bus: BusPosition) => void;
  onUpdate?: (bus: BusPosition) => void;
  onDelete?: (busId: string) => void;
  enabled?: boolean;
  filter?: string;
}

interface BusRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: BusPosition;
  old: BusPosition | null;
}

/**
 * Subscribes to postgres_changes for the `buses` table.
 *
 * IMPORTANT: mount this hook in exactly ONE component per topic. Supabase's
 * `client.channel(name)` returns the existing channel instance when the topic
 * already exists, and `.on('postgres_changes', ...)` throws once that channel
 * is joined/joining — a second concurrent mount crashes the page. Multiple
 * consumers should read the shared Zustand store (`useBusPositionsStore`)
 * instead of subscribing again.
 */
export function useBusRealtime({
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
  filter = "status=eq.ACTIVE",
}: UseBusRealtimeOptions = {}) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());
  const handlersRef = useRef({ onInsert, onUpdate, onDelete });

  useEffect(() => {
    handlersRef.current = { onInsert, onUpdate, onDelete };
  }, [onInsert, onUpdate, onDelete]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel('public:buses')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buses',
          filter,
        },
        (payload: RealtimePostgresChangesPayload<BusPosition>) => {
          const { eventType, new: newRecord, old: oldRecord } = payload as BusRealtimePayload;

          switch (eventType) {
            case 'INSERT':
              handlersRef.current.onInsert?.(newRecord);
              break;
            case 'UPDATE':
              handlersRef.current.onUpdate?.(newRecord);
              break;
            case 'DELETE':
              handlersRef.current.onDelete?.(oldRecord!.id);
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useBusRealtime] Subscribed to buses channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useBusRealtime] Channel error');
        } else if (status === 'TIMED_OUT') {
          console.warn('[useBusRealtime] Subscription timed out');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, filter]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  return { unsubscribe };
}