/**
 * Client-side logo image processor for Cricket & Kabaddi teams.
 * Resizes uploaded images (up to 8 MB) onto an offscreen canvas (max 240x240)
 * while preserving PNG/WebP transparency so logos stay sharp on 1080p OBS/vMix
 * overlays and compact (~15-40 KB) for instant Firebase Firestore sync.
 */
export async function processLogoImageFile(
  file: File,
  maxSize = 240
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (PNG, JPG, WebP, or SVG).');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Image is too large. Please select an image under 8 MB.');
  }

  // Keep small SVG logos crisp as vector data URLs
  if (file.type === 'image/svg+xml' && file.size <= 120_000) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Could not read logo file.'));
        }
      };
      reader.onerror = () => reject(new Error('Could not read logo file.'));
      reader.readAsDataURL(file);
    });
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not load image. Try PNG or JPG.'));
      el.src = objectUrl;
    });

    const naturalW = img.naturalWidth || img.width || maxSize;
    const naturalH = img.naturalHeight || img.height || maxSize;
    const scale = Math.min(1, maxSize / Math.max(naturalW, naturalH));
    const targetW = Math.max(1, Math.round(naturalW * scale));
    const targetH = Math.max(1, Math.round(naturalH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas is not available in this browser.');
    }

    ctx.clearRect(0, 0, targetW, targetH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // Prefer WebP (preserves transparency with tiny file size), fallback to PNG
    let dataUrl = canvas.toDataURL('image/webp', 0.88);
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/png');
    }

    // If still unexpectedly large (> 220 KB), re-encode at lower quality
    if (dataUrl.length > 220_000) {
      const smaller = canvas.toDataURL('image/webp', 0.72);
      if (smaller.startsWith('data:image/webp') && smaller.length < dataUrl.length) {
        dataUrl = smaller;
      }
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
