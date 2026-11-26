/**
 * Kecilkan gambar sebelum dimuat naik ke Supabase Storage.
 * Imej kecil JPEG/WEBP dikekalkan seperti asal; sebaliknya dikod semula
 * ke JPEG dengan latar putih (PNG lutsinar tidak menjadi hitam).
 */
export interface ImageUploadOptions {
  maxWidth: number;
  maxHeight: number;
  /** Saiz asal (byte) masih diterima jika lebih kecil daripada ini. */
  maxPassthroughBytes: number;
  quality?: number;
}

export async function prepareImageForUpload(
  file: File,
  options: ImageUploadOptions,
): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Fail yang dipilih bukan gambar.');
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
      img.src = objectUrl;
    });

    const scale = Math.min(
      1,
      options.maxWidth / image.naturalWidth,
      options.maxHeight / image.naturalHeight,
    );

    if (
      scale === 1 &&
      file.size <= options.maxPassthroughBytes &&
      (file.type === 'image/jpeg' || file.type === 'image/webp')
    ) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Pelayar tidak menyokong pemprosesan gambar.');

    context.imageSmoothingQuality = 'high';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', options.quality ?? 0.82),
    );
    if (!blob) throw new Error('Gagal memproses gambar.');
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Poster promosi: sehingga 1080 × 1440 px. */
export function preparePromoImage(file: File): Promise<Blob> {
  return prepareImageForUpload(file, {
    maxWidth: 1080,
    maxHeight: 1440,
    maxPassthroughBytes: 450_000,
  });
}

/** Gambar produk katalog: sehingga 1200 × 1200 px (grid katalog adalah segi empat sama). */
export function prepareCatalogImage(file: File): Promise<Blob> {
  return prepareImageForUpload(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    maxPassthroughBytes: 500_000,
    quality: 0.82,
  });
}

/** Nama produk lalai bagi muat naik berkumpulan, terbit dari nama fail. */
export function productNameFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').trim();
  return (
    base
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '') || 'Produk Jewelry'
  );
}
