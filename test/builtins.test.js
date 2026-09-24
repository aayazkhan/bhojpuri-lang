import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { program, output, out, assertError } from "./helpers.js";

describe("standard library", () => {
  const withRandom = (random, body) => output(program(body), { random });

  test("sankhya turns text into a number", () => {
    assert.deepEqual(out(`bol ho sankhya("42") + 1, sankhya(" 3.5 "), sankhya("-7"), sankhya(9);`), ["43 3.5 -7 9"]);
  });

  test("sankhya rejects text that isn't a number", () => {
    assertError(program(`bol ho sankhya("abc");`), { kind: "RuntimeError", line: 2, match: /"abc" sankhya na ha/ });
    assertError(program(`bol ho sankhya("");`), { kind: "RuntimeError", match: /sankhya na ha/ });
    assertError(program(`bol ho sankhya("Infinity");`), { kind: "RuntimeError", match: /sankhya na ha/ });
    assertError(program(`bol ho sankhya([1]);`), { kind: "RuntimeError", match: /"sankhya" ke shabd chahi/ });
  });

  test("shabd turns any value into text", () => {
    assert.deepEqual(
      out(`bol ho shabd(12) + shabd(3), lambai(shabd(100)), shabd(sach), shabd(khaali), shabd(["a", 1]);`),
      ['123 3 sach khaali ["a", 1]'],
    );
  });

  test("kism names the type of a value", () => {
    assert.deepEqual(
      out(`kaam f() {}\nbol ho kism(1), kism("a"), kism([]), kism(sach), kism(khaali), kism(f), kism(lambai);`),
      ["sankhya shabd list sach/jhooth khaali kaam kaam"],
    );
  });

  test("gol rounds, neeche rounds down", () => {
    assert.deepEqual(out(`bol ho gol(2.4), gol(2.5), gol(-2.6), neeche(7 / 2), neeche(-0.5), neeche(4);`), ["2 3 -3 3 -1 4"]);
    assertError(program(`bol ho gol("2");`), { kind: "RuntimeError", match: /"gol" ke sankhya chahi/ });
    assertError(program(`bol ho neeche(khaali);`), { kind: "RuntimeError", match: /"neeche"/ });
  });

  test("sanyog picks a whole number in the range, inclusive", () => {
    assert.deepEqual(withRandom(() => 0, `bol ho sanyog(1, 6);`), ["1"]);
    assert.deepEqual(withRandom(() => 0.9999, `bol ho sanyog(1, 6);`), ["6"]);
    assert.deepEqual(withRandom(() => 0.5, `bol ho sanyog(-2, 2), sanyog(5, 5);`), ["0 5"]);
    const rolls = out(`maan la i = 0;\njab le (i < 200) { bol ho sanyog(1, 3); i += 1; }`);
    assert.deepEqual([...new Set(rolls)].sort(), ["1", "2", "3"]);
  });

  test("sanyog rejects bad ranges", () => {
    assertError(program(`bol ho sanyog(6, 1);`), { kind: "RuntimeError", match: /6 aur 1/ });
    assertError(program(`bol ho sanyog(1.5, 3);`), { kind: "RuntimeError", match: /pura sankhya/ });
    assertError(program(`bol ho sanyog(1);`), { kind: "RuntimeError", match: /"sanyog" 2 cheez/ });
  });

  test("bada and chhota change case", () => {
    assert.deepEqual(out(`bol ho bada("Ram ji"), chhota("PATNA"), bada("नाम");`), ["RAM JI patna नाम"]);
    assertError(program(`bol ho bada(5);`), { kind: "RuntimeError", match: /"bada" ke shabd chahi/ });
  });

  test("tod splits text, jod joins a list", () => {
    assert.deepEqual(
      out(`maan la l = tod("aalu,pyaaz,,sattu", ",");\nbol ho l, lambai(l), tod("abc", "");\nbol ho jod(["a", 1, sach], "-"), jod([], ","), jod(tod("1 2 3", " "), "+");`),
      ['["aalu", "pyaaz", "", "sattu"] 4 ["a", "b", "c"]', "a-1-sach  1+2+3"],
    );
    assertError(program(`bol ho tod("a,b", 1);`), { kind: "RuntimeError", match: /"tod" ke shabd chahi/ });
    assertError(program(`bol ho jod("ab", ",");`), { kind: "RuntimeError", match: /"jod" ke list chahi/ });
  });

  test("chhaant returns a new sorted list", () => {
    assert.deepEqual(
      out(`maan la l = [42, 7, 19, 3, 88, 1];\nbol ho chhaant(l), l;\nbol ho chhaant(["kela", "aam", "Zebra"]), chhaant([]), chhaant([2.5, -1, 2]);`),
      ["[1, 3, 7, 19, 42, 88] [42, 7, 19, 3, 88, 1]", '["Zebra", "aam", "kela"] [] [-1, 2, 2.5]'],
    );
    assertError(program(`bol ho chhaant([1, "a"]);`), { kind: "RuntimeError", match: /"chhaant" sirf sab sankhya ya sab shabd .* sankhya aur shabd/ });
    assertError(program(`bol ho chhaant([[1], [2]]);`), { kind: "RuntimeError", match: /"chhaant"/ });
    assertError(program(`bol ho chhaant("cba");`), { kind: "RuntimeError", match: /"chhaant" ke list chahi/ });
  });

  test("ulta reverses a list or string without changing the original", () => {
    assert.deepEqual(out(`maan la l = [1, 2, 3];\nbol ho ulta(l), l, ulta("ghar"), ulta([]);`), ["[3, 2, 1] [1, 2, 3] rahg []"]);
    assertError(program(`bol ho ulta(5);`), { kind: "RuntimeError", match: /"ulta" ke list ya shabd chahi/ });
  });

  test("hissa takes part of a list or string", () => {
    assert.deepEqual(
      out(`maan la l = [10, 20, 30, 40];\nbol ho hissa(l, 1, 3), hissa(l, 2), hissa(l, -1), hissa(l, 0, -1), hissa(l, 5), hissa(l, -10, 100), hissa("namaste", 0, 4);`),
      ['[20, 30] [30, 40] [40] [10, 20, 30] [] [10, 20, 30, 40] nama'],
    );
    assertError(program(`bol ho hissa([1], 0.5);`), { kind: "RuntimeError", match: /"hissa" ke pura sankhya chahi/ });
    assertError(program(`bol ho hissa([1]);`), { kind: "RuntimeError", match: /"hissa" 2 ya 3 cheez maange la, lekin 1/ });
  });

  test("khoj finds where an item or text first appears", () => {
    assert.deepEqual(out(`bol ho khoj([5, 7, 7], 7), khoj([5], 1), khoj([1, "1"], "1"), khoj("namaste", "ste"), khoj("abc", "z");`), ["1 -1 1 4 -1"]);
    assertError(program(`bol ho khoj("abc", 1);`), { kind: "RuntimeError", match: /"khoj" ke shabd chahi/ });
  });

  test("kul adds up a list of numbers", () => {
    assert.deepEqual(out(`bol ho kul([30, 40, 120]), kul([]), kul([-1.5, 1]);`), ["190 0 -0.5"]);
    assertError(program(`bol ho kul([1, "2"]);`), { kind: "RuntimeError", match: /"kul" ke sankhya ke list chahi, lekin shabd bhi/ });
  });

  test("ba also checks lists and strings", () => {
    assert.deepEqual(out(`bol ho ba([1, 2], 2), ba([1, 2], "2"), ba("namaste", "mas"), ba("namaste", "x"), ba({ "a": 1 }, "a");`), ["sach jhooth sach jhooth sach"]);
    assertError(program(`bol ho ba(5, 1);`), { kind: "RuntimeError", match: /"ba" ke kosh, list ya shabd chahi/ });
    assertError(program(`bol ho ba("abc", 1);`), { kind: "RuntimeError", match: /"ba" ke shabd chahi/ });
  });

  test("saaf trims spaces, tabs and newlines from both ends", () => {
    assert.deepEqual(out(`bol ho \`[{saaf("  Ramu \\t\\n")}]\`, \`[{saaf("a b")}]\`, \`[{saaf("   ")}]\`;`), ["[Ramu] [a b] []"]);
    assertError(program(`bol ho saaf(5);`), { kind: "RuntimeError", match: /"saaf" ke shabd chahi/ });
  });

  test("jagah replaces every match", () => {
    assert.deepEqual(
      out(`bol ho jagah("aam aam kela", "aam", "seb"), jagah("a.b.c", ".", ""), jagah("abc", "z", "y"), jagah("नमस्ते", "स्ते", "स्कार");`),
      ["seb seb kela abc abc नमस्कार"],
    );
    assertError(program(`bol ho jagah("abc", "", "x");`), { kind: "RuntimeError", match: /"jagah" ke khoje wala text khaali/ });
    assertError(program(`bol ho jagah("abc", "a", 1);`), { kind: "RuntimeError", match: /"jagah" ke shabd chahi, lekin sankhya/ });
  });

  test("shuru_me and ant_me check the start and end", () => {
    assert.deepEqual(
      out(`bol ho shuru_me("Dr Ramu", "Dr"), shuru_me("Ramu", "Dr"), ant_me("file.bhoj", ".bhoj"), ant_me("file.txt", ".bhoj"), shuru_me("x", "");`),
      ["sach jhooth sach jhooth sach"],
    );
    assertError(program(`bol ho ant_me(["a"], "a");`), { kind: "RuntimeError", match: /"ant_me" ke shabd chahi, lekin list/ });
  });

  test("new built-in names can be shadowed", () => {
    assert.deepEqual(out(`kaam jod(a, b) { lauta da a + b; }\nmaan la gol = "round";\nbol ho jod(2, 3), gol;`), ["5 round"]);
  });
});

