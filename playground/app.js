import {
  run, formatError, BhojpuriError, KEYWORDS, KEYWORD_MEANINGS, BUILTINS, BUILTIN_MEANINGS,
} from "../src/index.js";
import { encodeFiles, decodeFiles } from "./share.js";
import { MAIN, cleanName, makeLoader, importsIn, resolvePath } from "./files.js";
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
  { file: "andaaz.bhoj", title: "Andaaz lagawa (poochh)" },
  { file: "hisaab.bhoj", title: "Hisaab (le aaw, duu file)" },
];

const FILES_KEY = "bhojpuri-lang:files";
const OLD_CODE_KEY = "bhojpuri-lang:code"; // from before there were files: becomes main.bhoj
const MAX_LOOP_ITERATIONS = 100_000;
const NEW_FILE = (name) => `// ${name}: main.bhoj me \`le aaw "${name}";\` likh ke istemal kar.\nka ho bhaiya\n\nchalat bani bhaiya\n`;

const editor = document.getElementById("editor");
const highlighted = document.getElementById("highlight");
const tabs = document.getElementById("file-tabs");
const output = document.getElementById("output");
const examples = document.getElementById("examples");

// The files, main.bhoj first; `active` is the one in the editor.
let files = [{ name: MAIN, code: "" }];
let active = 0;
const loadFile = makeLoader(() => files);

// ---- editor ----

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

function showFile(i) {
  active = i;
  editor.value = files[i].code;
  editor.scrollTop = 0;
  paint();
  renderTabs();
}

/** Replace all files, e.g. from a share link or an example. */
function setFiles(list, i = 0) {
  files = list.map(({ name, code }) => ({ name, code }));
  showFile(i);
  save();
}

/** Put code in main.bhoj and show it (lessons use this). */
function setMainCode(code) {
  files[0].code = code;
  showFile(0);
  save();
}

// ---- file tabs ----

function renderTabs() {
  tabs.replaceChildren();
  files.forEach((file, i) => {
    const tab = document.createElement("span");
    tab.className = "file-tab";
    const open = document.createElement("button");
    open.type = "button";
    open.textContent = file.name;
    open.setAttribute("role", "tab");
    open.setAttribute("aria-selected", String(i === active));
    open.addEventListener("click", () => showFile(i));
    tab.append(open);
    if (i > 0) {
      const close = document.createElement("button");
      close.type = "button";
      close.className = "file-close";
      close.textContent = "×";
      close.setAttribute("aria-label", `${file.name} hataw`);
      close.addEventListener("click", () => removeFile(i));
      tab.append(close);
    }
    tabs.append(tab);
  });
  const add = document.createElement("button");
  add.type = "button";
  add.className = "file-add";
  add.textContent = "+ Naya file";
  add.addEventListener("click", addFile);
  tabs.append(add);
}

function addFile() {
  const typed = window.prompt('Naya file ke naam (jaise "ganit" ya "lib/ganit.bhoj"):');
  if (typed === null) return;
  const name = cleanName(typed);
  if (!name) return showStatus("Ee naam na chali: akshar, ank, _ aur - chalela (folder khatir /).");
  if (files.some((f) => f.name === name)) return showStatus(`"${name}" pahile se ba.`);
  files.push({ name, code: NEW_FILE(name) });
  showFile(files.length - 1);
  save();
}

function removeFile(i) {
  if (!window.confirm(`"${files[i].name}" hata di? Ekar code mit jaai.`)) return;
  files.splice(i, 1);
  showFile(active === i ? 0 : active > i ? active - 1 : active);
  save();
}

// ---- running ----

function runCode() {
  const source = files[0].code;
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
    run(source, {
      print: (line) => lines.push(line), input, loadFile, file: MAIN, maxLoopIterations: MAX_LOOP_ITERATIONS,
    });
    output.textContent = lines.length ? lines.join("\n") : "(kuchhu print na bhail)";
  } catch (err) {
    // Show whatever printed before the error, then the error itself (naming its file if it's
    // not main.bhoj).
    if (lines.length) output.append(lines.join("\n") + "\n");
    const span = document.createElement("span");
    span.className = "error";
    span.textContent = err instanceof BhojpuriError ? formatError(err, source) : String(err);
    output.append(span);
  }
}

/** Load an example into main.bhoj, with any files it brings in with `le aaw`. */
async function loadExample(file) {
  const fetchText = async (path) => (await fetch(`../examples/${path}`)).text();
  const list = [{ name: MAIN, code: await fetchText(file) }];
  for (let i = 0; i < list.length; i++) {
    for (const path of importsIn(list[i].code)) {
      const name = resolvePath(path, list[i].name);
      if (!list.some((f) => f.name === name)) list.push({ name, code: await fetchText(name) });
    }
  }
  setFiles(list);
}

// ---- saving ----

function save() {
  try {
    localStorage.setItem(FILES_KEY, JSON.stringify({ files, active }));
  } catch {}
}

/** The files saved last time, or null. Code saved before files existed becomes main.bhoj. */
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(FILES_KEY));
    if (saved?.files?.[0]?.name === MAIN) return saved;
    const code = localStorage.getItem(OLD_CODE_KEY);
    return code === null ? null : { files: [{ name: MAIN, code }], active: 0 };
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
  const hash = await encodeFiles(files);
  if (hash === null) return showStatus("Ee browser me kai file wala link na ban sakela.");
  const url = `${location.origin}${location.pathname}#${hash}`;
  try {
    await navigator.clipboard.writeText(url);
    showStatus(files.length > 1 ? `Link copy ho gail (${files.length} file)!` : "Link copy ho gail!");
  } catch {
    window.prompt("Ee link copy kara:", url); // e.g. clipboard blocked by the browser
  }
}

/** Load files from a share link in the address. Returns true if there was one. */
async function openSharedLink() {
  const shared = await decodeFiles(location.hash);
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  if (shared === null) return false;
  setFiles(shared);
  examples.selectedIndex = -1; // it isn't one of the examples
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
  loadFile,
});

examples.addEventListener("change", () => loadExample(examples.value));
document.getElementById("share").addEventListener("click", share);
window.addEventListener("hashchange", openSharedLink);
document.getElementById("run").addEventListener("click", runCode);
document.getElementById("clear").addEventListener("click", () => output.replaceChildren());
editor.addEventListener("input", () => {
  files[active].code = editor.value;
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
    files[active].code = editor.value;
    paint();
    save();
  }
});

// A share link wins; then the files from last time; then the first example.
const openedLink = await openSharedLink();
const saved = restore();
if (!openedLink) {
  if (saved) setFiles(saved.files, Math.min(saved.active ?? 0, saved.files.length - 1));
  else await loadExample(EXAMPLES[0].file);
}

setUpLessons({
  setCode: (code) => {
    setMainCode(code);
    examples.selectedIndex = -1;
  },
  getCode: () => files[0].code,
  runCode,
  firstVisit: !saved && !openedLink,
});
