import { run, formatError, BhojpuriError, KEYWORDS, KEYWORD_MEANINGS } from "../src/index.js";

const EXAMPLES = [
  { file: "hello.bhoj", title: "Pranam duniya" },
  { file: "fizzbuzz.bhoj", title: "FizzBuzz" },
  { file: "pahada.bhoj", title: "Pahada (table)" },
  { file: "factorial.bhoj", title: "Factorial" },
  { file: "jor-sankhya.bhoj", title: "Jor sankhya (break/continue)" },
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

document.getElementById("keywords").append(
  ...Object.entries(KEYWORDS).map(([id, text]) => {
    const row = document.createElement("tr");
    const kw = document.createElement("td");
    kw.innerHTML = "<code></code>";
    kw.firstChild.textContent = text;
    const meaning = document.createElement("td");
    meaning.textContent = KEYWORD_MEANINGS[id];
    row.append(kw, meaning);
    return row;
  }),
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
