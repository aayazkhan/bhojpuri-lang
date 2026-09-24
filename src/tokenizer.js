import { KEYWORDS } from "./keywords.js";
import { syntaxError } from "./errors.js";
import { MSG } from "./messages.js";

/**
 * @typedef {{
 *   type: "keyword" | "number" | "string" | "identifier" | "punct" | "eof",
 *   value: any,     // keyword id (e.g. "IF"), number, decoded string, name or operator
 *   text: string,   // the exact source text
 *   line: number,
 *   col: number,
 * }} Token
 */

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Longest keywords first so "na ta jadi" wins over "na ta".
const KEYWORD_MATCHERS = Object.entries(KEYWORDS)
  .sort(([, a], [, b]) => b.length - a.length)
  .map(([id, text]) => ({
    id,
    regex: new RegExp(
      text.trim().split(/\s+/).map(escapeRegex).join("[ \\t]+") + "(?![\\p{L}\\p{M}\\p{N}_])",
      "uy",
    ),
  }));

// Identifiers may use any script, so Devanagari names like `नाम` work too.
const IDENTIFIER = /[\p{L}_][\p{L}\p{M}\p{N}_]*/uy;
const NUMBER = /\d+(?:\.\d+)?/y;

// Longest operators first so "==" wins over "=".
const PUNCTUATION = [
  "==", "!=", "<=", ">=", "&&", "||", "+=", "-=", "*=", "/=", "%=",
  "+", "-", "*", "/", "%", "<", ">", "=", "!", "(", ")", "{", "}", ";", ",",
];

const ESCAPES = { n: "\n", t: "\t", r: "\r", "0": "\0" };

function matchAt(regex, source, pos) {
  regex.lastIndex = pos;
  return regex.exec(source)?.[0] ?? null;
}

/**
 * @param {string} source
 * @returns {Token[]}
 */
export function tokenize(source) {
  const tokens = [];
  let pos = 0;
  let line = 1;
  let lineStart = 0;

  const here = () => ({ line, col: pos - lineStart + 1 });
  const advance = (n) => {
    for (let end = pos + n; pos < end; pos++) {
      if (source[pos] === "\n") {
        line++;
        lineStart = pos + 1;
      }
    }
  };
  const push = (type, value, text, start) => {
    tokens.push({ type, value, text, ...start });
    advance(text.length);
  };

  outer: while (pos < source.length) {
    const ch = source[pos];

    if (/\s/.test(ch)) {
      advance(1);
      continue;
    }

    if (source.startsWith("//", pos)) {
      const end = source.indexOf("\n", pos);
      advance((end === -1 ? source.length : end) - pos);
      continue;
    }

    const start = here();

    if (source.startsWith("/*", pos)) {
      const end = source.indexOf("*/", pos + 2);
      if (end === -1) throw syntaxError(MSG.unterminatedComment(), start);
      advance(end + 2 - pos);
      continue;
    }

    for (const { id, regex } of KEYWORD_MATCHERS) {
      const text = matchAt(regex, source, pos);
      if (text) {
        push("keyword", id, text, start);
        continue outer;
      }
    }

    const number = matchAt(NUMBER, source, pos);
    if (number) {
      push("number", Number(number), number, start);
      continue;
    }

    if (ch === '"' || ch === "'") {
      let value = "";
      let i = pos + 1;
      for (;;) {
        const c = source[i];
        if (c === undefined || c === "\n") throw syntaxError(MSG.unterminatedString(), start);
        if (c === ch) break;
        if (c === "\\" && i + 1 < source.length) {
          const next = source[i + 1];
          value += ESCAPES[next] ?? next;
          i += 2;
        } else {
          value += c;
          i++;
        }
      }
      push("string", value, source.slice(pos, i + 1), start);
      continue;
    }

    const identifier = matchAt(IDENTIFIER, source, pos);
    if (identifier) {
      push("identifier", identifier, identifier, start);
      continue;
    }

    const punct = PUNCTUATION.find((p) => source.startsWith(p, pos));
    if (punct) {
      push("punct", punct, punct, start);
      continue;
    }

    throw syntaxError(MSG.unknownChar(String.fromCodePoint(source.codePointAt(pos))), start);
  }

  tokens.push({ type: "eof", value: null, text: "", ...here() });
  return tokens;
}
