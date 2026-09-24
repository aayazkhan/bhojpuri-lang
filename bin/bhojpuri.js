#!/usr/bin/env node
import { readFileSync, readSync, writeSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, extname, relative, resolve } from "node:path";
import {
  run, Session, formatError, BhojpuriError, KEYWORDS, KEYWORD_MEANINGS, BUILTINS, BUILTIN_MEANINGS,
} from "../src/index.js";

const args = process.argv.slice(2);
const version = () => JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

// Sleep without spinning the CPU while a non-blocking stdin or stdout isn't ready yet.
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Output and `poochh` both go straight to the file descriptors. Writing synchronously keeps the
// question on screen before we block waiting for the answer, and keeps everything in order.
function write(fd, text) {
  let bytes = Buffer.from(text);
  while (bytes.length) {
    try {
      bytes = bytes.subarray(writeSync(fd, bytes));
    } catch (err) {
      if (err.code === "EAGAIN") {
        pause(20);
        continue;
      }
      // Whoever reads our output has stopped (e.g. `bhojpuri x.bhoj | head`): stop quietly.
      if (err.code === "EPIPE") process.exit(0);
      throw err;
    }
  }
}

const print = (line) => write(1, line + "\n");
const printError = (err, source) => write(2, formatError(err, source) + "\n");

/** Read one line from stdin, without the newline. Returns null at the end of input. */
function readLine() {
  const bytes = [];
  const byte = Buffer.alloc(1);
  for (;;) {
    let n;
    try {
      n = readSync(0, byte, 0, 1, null);
    } catch (err) {
      if (err.code === "EAGAIN") {
        pause(20);
        continue;
      }
      if (err.code === "EOF") n = 0; // Windows reports end of input this way
      else throw err;
    }
    if (n === 0) return bytes.length ? Buffer.from(bytes).toString("utf8") : null;
    if (byte[0] === 0x0a) return Buffer.from(bytes).toString("utf8").replace(/\r$/, "");
    bytes.push(byte[0]);
  }
}

function input(question) {
  if (question) write(1, question);
  const answer = readLine();
  if (answer === null && question) write(1, "\n"); // keep the next output on its own line
  return answer;
}

/**
 * Find a file for `le aaw`: relative to the file that asks for it (or the current folder at the
 * prompt), with ".bhoj" added when the name has no extension.
 */
function loadFile(path, from) {
  const full = resolve(from ? dirname(from) : process.cwd(), extname(path) ? path : `${path}.bhoj`);
  let source;
  try {
    source = readFileSync(full, "utf8");
  } catch {
    return null;
  }
  return { id: full, name: relative(process.cwd(), full) || full, source };
}

function showHelp() {
  const rows = [
    ...Object.entries(KEYWORDS).map(([id, text]) => [text, KEYWORD_MEANINGS[id]]),
    ...Object.entries(BUILTINS).map(([id, name]) => [`${name}(…)`, BUILTIN_MEANINGS[id]]),
  ];
  const width = Math.max(...rows.map(([text]) => text.length));
  const table = rows.map(([text, meaning]) => `  ${text.padEnd(width)}  ${meaning}`).join("\n");
  console.log(`Bhojpuri Lang — Bhojpuri me code likh.

Usage:
  bhojpuri               interactive prompt khol (ek-ek line likh ke chalaw)
  bhojpuri <file.bhoj>   program chalaw
  bhojpuri --help        i madad dekhaw
  bhojpuri --version     version dekhaw

Keywords aur built-in kaam:
${table}`);
}

function runFile(file) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    console.error(`File "${file}" na mil paail.`);
    process.exit(1);
  }
  try {
    run(source, { print, input, loadFile, file: resolve(file) });
  } catch (err) {
    if (!(err instanceof BhojpuriError)) throw err;
    printError(err, source);
    process.exit(1);
  }
}

/**
 * Run one complete input at the prompt: show its value or its error.
 * Returns false when the user asked to leave.
 */
function evaluate(session, source) {
  if (!source.trim()) return true;
  try {
    const { exit, result } = session.run(source);
    if (exit) return false;
    if (result !== null) print(result);
  } catch (err) {
    if (!(err instanceof BhojpuriError)) throw err;
    printError(err, source);
  }
  return true;
}

// Piped input (`echo "2 + 3" | bhojpuri`): no prompts, one line at a time, so `poochh` can read
// the following lines too.
function replFromPipe(session) {
  let buffer = "";
  for (let line; (line = readLine()) !== null; ) {
    buffer = buffer ? `${buffer}\n${line}` : line;
    if (!session.isComplete(buffer)) continue;
    const keepGoing = evaluate(session, buffer);
    buffer = "";
    if (!keepGoing) return;
  }
  if (buffer) evaluate(session, buffer); // reports the unclosed bracket
}

// A real terminal: readline gives line editing and history with the arrow keys.
function replInTerminal(session) {
  const PROMPT = "bhojpuri> ";
  const MORE = "... ";
  const rl = createInterface({ input: process.stdin, output: process.stdout, historySize: 1000 });
  let buffer = "";

  print(`Bhojpuri Lang ${version()} — "${KEYWORDS.PROGRAM_END}" likh ke ya Ctrl+D se bahar nikal.`);
  rl.setPrompt(PROMPT);
  rl.prompt();

  rl.on("line", (line) => {
    buffer = buffer ? `${buffer}\n${line}` : line;
    if (!session.isComplete(buffer)) {
      rl.setPrompt(MORE);
      rl.prompt();
      return;
    }
    const source = buffer;
    buffer = "";

    // While the code runs, hand the terminal back to normal line mode so `poochh` can read
    // what the user types.
    rl.pause();
    process.stdin.setRawMode(false);
    const keepGoing = evaluate(session, source);
    process.stdin.setRawMode(true);
    if (!keepGoing) return rl.close();
    rl.resume();
    rl.setPrompt(PROMPT);
    rl.prompt();
  });

  // Ctrl+C throws away what is being typed and starts a fresh line.
  rl.on("SIGINT", () => {
    buffer = "";
    rl.write(null, { ctrl: true, name: "e" });
    rl.write(null, { ctrl: true, name: "u" });
    write(1, "\n");
    rl.setPrompt(PROMPT);
    rl.prompt();
  });

  rl.on("close", () => {
    write(1, "\n");
    process.exit(0);
  });
}

if (args[0] === "-v" || args[0] === "--version") {
  console.log(version());
} else if (args[0] === "-h" || args[0] === "--help") {
  showHelp();
} else if (args.length > 0) {
  runFile(args[0]);
} else {
  const session = new Session({ print, input, loadFile });
  if (process.stdin.isTTY) replInTerminal(session);
  else replFromPipe(session);
}
