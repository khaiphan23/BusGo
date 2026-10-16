'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function LiveIndicator() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('public:buses-status');

    channel
      .on(
        'system',
        { event: 'phx_join' },
        () => {
          setStatus('connected');
        }
      )
      .on(
        'system',
        { event: 'phx_leave' },
        () => {
          setStatus('disconnected');
        }
      )
      .on(
        'system',
        { event: 'phx_error' },
        () => {
          setStatus('error');
        }
      )
      .subscribe((status) => {
        switch (status) {
          case 'SUBSCRIBED':
            setStatus('connected');
            break;
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
            setStatus('error');
            break;
          case 'CLOSED':
            setStatus('disconnected');
            break;
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const statusConfig = {
    connecting: {
      label: 'Đang kết nối...',
      color: 'text-yellow-800',
      bg: 'bg-yellow-100',
      dot: 'bg-yellow-600',
      pulse: true,
    },
    connected: {
      label: 'Trực tuyến',
      color: 'text-green-800',
      bg: 'bg-green-100',
      dot: 'bg-green-600',
      pulse: true,
    },
    disconnected: {
      label: 'Mất kết nối',
      color: 'text-gray-700',
      bg: 'bg-gray-100',
      dot: 'bg-gray-500',
      pulse: false,
    },
    error: {
      label: 'Lỗi kết nối',
      color: 'text-red-800',
      bg: 'bg-red-100',
      dot: 'bg-red-600',
      pulse: false,
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`fixed top-4 left-4 z-20 ${config.bg} px-3 py-1.5 rounded-full text-xs font-medium ${config.color} flex items-center gap-1.5 shadow-sm`}
      role="status"
      aria-live="polite"
      aria-label={`Trạng thái kết nối: ${config.label}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.pulse ? 'animate-pulse' : ''} ${config.dot}`}
        aria-hidden="true"
      />
      {config.label}
    </div>
  );
}