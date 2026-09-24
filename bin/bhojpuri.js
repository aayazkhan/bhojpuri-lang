#!/usr/bin/env node
import { readFileSync, readSync, writeSync } from "node:fs";
import {
  run, formatError, BhojpuriError, KEYWORDS, KEYWORD_MEANINGS, BUILTINS, BUILTIN_MEANINGS,
} from "../src/index.js";

const args = process.argv.slice(2);

if (args[0] === "-v" || args[0] === "--version") {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  console.log(pkg.version);
  process.exit(0);
}

if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
  const rows = [
    ...Object.entries(KEYWORDS).map(([id, text]) => [text, KEYWORD_MEANINGS[id]]),
    ...Object.entries(BUILTINS).map(([id, name]) => [`${name}(…)`, BUILTIN_MEANINGS[id]]),
  ];
  const width = Math.max(...rows.map(([text]) => text.length));
  const table = rows.map(([text, meaning]) => `  ${text.padEnd(width)}  ${meaning}`).join("\n");
  console.log(`Bhojpuri Lang — Bhojpuri me code likh.

Usage:
  bhojpuri <file.bhoj>   program chalaw
  bhojpuri --help        i madad dekhaw
  bhojpuri --version     version dekhaw

Keywords aur built-in kaam:
${table}`);
  process.exit(args.length === 0 ? 1 : 0);
}

const file = args[0];
let source;
try {
  source = readFileSync(file, "utf8");
} catch {
  console.error(`File "${file}" na mil paail.`);
  process.exit(1);
}

// Output and `poochh` both go straight to the file descriptors. Writing synchronously keeps the
// question on screen before we block waiting for the answer, and keeps everything in order.
const print = (line) => writeSync(1, line + "\n");

/** Read one line from stdin, without the newline. Returns null at the end of input. */
function readLine() {
  const bytes = [];
  const byte = Buffer.alloc(1);
  for (;;) {
    let n;
    try {
      n = readSync(0, byte, 0, 1, null);
    } catch (err) {
      if (err.code === "EAGAIN") continue; // stdin is non-blocking and has no data yet
      if (err.code === "EOF") n = 0; // Windows reports end of input this way
      else throw err;
    }
    if (n === 0) return bytes.length ? Buffer.from(bytes).toString("utf8") : null;
    if (byte[0] === 0x0a) return Buffer.from(bytes).toString("utf8").replace(/\r$/, "");
    bytes.push(byte[0]);
  }
}

function input(question) {
  if (question) writeSync(1, question);
  const answer = readLine();
  if (answer === null && question) writeSync(1, "\n"); // keep the next output on its own line
  return answer;
}

try {
  run(source, { print, input });
} catch (err) {
  if (!(err instanceof BhojpuriError)) throw err;
  console.error(formatError(err, source));
  process.exit(1);
}
