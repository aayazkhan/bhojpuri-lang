import { LESSONS, LANGUAGES, checkExercise } from "./lessons.js";

// The lessons ("paath") panel above the editor: one lesson at a time, with its example and exercise.

const LESSON_KEY = "bhojpuri-lang:lesson";
const OPEN_KEY = "bhojpuri-lang:lesson-open";
const LANGUAGE_KEY = "bhojpuri-lang:lesson-language";

function load(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

/**
 * @param {{ setCode: (code: string) => void, getCode: () => string, runCode: () => void, firstVisit: boolean }} editor
 */
export function setUpLessons({ setCode, getCode, runCode, firstVisit }) {
  const $ = (id) => document.getElementById(id);
  const panel = $("lesson");
  const toggle = $("lesson-toggle");
  const result = $("lesson-result");
  let index = Math.min(Math.max(Number(load(LESSON_KEY)) || 0, 0), LESSONS.length - 1);
  let language = load(LANGUAGE_KEY) in LANGUAGES ? load(LANGUAGE_KEY) : "bho";
  const languageButton = $("lesson-language");

  function show(i) {
    index = i;
    store(LESSON_KEY, String(i));
    const lesson = LESSONS[i];
    $("lesson-count").textContent = `${i + 1} / ${LESSONS.length}`;
    $("lesson-title").textContent = `Paath ${i + 1}: ${lesson.title[language]}`;
    // Lesson text is our own static HTML from lessons.js, not user input.
    $("lesson-body").innerHTML = lesson.body[language];
    $("lesson-task").innerHTML = lesson.exercise.task[language];
    $("lesson").lang = language === "en" ? "en" : "bho";
    // The button offers the other language.
    const other = language === "en" ? "bho" : "en";
    languageButton.textContent = LANGUAGES[other];
    languageButton.title = other === "en" ? "Read the lessons in English" : "Paath Bhojpuri me padha";
    $("lesson-prev").disabled = i === 0;
    $("lesson-next").disabled = i === LESSONS.length - 1;
    result.replaceChildren();
    result.className = "lesson-result";
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    store(OPEN_KEY, open ? "1" : "0");
  }

  function check() {
    const { exercise } = LESSONS[index];
    const { ok, output, error } = checkExercise(getCode(), exercise);
    result.replaceChildren();
    const message = document.createElement("p");
    if (ok) {
      message.textContent = index < LESSONS.length - 1 ? "Sahi ba! 🎉 Agila paath pe chalal jaaw." : "Sahi ba! 🎉 Sab paath pura ho gail — shabaash!";
      result.className = "lesson-result ok";
      result.append(message);
      return;
    }
    result.className = "lesson-result wrong";
    message.textContent = error ? "Abhi na — code me galti ba:" : "Abhi na — output mel na khail:";
    result.append(message);
    const block = (label, text, className = "") => {
      const caption = document.createElement("span");
      caption.className = "label";
      caption.textContent = label;
      const pre = document.createElement("pre");
      pre.className = className;
      pre.textContent = text;
      result.append(caption, pre);
    };
    if (error) {
      block("Galti", error);
    } else {
      block("Tohar output", output.length ? output.join("\n") : "(kuchhu print na bhail)");
      block("Chahi", exercise.expected.join("\n"), "want");
    }
  }

  toggle.addEventListener("click", () => setOpen(panel.hidden));
  $("lesson-close").addEventListener("click", () => setOpen(false));
  $("lesson-prev").addEventListener("click", () => show(index - 1));
  $("lesson-next").addEventListener("click", () => show(index + 1));
  $("lesson-example").addEventListener("click", () => {
    setCode(LESSONS[index].example);
    runCode();
  });
  $("lesson-solution").addEventListener("click", () => setCode(LESSONS[index].exercise.solution));
  $("lesson-check").addEventListener("click", check);
  languageButton.addEventListener("click", () => {
    language = language === "en" ? "bho" : "en";
    store(LANGUAGE_KEY, language);
    show(index);
  });

  show(index);
  // Newcomers see the first lesson straight away; after that it remembers open or closed.
  setOpen(load(OPEN_KEY) === null ? firstVisit : load(OPEN_KEY) === "1");
}
