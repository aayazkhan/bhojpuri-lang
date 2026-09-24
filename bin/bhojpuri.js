#!/usr/bin/env node
import { readFileSync } from "node:fs";
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

try {
  run(source);
} catch (err) {
  if (!(err instanceof BhojpuriError)) throw err;
  console.error(formatError(err, source));
  process.exit(1);
}
