// Subtle brand-purple (#8B5CF6) tap feedback for every enabled button, link and
// button-like element.
//
// - Starts on pointerdown, so it never waits for the click and never delays
//   navigation, payments or form submits (it only animates box-shadow).
// - Uses the Web Animations API: no class changes, so React re-renders can't
//   clash with it, and it cleans itself up when finished.
// - Cancelled if the browser takes the touch over for scrolling (pointercancel).
// - Skipped when the user prefers reduced motion (index.css shows a static ring
//   while pressed instead).
// - Opt a single element out with a data-no-tap attribute.
const TARGET = 'button, [role="button"], a[href], summary';
const PURPLE = 'rgba(139, 92, 246, ';
const DURATION_MS = 200;

export function installTapEffect() {
  if (typeof window === 'undefined' || typeof Element === 'undefined' || typeof Element.prototype.animate !== 'function') return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const running = new WeakMap();

  const targetOf = (e) => (e.target instanceof Element ? e.target.closest(TARGET) : null);

  const start = (e) => {
    if (reduceMotion.matches) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const el = targetOf(e);
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('data-no-tap')) return;
    running.get(el)?.cancel();
    const anim = el.animate(
      [
        { boxShadow: `inset 0 0 0 1.5px ${PURPLE}0.55), 0 0 12px ${PURPLE}0.28)` },
        { boxShadow: `inset 0 0 0 1.5px ${PURPLE}0), 0 0 12px ${PURPLE}0)` },
      ],
      { duration: DURATION_MS, easing: 'ease-out' }
    );
    running.set(el, anim);
    anim.onfinish = anim.oncancel = () => {
      if (running.get(el) === anim) running.delete(el);
    };
  };

  const stop = (e) => {
    const el = targetOf(e);
    if (el) running.get(el)?.cancel();
  };

  document.addEventListener('pointerdown', start, { passive: true });
  document.addEventListener('pointercancel', stop, { passive: true });
}
