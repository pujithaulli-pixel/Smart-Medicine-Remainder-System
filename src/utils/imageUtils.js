// Utility for image compression, validation, and file handling

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const VALID_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const VALID_PRESCRIPTION_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

/**
 * Validates an uploaded medicine image file.
 * Returns { valid: boolean, error?: string }
 */
export const validateImageFile = (file, translations) => {
  if (!file) return { valid: false, error: 'No file selected' };

  if (!VALID_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: translations?.addMedicine?.validation?.imageInvalidType || 'Only JPG, PNG, and WebP images are allowed.'
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: translations?.addMedicine?.validation?.imageTooLarge || 'Image size exceeds the 5 MB limit. Please choose a smaller photo.'
    };
  }

  return { valid: true };
};

/**
 * Validates an uploaded prescription file (Image or PDF).
 */
export const validatePrescriptionFile = (file, translations) => {
  if (!file) return { valid: false, error: 'No file selected' };

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = VALID_IMAGE_TYPES.includes(file.type.toLowerCase());

  if (!isPdf && !isImage) {
    return {
      valid: false,
      error: translations?.addMedicine?.validation?.prescriptionInvalidType || 'Prescription must be a PDF document or an image (JPG, PNG, WebP).'
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: translations?.addMedicine?.validation?.prescriptionTooLarge || 'Prescription file exceeds the 5 MB limit.'
    };
  }

  return { valid: true, isPdf };
};

/**
 * Compresses an image file client-side using HTML5 Canvas.
 * Produces a lightweight, resized base64 data URL (typically ~20-40 KB)
 * so it safely fits in localStorage without hitting quota limits.
 */
export const compressImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image data.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional scale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target.result); // Fallback to raw data url if canvas unavailable
          return;
        }

        // Draw and compress to JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Reads a prescription document (PDF or image).
 * For PDF, stores metadata plus data URL if small.
 */
export const readPrescriptionFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.onload = (e) => {
      resolve({
        name: file.name,
        type: file.type || 'application/pdf',
        size: file.size,
        dataUrl: e.target.result
      });
    };
    reader.readAsDataURL(file);
  });
};
