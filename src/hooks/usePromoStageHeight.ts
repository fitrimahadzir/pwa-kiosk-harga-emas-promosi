import { useEffect, useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Pantau orientasi peranti. Digunakan untuk mengaktifkan susun atur
 * melintang (papan harga + poster bersebelahan) pada semua saiz skrin.
 */
export function useLandscapeOrientation(): boolean {
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(orientation: landscape)').matches;
  });

  useEffect(() => {
    const query = window.matchMedia('(orientation: landscape)');
    const update = () => setIsLandscape(query.matches);

    update();
    query.addEventListener('change', update);
    // Sesetengah pelayar mudah alih tidak memicu `change` dengan konsisten.
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      query.removeEventListener('change', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return isLandscape;
}

function clearStageStyles(el: HTMLDivElement | null): void {
  if (!el) return;
  el.style.removeProperty('width');
  el.style.removeProperty('height');
  el.style.removeProperty('min-width');
}

/**
 * Samakan tinggi lajur poster promosi dengan tinggi stack kiri
 * (papan harga + banner 3:1 + kalkulator) dalam paparan melintang.
 *
 * Tinggi stack kiri bergantung pada lebar lajur kiri, dan lebar lajur kiri
 * pula bergantung pada lebar poster (nisbah 3:4). Hubungan ini diselesaikan
 * secara lelaran: setiap pusingan mengemas kini lebar poster sehingga tinggi
 * kedua-dua lajur bertemu pada nilai yang sama.
 *
 * Nota penting: nod DOM disimpan pada masa effect dijalankan (bukan masa
 * cleanup). Bila halaman bertukar, ref boleh sudah menjadi null — jika kita
 * bergantung pada `rightRef.current` masa cleanup, saiz lama tertinggal dan
 * susun atur jadi tidak kemas selepas balik dari halaman lain.
 */
export function usePromoStageHeight(
  leftRef: RefObject<HTMLDivElement | null>,
  rightRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
): void {
  useLayoutEffect(() => {
    const rightEl = rightRef.current;

    if (!enabled) {
      clearStageStyles(rightEl);
      return;
    }
    if (!rightEl) return;

    let frame = 0;
    let disposed = false;
    const timers: number[] = [];

    const isLandscape = () => window.matchMedia('(orientation: landscape)').matches;

    // Bersihkan nilai lama SEBELUM sebarang ukuran dibuat. Tanpa ini, lebar/
    // tinggi dari lawatan sebelumnya mempengaruhi pengiraan susun atur baru.
    clearStageStyles(rightEl);

    const fit = () => {
      if (disposed) return;

      const leftEl = leftRef.current;
      if (!leftEl || !rightEl) return;
      if (!isLandscape()) return;

      const leftRect = leftEl.getBoundingClientRect();
      // Lajur kiri belum bersaiz (cth. semasa tukar halaman) — cuba lagi nanti.
      if (leftRect.width < 160) return;

      let stage = leftRect.height;
      if (!Number.isFinite(stage) || stage < 80) stage = 480;

      // Lelaran: lebar poster 0.75 × tinggi poster; setiap perubahan lebar
      // poster mengubah lebar (dan seterusnya tinggi) stack kiri.
      for (let pass = 0; pass < 6; pass += 1) {
        const posterWidth = Math.max(120, Math.round(stage * 0.75));
        rightEl.style.width = `${posterWidth}px`;

        // Baca semula memaksa susun atur dikira dengan lebar baharu.
        const nextStage = leftEl.getBoundingClientRect().height;
        const converged = Math.abs(nextStage - stage) < 1;
        stage = nextStage;
        if (converged) break;
      }

      const posterWidth = Math.max(120, Math.round(stage * 0.75));
      rightEl.style.width = `${posterWidth}px`;
      rightEl.style.height = `${Math.round(stage)}px`;
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };

    const observer = new ResizeObserver(schedule);
    if (leftRef.current) observer.observe(leftRef.current);
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);

    // Laksana serta-merta (useLayoutEffect) supaya tiada satu pun frame
    // dipaparkan dengan saiz lama, kemudian semak semula selepas susun atur
    // stabil — termasuk bila balik dari halaman detail promosi.
    fit();
    schedule();
    timers.push(window.setTimeout(schedule, 60));
    timers.push(window.setTimeout(schedule, 180));
    timers.push(window.setTimeout(schedule, 400));

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      clearStageStyles(rightEl);
    };
  }, [enabled, leftRef, rightRef]);
}
