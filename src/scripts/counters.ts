/**
 * Impact counters count up from zero when they scroll into view. The final
 * number is already in the HTML (so it works without JavaScript and for
 * screen readers); this only animates the visible copy.
 */
const counters = document.querySelectorAll<HTMLElement>('[data-count-to]');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function run(el: HTMLElement) {
  const raw = el.dataset.countTo ?? '0';
  const target = Number(raw);
  // Keep as many decimals as the final value has (99.5 → one), so the last
  // frame matches the server-rendered number instead of rounding to 100.
  const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
  const factor = 10 ** decimals;
  const format = new Intl.NumberFormat('en-CA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const prefix = el.dataset.prefix ?? '';
  const suffix = el.dataset.suffix ?? '';
  const duration = 1800;
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 4);
    el.textContent = `${prefix}${format.format(Math.round(target * eased * factor) / factor)}${suffix}`;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

if (!reduceMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        run(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.6 },
  );
  counters.forEach((el) => {
    // Only animate counters that start off-screen, so nothing visibly resets.
    if (el.getBoundingClientRect().top > innerHeight) {
      el.textContent = `${el.dataset.prefix ?? ''}0${el.dataset.suffix ?? ''}`;
      observer.observe(el);
    }
  });
}
