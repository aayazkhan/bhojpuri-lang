import { KEYWORDS, LOOP_WORDS, BUILTINS } from "../src/index.js";

// Colours code for the playground editor. Unlike the real tokenizer it never stops at a
// mistake: half-typed code (an unclosed string or comment) still gets coloured.

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const LITERALS = new Set(["TRUE", "FALSE", "NULL"]);
const WORD_END = "(?![\\p{L}\\p{M}\\p{N}_])";

// Longest first so "na ta jadi" wins over "na ta", like the tokenizer.
const KEYWORD_MATCHERS = Object.entries(KEYWORDS)
  .sort(([, a], [, b]) => b.length - a.length)
  .map(([id, text]) => ({
    id,
    regex: new RegExp(text.trim().split(/\s+/).map(escapeRegex).join("[ \\t]+") + WORD_END, "uy"),
  }));

const IDENTIFIER = /[\p{L}_][\p{L}\p{M}\p{N}_]*/uy;
const NUMBER = /\d+(?:\.\d+)?/y;
const LOOP_WORD_SET = new Set(Object.values(LOOP_WORDS));
const BUILTIN_SET = new Set(Object.values(BUILTINS));

function matchAt(regex, code, pos) {
  regex.lastIndex = pos;
  return regex.exec(code)?.[0] ?? null;
}

const span = (cls, text) => `<span class="tok-${cls}">${escapeHtml(text)}</span>`;

/** The end of a quoted string starting at `pos`: its closing quote, or the end of the line. */
function stringEnd(code, pos) {
  const quote = code[pos];
  let i = pos + 1;
  while (i < code.length && code[i] !== quote && code[i] !== "\n") i += code[i] === "\\" ? 2 : 1;
  return Math.min(code[i] === quote ? i + 1 : i, code.length);
}

/** Where the `}` closing a template's `{` at `pos` is, or the end of the line. */
function braceEnd(code, pos) {
  let depth = 0;
  for (let i = pos; i < code.length && code[i] !== "\n"; i++) {
    const c = code[i];
    if (c === '"' || c === "'" || c === "`") i = stringEnd(code, i) - 1;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return i + 1;
  }
  const newline = code.indexOf("\n", pos);
  return newline === -1 ? code.length : newline;
}

/** `Pranam {naam}`: the text in string colour, the {…} parts coloured as code. */
function highlightTemplate(code, pos) {
  let html = "";
  let text = "`";
  let i = pos + 1;
  while (i < code.length && code[i] !== "`" && code[i] !== "\n") {
    if (code[i] === "\\") {
      text += code.slice(i, i + 2);
      i += 2;
    } else if (code[i] === "{") {
      const end = braceEnd(code, i);
      const closed = code[end - 1] === "}";
      html += span("string", text) + span("punct", "{");
      html += highlight(code.slice(i + 1, closed ? end - 1 : end));
      if (closed) html += span("punct", "}");
      text = "";
      i = end;
    } else {
      text += code[i++];
    }
  }
  if (code[i] === "`") {
    text += "`";
    i++;
  }
  return { html: html + span("string", text), end: i };
}

/**
 * Turn code into HTML with <span class="tok-..."> around keywords, strings and so on.
 * The text itself never changes, only the spans around it.
 * @param {string} code
 */
export function highlight(code) {
  let html = "";
  let pos = 0;
  let inLoopHeader = false; // between `har` and its `{`, where se/tak/kadam/me are special

  outer: while (pos < code.length) {
    const c = code[pos];

    if (code.startsWith("//", pos)) {
      const end = code.indexOf("\n", pos);
      const stop = end === -1 ? code.length : end;
      html += span("comment", code.slice(pos, stop));
      pos = stop;
      continue;
    }
    if (code.startsWith("/*", pos)) {
      const end = code.indexOf("*/", pos + 2);
      const stop = end === -1 ? code.length : end + 2;
      html += span("comment", code.slice(pos, stop));
      pos = stop;
      continue;
    }
    if (c === '"' || c === "'") {
      const end = stringEnd(code, pos);
      html += span("string", code.slice(pos, end));
      pos = end;
      continue;
    }
    if (c === "`") {
      const { html: part, end } = highlightTemplate(code, pos);
      html += part;
      pos = end;
      continue;
    }

    for (const { id, regex } of KEYWORD_MATCHERS) {
      const text = matchAt(regex, code, pos);
      if (text) {
        html += span(LITERALS.has(id) ? "literal" : "keyword", text);
        if (id === "FOR") inLoopHeader = true;
        pos += text.length;
        continue outer;
      }
    }

    const number = matchAt(NUMBER, code, pos);
    if (number) {
      html += span("number", number);
      pos += number.length;
      continue;
    }

    const word = matchAt(IDENTIFIER, code, pos);
    if (word) {
      const next = code.slice(pos + word.length).match(/^\s*(.)/)?.[1];
      if (inLoopHeader && LOOP_WORD_SET.has(word)) html += span("keyword", word);
      else if (BUILTIN_SET.has(word) && next === "(") html += span("builtin", word);
      else html += escapeHtml(word);
      pos += word.length;
      continue;
    }

    if (c === "{") inLoopHeader = false;
    html += escapeHtml(c);
    pos++;
  }
  return html;
}
