export const MAX_SIDE = 1600;

/** Width and height scaled down to fit `max` on the longest side (never up). */
export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Photos from a phone are big: above 1600 px they are re-encoded as JPEG before uploading (E04 R1). */
export async function resizeImage(file: Blob, max = MAX_SIDE): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const size = fitWithin(bitmap.width, bitmap.height, max);
  if (size.width === bitmap.width && size.height === bitmap.height) {
    bitmap.close();
    return file;
  }
  const canvas = new OffscreenCanvas(size.width, size.height);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
}
