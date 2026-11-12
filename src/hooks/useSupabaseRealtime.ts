import { useEffect, useRef } from 'react';
import { subscribeToOutletChanges } from '../utils/storage';

/**
 * Langgan perubahan Supabase (harga, poster, tetapan) untuk satu outlet.
 *
 * Mesej realtime hanya dijadikan ISYARAT. Pemanggil (`App`) mesti fetch
 * semula data daripada jadual — payload tidak dipercayai dan tidak pernah
 * ditulis terus ke mana-mana cache peranti.
 */
export function useSupabaseRealtime(
  outletName: string | null,
  onRemoteChange: () => void
): void {
  const callbackRef = useRef(onRemoteChange);

  useEffect(() => {
    callbackRef.current = onRemoteChange;
  }, [onRemoteChange]);

  useEffect(() => {
    if (!outletName) return;
    const unsubscribe = subscribeToOutletChanges(outletName, () => {
      callbackRef.current();
    });
    return unsubscribe;
  }, [outletName]);
}
