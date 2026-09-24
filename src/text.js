// Text is counted in letters as people see them: Unicode "grapheme clusters". So "नाम" is two
// letters (ना, म), not three JavaScript characters, and an emoji with a skin tone is one letter.
// `lambai`, indexes, `ulta`, `hissa`, `khoj`, `tod(text, "")` and `har ... me` all use this.
//
// Exactly how some Devanagari conjuncts (like स्ते) are grouped follows the Unicode version of the
// browser or Node.js running the program: newer versions keep a conjunct together.

const segmenter = typeof Intl === "object" && typeof Intl.Segmenter === "function"
  ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
  : null;

/** The letters of some text, in order. Without Intl.Segmenter, falls back to code points. */
export function letters(text) {
  return segmenter ? Array.from(segmenter.segment(text), (part) => part.segment) : Array.from(text);
}

/**
 * The position (in letters) where `part` first appears in `text`, or -1. A match that starts inside
 * a letter, like a vowel sign on its own, counts as that letter's position.
 */
export function letterIndexOf(text, part) {
  const at = text.indexOf(part);
  if (at === -1) return -1;
  let offset = 0;
  let index = 0;
  for (const letter of letters(text)) {
    if (offset + letter.length > at) return index;
    offset += letter.length;
    index++;
  }
  return index; // an empty `part` at the very end
}
