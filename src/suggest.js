// "Did you mean ...?" hints for misspelled names and kosh keys.

/**
 * How many single-letter edits turn `a` into `b`: adding, removing or changing a letter, or
 * swapping two letters next to each other. Stops counting once it's past `max`.
 */
export function editDistance(a, b, max = Infinity) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let before = null;
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (before && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, before[j - 2] + 1); // swapped neighbours
      }
      current.push(d);
      rowMin = Math.min(rowMin, d);
    }
    if (rowMin > max) return max + 1;
    before = previous;
    previous = current;
  }
  return previous[b.length];
}

// Short names only get a hint for a difference in capitals, so `x` doesn't suggest `y`.
const allowedEdits = (length) => (length <= 2 ? 0 : length <= 5 ? 1 : length <= 9 ? 2 : 3);

/**
 * The candidate most likely meant by `name`, or null if none is close enough.
 * Capitals don't count as an edit. On a tie, the earlier candidate wins.
 * @param {string} name
 * @param {Iterable<string>} candidates
 */
export function closestName(name, candidates) {
  const max = allowedEdits(name.length);
  const wanted = name.toLowerCase();
  let best = null;
  let bestDistance = max + 1;
  for (const candidate of candidates) {
    if (candidate === name) continue;
    const d = editDistance(wanted, candidate.toLowerCase(), bestDistance - 1);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best;
}
