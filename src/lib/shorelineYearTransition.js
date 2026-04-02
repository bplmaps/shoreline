import { cubicOut } from "svelte/easing";
import { Fill, Stroke, Style } from "ol/style";

/**
 * OpenLayers style for shoreline fill/stroke with optional per-feature fade (0–1).
 * Works for Polygon and MultiPolygon (and any geometry rendered as area).
 * @param {import('ol/Feature').default} feature
 * @returns {import('ol/style/Style').default}
 */
export function shorelineTransitionStyle(feature) {
  const fade = feature.get("fadeOpacity");
  const a =
    fade === undefined || fade === null
      ? 1
      : Math.max(0, Math.min(1, Number(fade)));
  return new Style({
    fill: new Fill({ color: `rgba(108, 134, 224, ${0.4 * a})` }),
    stroke: new Stroke({
      color: `rgba(82, 42, 17, ${0.4 * a})`,
      width: 3,
    }),
  });
}

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Crossfade between the previous year’s feature(s) and the next. Suitable for MultiPolygon.
 * Calls onComplete when the animation finishes without being cancelled.
 *
 * @param {object} opts
 * @param {import('ol/Map').default} opts.map
 * @param {import('ol/source/Vector').default} opts.shorelineSource
 * @param {import('ol/source/Vector').default} opts.filteredSource
 * @param {number} opts.fromYear
 * @param {number} opts.toYear
 * @param {number} [opts.durationMs]
 * @param {() => void} [opts.onComplete]
 * @returns {{ cancel: () => void } | null} `null` if the transition finished synchronously (no animation frames).
 */
export function runShorelineYearTransition({
  map,
  shorelineSource,
  filteredSource,
  fromYear,
  toYear,
  durationMs = 320,
  onComplete,
}) {
  let rafId = 0;
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  const targetFeatures = shorelineSource
    .getFeatures()
    .filter((f) => f.get("year") === toYear);

  const commitTarget = () => {
    filteredSource.clear();
    filteredSource.addFeatures(targetFeatures);
  };

  if (!targetFeatures.length || fromYear === toYear) {
    commitTarget();
    onComplete?.();
    return null;
  }

  const oldFeat = shorelineSource
    .getFeatures()
    .find((f) => f.get("year") === fromYear);
  if (!oldFeat) {
    commitTarget();
    onComplete?.();
    return null;
  }

  const targetTemplate = targetFeatures[0];

  const finish = () => {
    if (!cancelled) {
      commitTarget();
      onComplete?.();
    }
  };

  const oldClone = oldFeat.clone();
  const newClone = targetTemplate.clone();
  oldClone.set("fadeOpacity", 1);
  newClone.set("fadeOpacity", 0);

  filteredSource.clear();
  filteredSource.addFeatures([oldClone, newClone]);

  const start = performance.now();

  const frame = (now) => {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / durationMs);
    const eased = cubicOut(t);
    oldClone.set("fadeOpacity", 1 - eased);
    newClone.set("fadeOpacity", eased);
    oldClone.changed();
    newClone.changed();
    map.render();
    if (t < 1) {
      rafId = requestAnimationFrame(frame);
    } else {
      finish();
    }
  };

  rafId = requestAnimationFrame(frame);
  return { cancel };
}
