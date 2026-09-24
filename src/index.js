import { tokenize } from "./tokenizer.js";
import { parse } from "./parser.js";
import { Interpreter } from "./interpreter.js";

/**
 * Tokenize, parse and run a Bhojpuri program.
 * Throws a BhojpuriError (with line/col) on syntax or runtime errors.
 *
 * @param {string} source
 * @param {{ print?: (line: string) => void, maxLoopIterations?: number, random?: () => number }} [options]
 */
export function run(source, options) {
  new Interpreter(options).run(parse(tokenize(source)));
}

export { tokenize, parse, Interpreter };
export { display } from "./interpreter.js";
export { BhojpuriError, formatError } from "./errors.js";
export { KEYWORDS, KEYWORD_MEANINGS, LOOP_WORDS, BUILTINS, BUILTIN_MEANINGS } from "./keywords.js";
