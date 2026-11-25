import type { ImageMetadata } from 'astro';

/**
 * Every photo in src/assets/photos, keyed by its path relative to src/assets
 * (the same path editors write in the content files).
 */
const photos = import.meta.glob<{ default: ImageMetadata }>('/src/assets/photos/**/*.{jpg,jpeg,png,webp}', {
  eager: true,
});

/** Resolves "photos/burundi/graduation-2026.jpg" to an optimizable image, or fails the build. */
export function photo(path: string): ImageMetadata {
  const found = photos[`/src/assets/${path}`];
  if (!found) {
    throw new Error(
      `Photo not found: "${path}". Check the spelling, and that the file is in src/assets/${path}.`,
    );
  }
  return found.default;
}
