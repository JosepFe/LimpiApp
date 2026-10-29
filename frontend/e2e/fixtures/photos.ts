// Real 1×1 PNG files for the photo picker (createImageBitmap must be able to read them).
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

export const photos = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ name: `foto-${i + 1}.png`, mimeType: 'image/png', buffer: PNG_1X1 }));
