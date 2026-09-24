import { KEYWORDS } from "./keywords.js";
import { syntaxError } from "./errors.js";
import { MSG } from "./messages.js";

/**
 * @typedef {{
 *   type: "keyword" | "number" | "string" | "template" | "identifier" | "punct" | "eof",
 *   value: any,     // keyword id (e.g. "IF"), number, decoded string, name or operator;
 *                   // for a template, its parts: strings and { source, line, col } for each {…}
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
  "+", "-", "*", "/", "%", "<", ">", "=", "!", "(", ")", "{", "}", "[", "]", ";", ",", ":",
];

const ESCAPES = { n: "\n", t: "\t", r: "\r", "0": "\0" };

const QUOTES = new Set(['"', "'", "`"]);

/**
 * Find the `}` that closes a `{` in a template string, starting just after the `{`.
 * Skips over quoted strings and nested braces. Returns -1 if it isn't closed on this line.
 */
function closingBrace(source, from) {
  let depth = 1;
  for (let i = from; i < source.length && source[i] !== "\n"; i++) {
    const c = source[i];
    if (QUOTES.has(c)) {
      for (i++; source[i] !== c; i++) {
        if (source[i] === undefined || source[i] === "\n") return -1;
        if (source[i] === "\\") i++;
      }
    } else if (c === "{") {
      depth++;
    } else if (c === "}" && --depth === 0) {
      return i;
    }
  }
  return -1;
}

function matchAt(regex, source, pos) {
  regex.lastIndex = pos;
  return regex.exec(source)?.[0] ?? null;
}

/**
 * @param {string} source
 * @param {{ line?: number, col?: number }} [start] where `source` begins, for code inside a
 *   template string's {…}, so errors point at the right place in the whole program.
 * @returns {Token[]}
 */
export function tokenize(source, { line: startLine = 1, col: startCol = 1 } = {}) {
  const tokens = [];
  let pos = 0;
  let line = startLine;
  let lineStart = 1 - startCol;

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

    // `Pranam {naam}`: text with expressions in braces. The expressions are parsed later.
    if (ch === "`") {
      const parts = [];
      let text = "";
      let i = pos + 1;
      for (;;) {
        const c = source[i];
        if (c === undefined || c === "\n") throw syntaxError(MSG.unterminatedString(), start);
        if (c === "`") break;
        if (c === "\\" && i + 1 < source.length) {
          const next = source[i + 1];
          text += ESCAPES[next] ?? next;
          i += 2;
        } else if (c === "{") {
          const end = closingBrace(source, i + 1);
          if (end === -1) throw syntaxError(MSG.unterminatedTemplateBrace(), { line, col: i - lineStart + 1 });
          parts.push(text, { source: source.slice(i + 1, end), line, col: i + 1 - lineStart + 1 });
          text = "";
          i = end + 1;
        } else {
          text += c;
          i++;
        }
      }
      parts.push(text);
      push("template", parts, source.slice(pos, i + 1), start);
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
