import { tokenize } from "./tokenizer.js";
import { parseInteractive } from "./parser.js";
import { Interpreter } from "./interpreter.js";
import { display } from "./values.js";
import { BhojpuriError } from "./errors.js";
import { MSG } from "./messages.js";

const OPENERS = new Set(["(", "[", "{"]);
const CLOSERS = new Set([")", "]", "}"]);

/**
 * The interactive prompt (REPL), without any terminal code: feed it what the user typed,
 * and it runs it, keeping variables and functions between inputs.
 */
export class Session {
  /** @param {import("./interpreter.js").InterpreterOptions} [options] */
  constructor(options) {
    this.interpreter = new Interpreter(options);
    this.scope = this.interpreter.sessionScope();
  }

  /**
   * Whether `source` can run as it is, or the user is still typing: a bracket or a
   * block comment is still open. Other mistakes count as complete so `run` reports them.
   * @param {string} source
   */
  isComplete(source) {
    let tokens;
    try {
      tokens = tokenize(source);
    } catch (err) {
      return !(err instanceof BhojpuriError && err.message === MSG.unterminatedComment());
    }
    let depth = 0;
    for (const token of tokens) {
      if (token.type !== "punct") continue;
      if (OPENERS.has(token.value)) depth++;
      else if (CLOSERS.has(token.value)) depth--;
    }
    return depth <= 0;
  }

  /**
   * Run one input. `exit` is true when the input is `chalat bani bhaiya`. `result` is the
   * value to show (strings in quotes), or null when there is nothing to show.
   * Throws a BhojpuriError for mistakes; the session carries on afterwards.
   * @param {string} source
   * @returns {{ exit: boolean, result: string | null }}
   */
  run(source) {
    const tokens = tokenize(source);
    if (tokens[0].type === "keyword" && tokens[0].value === "PROGRAM_END" && tokens[1].type === "eof") {
      return { exit: true, result: null };
    }
    const value = this.interpreter.runInteractive(parseInteractive(tokens), this.scope);
    if (value === undefined || value === null) return { exit: false, result: null };
    return { exit: false, result: typeof value === "string" ? JSON.stringify(value) : display(value) };
  }
}
