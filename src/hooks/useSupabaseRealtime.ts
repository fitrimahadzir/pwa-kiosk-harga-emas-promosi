import { useEffect, useRef } from 'react';
import {
  GoldPriceItem,
  GoldPurity,
  PromoItem,
} from '../types/gold';
import {
  savePrices,
  savePromos,
  subscribeToSupabasePrices,
  type RealtimePriceListener,
} from '../utils/storage';

export function useSupabaseRealtime(
  prices: Record<GoldPurity, GoldPriceItem>
): void {
  const savedCallbackRef = useRef<RealtimePriceListener | null>(null);

  useEffect(() => {
    const listener = subscribeToSupabasePrices(
      (prices: Record<GoldPurity, GoldPriceItem>, outletName: string) => {
        // Save into the outlet the broadcast was for (not just the active one),
        // without re-broadcasting so updates do not ping-pong between kiosks.
        savePrices(prices, outletName, { broadcast: false });
      }
    );

    if (listener) {
      savedCallbackRef.current = listener;
    }

    return () => {
      savedCallbackRef.current?.unsubscribe();
      savedCallbackRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
