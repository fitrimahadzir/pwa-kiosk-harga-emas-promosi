import { useEffect, useRef } from 'react';
import { subscribeToOutletPrices } from '../utils/storage';

/**
 * Langgan perubahan harga Supabase untuk satu outlet.
 *
 * Mesej realtime hanya dijadikan ISYARAT. Pemanggil (`App`) mesti fetch
 * semula harga daripada jadual — payload tidak dipercayai dan tidak pernah
 * ditulis terus ke localStorage.
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
    const unsubscribe = subscribeToOutletPrices(outletName, () => {
      callbackRef.current();
    });
    return unsubscribe;
  }, [outletName]);
}
