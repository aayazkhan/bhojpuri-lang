import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { LESSONS, LANGUAGES, checkExercise } from "../playground/lessons.js";

// The code snippets in some lesson text, in order-independent form.
const codeIn = (html) => [...html.matchAll(/<code>(.*?)<\/code>/gs)].map((m) => m[1].replace(/\s+/g, " ")).sort();

describe("playground lessons (Sikh)", () => {
  test("there are lessons from bol ho up to koshish kara", () => {
    assert.ok(LESSONS.length >= 10);
    assert.match(LESSONS[0].example, /bol ho/);
    assert.match(LESSONS.at(-1).example, /koshish kara/);
  });

  for (const [i, lesson] of LESSONS.entries()) {
    test(`${i + 1}. ${lesson.title.en}: the example runs and the solution passes`, () => {
      const example = checkExercise(lesson.example, { expected: [], input: ["Ramu", "24"] });
      assert.equal(example.error, null);
      assert.ok(example.output.length > 0, "the example prints something");

      const solution = checkExercise(lesson.exercise.solution, lesson.exercise);
      assert.equal(solution.error, null);
      assert.ok(solution.ok, `solution printed ${JSON.stringify(solution.output)}`);

      // The exercise asks for something new: the example alone doesn't pass it.
      assert.equal(checkExercise(lesson.example, lesson.exercise).ok, false);
    });
  }

  test("every lesson is written in Bhojpuri and English", () => {
    assert.deepEqual(Object.keys(LANGUAGES), ["bho", "en"]);
    for (const lesson of LESSONS) {
      for (const text of [lesson.title, lesson.body, lesson.exercise.task]) {
        for (const language of Object.keys(LANGUAGES)) assert.ok(text[language]?.trim(), `${lesson.title.en}: ${language}`);
      }
      assert.notEqual(lesson.body.bho, lesson.body.en, `${lesson.title.en}: the Bhojpuri text is a translation`);
    }
  });

  test("both languages ask for exactly the same code in each exercise", () => {
    for (const lesson of LESSONS) {
      assert.deepEqual(codeIn(lesson.exercise.task.bho), codeIn(lesson.exercise.task.en), lesson.title.en);
    }
  });

  test("checking reports wrong output and errors", () => {
    const exercise = { expected: ["140"] };
    assert.deepEqual(checkExercise("ka ho bhaiya bol ho 70; chalat bani bhaiya", exercise), { ok: false, output: ["70"], error: null });
    const broken = checkExercise("ka ho bhaiya bol ho paisa; chalat bani bhaiya", exercise);
    assert.equal(broken.ok, false);
    assert.match(broken.error, /"paisa" naam ke koi variable/);
  });

  test("trailing spaces don't matter, but everything else does", () => {
    assert.equal(checkExercise(`ka ho bhaiya bol ho "140 "; chalat bani bhaiya`, { expected: ["140"] }).ok, true);
    assert.equal(checkExercise(`ka ho bhaiya bol ho 140; bol ho 1; chalat bani bhaiya`, { expected: ["140"] }).ok, false);
  });

  test("an endless loop is stopped, not hung", () => {
    const result = checkExercise("ka ho bhaiya jab le (sach) {} chalat bani bhaiya", { expected: [] });
    assert.equal(result.ok, false);
    assert.match(result.error, /Loop 100000 baar/);
  });
});
