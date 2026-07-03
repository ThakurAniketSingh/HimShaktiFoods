// shuffleArray — a proper, statistically uniform random shuffle
// (Fisher–Yates / Durstenfeld algorithm).
//
// Don't shuffle with `array.sort(() => Math.random() - 0.5)` — most JS
// engines' sort implementations (insertion sort for small arrays) assume
// the comparator is consistent/transitive. A random comparator breaks
// that assumption, so the result tends to stay suspiciously close to the
// original order — especially for small arrays (e.g. picking 3 random
// reviews out of 4-5). This function always produces a genuinely random
// order, regardless of array size.
export function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
