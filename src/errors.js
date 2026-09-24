import { MSG } from "./messages.js";

export class BhojpuriError extends Error {
  /**
   * @param {"SyntaxError" | "RuntimeError"} kind
   * @param {string} message
   * @param {{ line?: number, col?: number }} [pos]
   */
  constructor(kind, message, pos) {
    super(message);
    this.name = "BhojpuriError";
    this.kind = kind;
    this.line = pos?.line ?? null;
    this.col = pos?.col ?? null;
  }
}

export const syntaxError = (message, pos) => new BhojpuriError("SyntaxError", message, pos);
export const runtimeError = (message, pos) => new BhojpuriError("RuntimeError", message, pos);

/**
 * Render an error with the offending source line and a caret under the column.
 * @param {BhojpuriError} err
 * @param {string} [source]
 */
export function formatError(err, source) {
  const label = err.kind === "SyntaxError" ? MSG.syntaxLabel : MSG.runtimeLabel;
  if (err.line == null) return `${label}: ${err.message}`;

  const header = `${label} (line ${err.line}, col ${err.col}): ${err.message}`;
  const lineText = source?.split(/\r?\n/)[err.line - 1];
  if (lineText == null) return header;

  const gutter = String(err.line);
  const pad = " ".repeat(gutter.length);
  // Keep tabs so the caret lines up with tab-indented code.
  const caretPad = lineText.slice(0, err.col - 1).replace(/[^\t]/g, " ");
  return `${header}\n  ${gutter} | ${lineText}\n  ${pad} | ${caretPad}^`;
}
