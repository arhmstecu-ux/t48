import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type TableName = 'products' | 'purchases' | 'purchase_items' | 'replay_videos' | 'announcements' | 'reviews' | 'app_settings' | 'profiles' | 'chat_messages' | 'group_messages' | 'group_members' | 'vouchers' | 'voucher_usage' | 'spin_prizes' | 'spin_results' | 'user_spins' | 'replay_purchases' | 'coin_balances' | 'coin_topup_requests' | 'coin_transactions' | 'livestream_comments' | 'livestream_viewers' | 'livestream_blacklist' | 'livestream_moderators';

export function useRealtimeTable<T extends Record<string, any>>(
  table: TableName,
  query?: { column?: string; value?: string; order?: { column: string; ascending?: boolean } },
  enabled = true
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    let q = supabase.from(table as any).select('*') as any;
    if (query?.column && query?.value) {
      q = q.eq(query.column, query.value);
    }
    if (query?.order) {
      q = q.order(query.order.column, { ascending: query.order.ascending ?? true });
    }
    const { data: result, error } = await q;
    if (!error && result) {
      setData(result as unknown as T[]);
    }
    setLoading(false);
  }, [table, query?.column, query?.value, query?.order?.column, query?.order?.ascending, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`realtime-${table}-${query?.column || 'all'}-${query?.value || 'all'}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as T;
            if (query?.column && query?.value && (newRow as any)[query.column] !== query.value) return;
            setData(prev => [...prev, newRow]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as T;
            setData(prev => prev.map(item => (item as any).id === (updated as any).id ? updated : item));
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as any;
            setData(prev => prev.filter(item => (item as any).id !== old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table, query?.column, query?.value, enabled]);

  return { data, loading, refetch: fetchData };
}
