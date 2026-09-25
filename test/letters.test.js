import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { letters, letterIndexOf } from "../src/text.js";
import { program, out, assertError } from "./helpers.js";

// These words group the same way on every Unicode version: a letter plus its vowel sign is one
// letter. (How conjuncts like स्ते are grouped depends on the Unicode version, so they aren't used.)
describe("text is counted in letters as people see them", () => {
  test("letters() groups a letter with its vowel signs, and emoji with their modifiers", () => {
    assert.deepEqual(letters("नाम"), ["ना", "म"]);
    assert.deepEqual(letters("किताब"), ["कि", "ता", "ब"]);
    assert.deepEqual(letters("👍🏽ok"), ["👍🏽", "o", "k"]);
    assert.deepEqual(letters("abc"), ["a", "b", "c"]);
    assert.deepEqual(letters(""), []);
  });

  test("letterIndexOf counts in letters, and a match inside a letter counts as that letter", () => {
    assert.equal(letterIndexOf("किताब", "ब"), 2);
    assert.equal(letterIndexOf("किताब", "ा"), 1); // the vowel sign inside ता
    assert.equal(letterIndexOf("किताब", "x"), -1);
    assert.equal(letterIndexOf("abc", ""), 0);
  });

  test("lambai, indexes and har ... me", () => {
    assert.deepEqual(
      out(`maan la s = "किताब";\nbol ho lambai(s), s[0], s[2], lambai("👍🏽");\nhar c "नाम" me { bol ho c; }`),
      ["3 कि ब 1", "ना", "म"],
    );
    assertError(program(`bol ho "नाम"[2];`), { kind: "RuntimeError", match: /Index 2 bahar ba — lambai sirf 2 ba/ });
  });

  test("ulta, hissa, khoj and tod work on whole letters", () => {
    assert.deepEqual(
      out(`maan la s = "किताब";\nbol ho ulta(s), hissa(s, 1), hissa(s, -1), khoj(s, "ब"), khoj(s, "ता"), tod("नाम", "");`),
      ['बताकि ताब ब 2 1 ["ना", "म"]'],
    );
  });

  test("English text behaves as before", () => {
    assert.deepEqual(
      out(`maan la s = "ghar";\nbol ho lambai(s), s[1], ulta(s), hissa(s, 1, 3), khoj(s, "ar"), tod("ab", ""), ba(s, "ha");`),
      ['4 h rahg ha 2 ["a", "b"] sach'],
    );
  });

  test("things that aren't about letters are unchanged", () => {
    assert.deepEqual(
      out(`bol ho ba("किताब", "ता"), jagah("किताब", "ता", "ती"), shuru_me("किताब", "कि"), "नाम" == "नाम", chhaant(["ख", "क"]);`),
      ['sach कितीब sach sach ["क", "ख"]'],
    );
  });
});
