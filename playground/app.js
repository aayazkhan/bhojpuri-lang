import {
  run, formatError, BhojpuriError, KEYWORDS, KEYWORD_MEANINGS, BUILTINS, BUILTIN_MEANINGS,
} from "../src/index.js";

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
];

const STORAGE_KEY = "bhojpuri-lang:code";
const MAX_LOOP_ITERATIONS = 100_000;

const editor = document.getElementById("editor");
const output = document.getElementById("output");
const examples = document.getElementById("examples");

function runCode() {
  const source = editor.value;
  const lines = [];
  output.replaceChildren();

  try {
    run(source, { print: (line) => lines.push(line), maxLoopIterations: MAX_LOOP_ITERATIONS });
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
  editor.value = await res.text();
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

examples.addEventListener("change", () => loadExample(examples.value));
document.getElementById("run").addEventListener("click", runCode);
document.getElementById("clear").addEventListener("click", () => output.replaceChildren());
editor.addEventListener("input", save);

editor.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    runCode();
  } else if (e.key === "Tab" && !e.shiftKey) {
    e.preventDefault();
    editor.setRangeText("  ", editor.selectionStart, editor.selectionEnd, "end");
    save();
  }
});

const saved = restore();
if (saved) editor.value = saved;
else await loadExample(EXAMPLES[0].file);
