import {
  run, formatError, BhojpuriError, KEYWORDS, KEYWORD_MEANINGS, BUILTINS, BUILTIN_MEANINGS,
} from "../src/index.js";
import { encodeCode, decodeHash } from "./share.js";
import { highlight } from "./highlight.js";
import { setUpConsole } from "./console.js";
import { setUpLessons } from "./lesson-panel.js";

const EXAMPLES = [
  { file: "hello.bhoj", title: "Pranam duniya" },
  { file: "fizzbuzz.bhoj", title: "FizzBuzz" },
  { file: "pahada.bhoj", title: "Pahada (table)" },
  { file: "factorial.bhoj", title: "Factorial" },
  { file: "jor-sankhya.bhoj", title: "Jor sankhya (break/continue)" },
  { file: "fibonacci.bhoj", title: "Fibonacci (kaam)" },
  { file: "bazaar.bhoj", title: "Bazaar (list)" },
  { file: "chhatai.bhoj", title: "Chhatai (bubble sort)" },
  { file: "paasa.bhoj", title: "Paasa (built-in kaam)" },
  { file: "ginti.bhoj", title: "Shabd ginti (kosh)" },
  { file: "andaaz.bhoj", title: "Andaaz lagaw (poochh)" },
];

const STORAGE_KEY = "bhojpuri-lang:code";
const MAX_LOOP_ITERATIONS = 100_000;

const editor = document.getElementById("editor");
const highlighted = document.getElementById("highlight");

// Redraw the coloured copy under the textarea. The extra newline keeps the last line
// visible when the code ends with one.
function paint() {
  highlighted.innerHTML = highlight(editor.value) + "\n";
  syncScroll();
}

function syncScroll() {
  highlighted.scrollTop = editor.scrollTop;
  highlighted.scrollLeft = editor.scrollLeft;
}

function setCode(code) {
  editor.value = code;
  paint();
}
const output = document.getElementById("output");
const examples = document.getElementById("examples");

function runCode() {
  const source = editor.value;
  const lines = [];
  output.replaceChildren();

  // `poochh` uses the browser's own question box. The page can't repaint while it is open, so
  // the box also shows what was printed since the last question (up to 10 lines). The question
  // and answer are added to the output so it reads like a conversation; Cancel gives khaali.
  let shown = 0;
  const input = (question) => {
    const recent = lines.slice(Math.max(shown, lines.length - 10));
    const answer = window.prompt([...recent, question || "poochh():"].join("\n"));
    lines.push(question + (answer ?? "(khaali)"));
    shown = lines.length;
    return answer;
  };

  try {
    run(source, { print: (line) => lines.push(line), input, maxLoopIterations: MAX_LOOP_ITERATIONS });
    output.textContent = lines.length ? lines.join("\n") : "(kuchhu print na bhail)";
  } catch (err) {
    // Show whatever printed before the error, then the error itself.
    if (lines.length) output.append(lines.join("\n") + "\n");
    const span = document.createElement("span");
    span.className = "error";
    span.textContent = err instanceof BhojpuriError ? formatError(err, source) : String(err);
    output.append(span);
  }
}

async function loadExample(file) {
  const res = await fetch(`../examples/${file}`);
  setCode(await res.text());
  save();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, editor.value);
  } catch {}
}

function restore() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// ---- share links ----

const shareStatus = document.getElementById("share-status");
let statusTimer;

function showStatus(text) {
  shareStatus.textContent = text;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => (shareStatus.textContent = ""), 4000);
}

async function share() {
  const url = `${location.origin}${location.pathname}#${await encodeCode(editor.value)}`;
  try {
    await navigator.clipboard.writeText(url);
    showStatus("Link copy ho gail!");
  } catch {
    window.prompt("Ee link copy kar:", url); // e.g. clipboard blocked by the browser
  }
}

/** Load code from a share link in the address. Returns true if there was one. */
async function openSharedLink() {
  const code = await decodeHash(location.hash);
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  if (code === null) return false;
  setCode(code);
  examples.selectedIndex = -1; // it isn't one of the examples
  save();
  output.replaceChildren();
  showStatus("Baantal code khulal.");
  return true;
}

// ---- wire up ----

for (const { file, title } of EXAMPLES) {
  examples.append(new Option(title, file));
}

function cheatRow(text, meaning) {
  const row = document.createElement("tr");
  const word = document.createElement("td");
  const code = document.createElement("code");
  code.textContent = text;
  word.append(code);
  const desc = document.createElement("td");
  desc.textContent = meaning;
  row.append(word, desc);
  return row;
}

document.getElementById("keywords").append(
  ...Object.entries(KEYWORDS).map(([id, text]) => cheatRow(text, KEYWORD_MEANINGS[id])),
);
document.getElementById("builtins").append(
  ...Object.entries(BUILTINS).map(([id, name]) => cheatRow(`${name}(…)`, BUILTIN_MEANINGS[id])),
);

setUpConsole({
  log: document.getElementById("console-log"),
  input: document.getElementById("console-input"),
  prompt: document.getElementById("console-prompt"),
  reset: document.getElementById("console-reset"),
});

examples.addEventListener("change", () => loadExample(examples.value));
document.getElementById("share").addEventListener("click", share);
window.addEventListener("hashchange", openSharedLink);
document.getElementById("run").addEventListener("click", runCode);
document.getElementById("clear").addEventListener("click", () => output.replaceChildren());
editor.addEventListener("input", () => {
  paint();
  save();
});
editor.addEventListener("scroll", syncScroll);

editor.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    runCode();
  } else if (e.key === "Tab" && !e.shiftKey) {
    e.preventDefault();
    editor.setRangeText("  ", editor.selectionStart, editor.selectionEnd, "end");
    paint();
    save();
  }
});

// A share link wins; then the code from last time; then the first example.
const openedLink = await openSharedLink();
const saved = restore();
if (!openedLink) {
  if (saved) setCode(saved);
  else await loadExample(EXAMPLES[0].file);
}

setUpLessons({
  setCode: (code) => {
    setCode(code);
    examples.selectedIndex = -1;
    save();
  },
  getCode: () => editor.value,
  runCode,
  firstVisit: !saved && !openedLink,
});