describe("poochh (input)", () => {
  // Answers the questions in order, then khaali; remembers what was asked.
  function answering(...answers) {
    const asked = [];
    const input = (question) => {
      asked.push(question);
      return answers.length ? answers.shift() : null;
    };
    return { asked, input };
  }

  test("returns the typed answer as text", () => {
    const { asked, input } = answering("Ramu", "24");
    const lines = output(program(`maan la naam = poochh("Naam? ");\nmaan la umar = poochh("Umar? ");\nbol ho naam, kism(umar), sankhya(umar) + 1;`), { input });
    assert.deepEqual(lines, ["Ramu shabd 25"]);
    assert.deepEqual(asked, ["Naam? ", "Umar? "]);
  });

  test("the question is optional, and any value is shown as text", () => {
    const { asked, input } = answering("a", "b");
    assert.deepEqual(output(program(`bol ho poochh(), poochh(42);`), { input }), ["a b"]);
    assert.deepEqual(asked, ["", "42"]);
  });

  test("gives khaali when there is nothing more to read", () => {
    const { input } = answering("ek");
    assert.deepEqual(output(program(`bol ho poochh("1? "), poochh("2? "), poochh("2? ") == khaali;`), { input }), ["ek khaali sach"]);
  });

  test("answers that aren't strings are turned into text", () => {
    assert.deepEqual(output(program(`bol ho kism(poochh()), poochh();`), { input: () => 7 }), ["shabd 7"]);
  });

  test("errors: no input available, too many arguments", () => {
    assertError(program(`poochh("Naam? ");`), { kind: "RuntimeError", line: 2, match: /"poochh" ke jawab dewe wala koi na ba/ });
    assertError(program(`poochh("a", "b");`), { kind: "RuntimeError", match: /"poochh" 0 ya 1 cheez maange la, lekin 2/ });
  });
});
