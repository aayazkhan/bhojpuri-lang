import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { program, out, assertError } from "./helpers.js";

describe("functions", () => {
  test("define, call and return", () => {
    assert.deepEqual(out(`kaam jodo(a, b) { lauta da a + b; }\nbol ho jodo(2, 3);`), ["5"]);
  });

  test("no return value gives khaali", () => {
    assert.deepEqual(out(`kaam kuchh() { bol ho "andar"; }\nbol ho kuchh();`), ["andar", "khaali"]);
    assert.deepEqual(out(`kaam jaldi() { lauta da; bol ho "kabhi na"; }\nbol ho jaldi();`), ["khaali"]);
  });

  test("recursion", () => {
    assert.deepEqual(
      out(`kaam fib(n) { jadi (n < 2) { lauta da n; } lauta da fib(n - 1) + fib(n - 2); }\nbol ho fib(15);`),
      ["610"],
    );
  });

  test("return from inside a loop", () => {
    assert.deepEqual(
      out(`kaam khoj(list, x) {\n  maan la i = 0;\n  jab le (i < lambai(list)) { jadi (list[i] == x) { lauta da i; } i += 1; }\n  lauta da -1;\n}\nbol ho khoj([5, 7, 9], 9), khoj([5], 1);`),
      ["2 -1"],
    );
  });

  test("closures keep their own state", () => {
    assert.deepEqual(
      out(`kaam counter() {\n  maan la n = 0;\n  kaam badhaw() { n += 1; lauta da n; }\n  lauta da badhaw;\n}\nmaan la a = counter(), b = counter();\na(); a();\nbol ho a(), b();`),
      ["3 1"],
    );
  });

  test("functions are values", () => {
    assert.deepEqual(
      out(`kaam dugna(x) { lauta da x * 2; }\nkaam lagaw(f, x) { lauta da f(x); }\nbol ho lagaw(dugna, 21), dugna;`),
      ["42 <kaam dugna>"],
    );
  });

  test("parameters are local", () => {
    assertError(program(`kaam f(x) { lauta da x; }\nf(1);\nbol ho x;`), { kind: "RuntimeError", match: /"x"/ });
  });

  test("errors: wrong arg count, not a function, return outside function", () => {
    assertError(program(`kaam f(a, b) {}\nf(1);`), { kind: "RuntimeError", line: 3, match: /2 cheez.*1 dihal/ });
    assertError(program(`maan la x = 5;\nx();`), { kind: "RuntimeError", match: /kaam na ha/ });
    assertError(program(`lauta da 1;`), { kind: "SyntaxError", match: /kaam/ });
    assertError(program(`kaam f(a, a) {}`), { kind: "SyntaxError", match: /"a"/ });
  });

  test("bas kara inside a function does not reach a loop outside it", () => {
    assertError(program(`jab le (sach) { kaam f() { bas kara; } }`), { kind: "SyntaxError" });
  });

  test("runaway recursion becomes a Bhojpuri error", () => {
    assertError(program(`kaam f(n) { lauta da f(n + 1); }\nf(0);`), { kind: "RuntimeError", line: 2, match: /recursion/ });
  });
});
