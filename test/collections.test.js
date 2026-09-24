import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { program, out, assertError } from "./helpers.js";

describe("lists", () => {
  test("literals, indexing and printing", () => {
    assert.deepEqual(
      out(`maan la l = [1, "do", sach, khaali, [3]];\nbol ho l, l[1], l[4][0], [];`),
      ['[1, "do", sach, khaali, [3]] do 3 []'],
    );
  });

  test("trailing comma and multi-line literals", () => {
    assert.deepEqual(out(`maan la l = [\n  1,\n  2,\n];\nbol ho lambai(l);`), ["2"]);
  });

  test("index assignment and compound assignment", () => {
    assert.deepEqual(out(`maan la l = [1, 2, 3];\nl[0] = 10; l[2] += 5;\nbol ho l;`), ["[10, 2, 8]"]);
  });

  test("lists are shared by reference", () => {
    assert.deepEqual(
      out(`kaam badal(l) { l[0] = 99; }\nmaan la a = [1];\nbadal(a);\nbol ho a, a == a, [1] == [1];`),
      ["[99] sach jhooth"],
    );
  });

  test("built-ins: lambai, daal, nikaal", () => {
    assert.deepEqual(
      out(`maan la l = [];\ndaal(l, 1); daal(l, 2);\nbol ho l, lambai(l), lambai("namaste");\nbol ho nikaal(l), l, nikaal([]);`),
      ["[1, 2] 2 7", "2 [1] khaali"],
    );
  });

  test("string indexing", () => {
    assert.deepEqual(out(`maan la s = "ghar";\nbol ho s[0], s[3];`), ["g r"]);
  });

  test("built-in names can be shadowed", () => {
    assert.deepEqual(out(`maan la lambai = 5;\nbol ho lambai;`), ["5"]);
  });

  test("a list containing itself prints safely", () => {
    assert.deepEqual(out(`maan la l = [1];\ndaal(l, l);\nbol ho l;`), ["[1, [...]]"]);
  });

  test("errors: out of range, bad index, not indexable, strings are read-only", () => {
    assertError(program(`maan la l = [1];\nbol ho l[1];`), { kind: "RuntimeError", line: 3, match: /lambai khali 1/ });
    assertError(program(`bol ho [1][-1];`), { kind: "RuntimeError" });
    assertError(program(`bol ho [1][0.5];`), { kind: "RuntimeError", match: /pura sankhya/ });
    assertError(program(`bol ho 5[0];`), { kind: "RuntimeError", match: /number/ });
    assertError(program(`maan la s = "ab";\ns[0] = "x";`), { kind: "RuntimeError", match: /String/ });
    assertError(program(`daal(5, 1);`), { kind: "RuntimeError", match: /"daal"/ });
    assertError(program(`jodo(1) = 2;`), { kind: "SyntaxError" });
  });
});

describe("kosh (dictionaries)", () => {
  test("literals, reading, adding and changing keys", () => {
    assert.deepEqual(
      out(`maan la ramu = { "naam": "Ramu", "umar": 24 };\nbol ho ramu["naam"];\nramu["gaon"] = "Ballia";\nramu["umar"] += 1;\nbol ho ramu;`),
      ["Ramu", '{"naam": "Ramu", "umar": 25, "gaon": "Ballia"}'],
    );
  });

  test("empty, nested, trailing comma, multi-line and computed keys", () => {
    assert.deepEqual(
      out(`maan la k = "chaabi";\nmaan la d = {\n  k: 1,\n  "andar": { "list": [1, "2"] },\n};\nbol ho {}, d, d["andar"]["list"][1];`),
      ['{} {"chaabi": 1, "andar": {"list": [1, "2"]}} 2'],
    );
  });

  test("number and string keys stay different, and later duplicates win", () => {
    assert.deepEqual(out(`maan la d = { 1: "ek", "1": "one", 1: "EK" };\nbol ho d[1], d["1"], lambai(d);`), ["EK one 2"]);
  });

  test("keys keep the order they were added in", () => {
    assert.deepEqual(out(`maan la d = { "b": 1 };\nd["a"] = 2; d["b"] = 3;\nbol ho chaabi(d);`), ['["b", "a"]']);
  });

  test("lambai, chaabi, ba and hataw", () => {
    assert.deepEqual(
      out(`maan la d = { "a": 1, "b": 2 };\nbol ho lambai(d), chaabi(d), ba(d, "a"), ba(d, "z");\nbol ho hataw(d, "a"), hataw(d, "a"), d;`),
      ['2 ["a", "b"] sach jhooth', "1 khaali {\"b\": 2}"],
    );
  });

  test("har loops over the keys", () => {
    assert.deepEqual(
      out(`maan la daam = { "aalu": 30, "pyaaz": 40 };\nhar k daam me { bol ho k, daam[k]; }`),
      ["aalu 30", "pyaaz 40"],
    );
    assert.deepEqual(out(`maan la d = { "a": 1 };\nhar k d me { d["b"] = 2; bol ho k; }\nbol ho lambai(d);`), ["a", "2"]);
  });

  test("shared by reference, compared by identity, and a type of its own", () => {
    assert.deepEqual(
      out(`kaam badal(d) { d["x"] = 1; }\nmaan la a = {};\nbadal(a);\nbol ho a, a == a, {} == {}, kism(a), shabd(a);`),
      ['{"x": 1} sach jhooth kosh {"x": 1}'],
    );
  });

  test("counting words with a kosh", () => {
    assert.deepEqual(
      out(`maan la ginti = {};\nhar s tod("aam kela aam", " ") me {\n  jadi (ba(ginti, s)) { ginti[s] += 1; } na ta { ginti[s] = 1; }\n}\nbol ho ginti;`),
      ['{"aam": 2, "kela": 1}'],
    );
  });

  test("a kosh containing itself prints safely", () => {
    assert.deepEqual(out(`maan la d = {};\nd["khud"] = d;\nbol ho d;`), ['{"khud": {...}}']);
  });

  test("a { at the start of a statement is still a block", () => {
    assert.deepEqual(out(`{ maan la a = 1; bol ho a; }\nmaan la a = 2;\nbol ho a;`), ["1", "2"]);
  });

  test("errors: missing keys, bad keys, wrong types", () => {
    assertError(program(`maan la d = {};\nbol ho d["phone"];`), { kind: "RuntimeError", line: 3, match: /Kosh me "phone" chaabi na ba/ });
    assertError(program(`maan la d = {};\nd["n"] += 1;`), { kind: "RuntimeError", match: /"n" chaabi na ba/ });
    assertError(program(`bol ho {}[1];`), { kind: "RuntimeError", match: /Kosh me 1 chaabi na ba/ });
    assertError(program(`maan la d = { [1]: 2 };`), { kind: "RuntimeError", match: /chaabi string ya sankhya hoe ke chahi, lekin list/ });
    assertError(program(`maan la d = {};\nd[khaali] = 1;`), { kind: "RuntimeError", match: /lekin khaali/ });
    assertError(program(`bol ho ba({}, sach);`), { kind: "RuntimeError", match: /chaabi string ya sankhya/ });
    assertError(program(`bol ho chaabi([1]);`), { kind: "RuntimeError", match: /"chaabi" ke kosh chahi, lekin list/ });
    assertError(program(`bol ho hataw("a", "a");`), { kind: "RuntimeError", match: /"hataw" ke kosh chahi/ });
    assertError(program(`bol ho { "a" 1 };`), { kind: "SyntaxError", match: /":" chahi/ });
    assertError(program(`bol ho { "a": 1;`), { kind: "SyntaxError", match: /"\}" chahi/ });
  });
});
