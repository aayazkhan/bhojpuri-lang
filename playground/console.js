import { Session, BhojpuriError, formatError } from "../src/index.js";
import { highlight } from "./highlight.js";

// The console panel: the interactive prompt (like running `bhojpuri` with no file), in the page.

const PROMPT = "bhojpuri> ";
const MORE = "...       ";
const MAX_LOOP_ITERATIONS = 100_000;

/**
 * @param {{ log: HTMLElement, input: HTMLTextAreaElement, prompt: HTMLElement, reset: HTMLElement }} elements
 */
export function setUpConsole({ log, input, prompt, reset }) {
  const history = [];
  let historyIndex = 0; // history.length means "the line being typed now"
  let draft = "";
  let session;
  // Printed by the line that is running now, since its last question: shown in the question box.
  let printedSinceQuestion = [];

  function addLine(className, text, html = false) {
    const line = document.createElement("div");
    line.className = className;
    if (html) line.innerHTML = text;
    else line.textContent = text;
    log.append(line);
    log.scrollTop = log.scrollHeight;
  }

  function start() {
    session = new Session({
      maxLoopIterations: MAX_LOOP_ITERATIONS,
      print: (line) => {
        printedSinceQuestion.push(line);
        addLine("console-out", line);
      },
      input: (question) => {
        const answer = window.prompt([...printedSinceQuestion.slice(-10), question || "poochh():"].join("\n"));
        printedSinceQuestion = [];
        addLine("console-out", question + (answer ?? "(khaali)"));
        return answer;
      },
    });
    log.replaceChildren();
    addLine("console-note", "Ek-ek line likh ke Enter dab. Variable aur kaam yaad rahela. Shift+Enter se nai line.");
  }

  function resize() {
    input.rows = Math.max(1, input.value.split("\n").length);
    prompt.textContent = input.value.split("\n").map((_, i) => (i === 0 ? PROMPT : MORE).trimEnd()).join("\n");
  }

  function submit() {
    const source = input.value;
    if (!source.trim()) return;

    source.split("\n").forEach((line, i) => {
      addLine("console-in", `<span class="console-prompt">${i === 0 ? PROMPT : MORE}</span>${highlight(line)}`, true);
    });
    if (history.at(-1) !== source) history.push(source);
    historyIndex = history.length;
    input.value = "";
    resize();
    printedSinceQuestion = [];

    try {
      const { exit, result } = session.run(source);
      if (exit) {
        addLine("console-note", "Session khatam. Naya session shuru bhail.");
        start();
      } else if (result !== null) {
        addLine("console-result", result);
      }
    } catch (err) {
      addLine("console-error", err instanceof BhojpuriError ? formatError(err, source) : String(err));
    }
  }

  function recall(step) {
    const next = historyIndex + step;
    if (next < 0 || next > history.length) return;
    if (historyIndex === history.length) draft = input.value;
    historyIndex = next;
    input.value = next === history.length ? draft : history[next];
    resize();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  input.addEventListener("keydown", (e) => {
    const beforeCaret = input.value.slice(0, input.selectionStart);
    const afterCaret = input.value.slice(input.selectionEnd);
    if (e.key === "Enter" && !e.shiftKey) {
      // Run it, unless a { ( [ or /* is still open: then carry on on a new line.
      if (session.isComplete(input.value)) {
        e.preventDefault();
        submit();
      } else {
        requestAnimationFrame(resize);
      }
    } else if (e.key === "ArrowUp" && !beforeCaret.includes("\n")) {
      e.preventDefault();
      recall(-1);
    } else if (e.key === "ArrowDown" && !afterCaret.includes("\n")) {
      e.preventDefault();
      recall(1);
    } else if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      input.setRangeText("  ", input.selectionStart, input.selectionEnd, "end");
    }
  });
  input.addEventListener("input", resize);
  log.addEventListener("click", () => {
    if (!window.getSelection()?.toString()) input.focus(); // don't steal a text selection
  });
  reset.addEventListener("click", () => {
    start();
    input.focus();
  });

  start();
  resize();
}
