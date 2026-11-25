/**
 * Fade-and-rise on scroll. Add `data-reveal` to any element; give siblings
 * `data-reveal="1"`, `"2"`… to stagger them. Each element animates once.
 * The CSS lives in src/styles/global.css and only applies when motion is
 * welcome, so with reduced motion everything is simply visible.
 *
 * Content must never stay hidden, so there are three safety nets:
 * 1. Elements the visitor has already scrolled past (a fast jump, an anchor
 *    link, restoring scroll position) are revealed at once.
 * 2. If the IntersectionObserver hasn't reported anything ~1.5s after start,
 *    every element is revealed.
 * 3. If this script never runs at all, the CSS never hides anything, because
 *    hiding depends on the `.js` class plus this script marking itself ready.
 */
const FALLBACK_MS = 1500;
const items = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
const show = (el: Element) => el.classList.add('is-visible');
const showAll = () => items.forEach(show);

if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
  showAll();
} else {
  let observerHasFired = false;

  const observer = new IntersectionObserver(
    (entries) => {
      observerHasFired = true;
      for (const entry of entries) {
        // In view, or already above the viewport because the visitor jumped past it.
        if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) {
          show(entry.target);
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );

  items.forEach((el) => {
    const index = Number(el.dataset.reveal);
    if (index) el.style.setProperty('--reveal-index', String(index));
    observer.observe(el);
  });
  document.documentElement.classList.add('reveal-ready');

  window.setTimeout(() => {
    if (!observerHasFired) {
      observer.disconnect();
      showAll();
    }
  }, FALLBACK_MS);
}
