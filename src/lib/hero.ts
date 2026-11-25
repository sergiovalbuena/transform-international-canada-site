import { getImage } from 'astro:assets';
import { photo } from './images';

/** Widths generated for full-bleed hero photos. Shared with the preload below so the URLs match. */
export const HERO_WIDTHS = [640, 960, 1280, 1600, 2000];

/**
 * A `<link rel="preload">` description for a hero photo, so the browser starts
 * downloading the largest image on the page (the LCP element) immediately.
 */
export async function heroPreload(path: string) {
  const img = await getImage({ src: photo(path), widths: HERO_WIDTHS, format: 'avif', sizes: '100vw' });
  return { srcset: img.srcSet.attribute, sizes: '100vw', type: 'image/avif' };
}
