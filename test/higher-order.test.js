import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { program, out, assertError } from "./helpers.js";

describe("functions without names", () => {
  test("kaam(...) { ... } is a value", () => {
    assert.deepEqual(
      out(`maan la dugna = kaam(x) { lauta da x * 2 };\nbol ho dugna(21), dugna, kism(dugna);`),
      ["42 <kaam> kaam"],
    );
  });

  test("can be passed, returned and called straight away", () => {
    assert.deepEqual(
      out(`kaam jodne_wala(n) { lauta da kaam(x) { lauta da x + n } }\nbol ho jodne_wala(5)(10);\nbol ho (kaam(a, b) { lauta da a * b })(6, 7);`),
      ["15", "42"],
    );
  });

  test("keep their own variables (closures)", () => {
    assert.deepEqual(
      out(`maan la ginti = (kaam() { maan la n = 0; lauta da kaam() { n += 1; lauta da n } })();\nginti(); ginti();\nbol ho ginti();`),
      ["3"],
    );
  });

  test("return khaali without lauta da, and check their arguments", () => {
    assert.deepEqual(out(`bol ho (kaam() {})();`), ["khaali"]);
    assertError(program(`(kaam(x) { lauta da x })(1, 2);`), { kind: "RuntimeError", match: /"kaam" 1 cheez maange la, lekin 2/ });
  });

  test("kaam naam(...) still defines a named function", () => {
    assert.deepEqual(out(`kaam f(x) { lauta da x }\nbol ho f(1), f;`), ["1 <kaam f>"]);
    assertError(program(`kaam 5() {}`), { kind: "SyntaxError", match: /kaam ke naam ya "\(" chahi rahe, lekin "5"/ });
  });

  test("lauta da inside, bas kara not", () => {
    assertError(program(`jab le (sach) { maan la f = kaam() { bas kara } }`), { kind: "SyntaxError", match: /"bas kara" sirf/ });
    assertError(program(`maan la f = kaam(x, x) {};`), { kind: "SyntaxError", match: /"x" naam duu baar/ });
  });
});

describe("badal (map) and chhaan (filter)", () => {
  test("badal gives a new list with a kaam applied to every item", () => {
    assert.deepEqual(
      out(`maan la l = [1, 2, 3];\nbol ho badal(l, kaam(x) { lauta da x * 2 }), l, badal([], kaam(x) { lauta da x });`),
      ["[2, 4, 6] [1, 2, 3] []"],
    );
  });

  test("chhaan keeps the items the kaam says sach (or truthy) to", () => {
    assert.deepEqual(
      out(`maan la ank = [1, 2, 3, 4, 5, 6];\nbol ho chhaan(ank, kaam(x) { lauta da x % 2 == 0 }), chhaan(["aam", "", "kela"], kaam(s) { lauta da s }), ank;`),
      ['[2, 4, 6] ["aam", "kela"] [1, 2, 3, 4, 5, 6]'],
    );
  });

  test("named functions and built-ins work too, and they chain", () => {
    assert.deepEqual(
      out(`kaam dugna(x) { lauta da x * 2 }\nbol ho badal(["a", "b"], bada), jod(badal(chhaan([1, 2, 3, 4], kaam(x) { lauta da x > 2 }), dugna), "+");`),
      ['["A", "B"] 6+8'],
    );
  });

  test("errors inside the kaam, and wrong arguments", () => {
    assertError(program(`badal([1, 0], kaam(x) { lauta da 1 / x });`), { kind: "RuntimeError", match: /Zero se bhaag/ });
    assertError(program(`badal([1], 5);`), { kind: "RuntimeError", match: /"badal" ke kaam chahi, lekin sankhya/ });
    assertError(program(`chhaan("abc", bada);`), { kind: "RuntimeError", match: /"chhaan" ke list chahi/ });
    assertError(program(`badal([1], kaam(x, y) { lauta da x });`), { kind: "RuntimeError", match: /"kaam" 2 cheez maange la, lekin 1/ });
  });

  test("koshish kara catches errors from inside them", () => {
    assert.deepEqual(
      out(`koshish kara { badal([1], kaam(x) { phenk da "andar se" }); } galti pe (g) { bol ho g; }`),
      ["andar se"],
    );
  });
});
