import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { run, tokenize, BhojpuriError, formatError } from "../src/index.js";

const program = (body) => `ka ho bhaiya\n${body}\nchalat bani bhaiya`;

function output(source, options = {}) {
  const lines = [];
  run(source, { print: (line) => lines.push(line), ...options });
  return lines;
}

const out = (body) => output(program(body));

function assertError(source, { kind, line, match }) {
  assert.throws(
    () => output(source),
    (err) => {
      assert.ok(err instanceof BhojpuriError, `expected BhojpuriError, got ${err}`);
      if (kind) assert.equal(err.kind, kind);
      if (line) assert.equal(err.line, line);
      if (match) assert.match(err.message, match);
      return true;
    },
  );
}

describe("basics", () => {
  test("prints strings, numbers and literals", () => {
    assert.deepEqual(out(`bol ho "Pranam";`), ["Pranam"]);
    assert.deepEqual(out(`bol ho 42, 3.5;`), ["42 3.5"]);
    assert.deepEqual(out(`bol ho sach, jhooth, khaali;`), ["sach jhooth khaali"]);
  });

  test("empty program is valid", () => {
    assert.deepEqual(output("ka ho bhaiya chalat bani bhaiya"), []);
  });

  test("comments are ignored", () => {
    const src = `// upar\nka ho bhaiya\n  /* bich\n me */ bol ho 1; // baad\nchalat bani bhaiya\n// ant`;
    assert.deepEqual(output(src), ["1"]);
  });

  test("string escapes and single quotes", () => {
    assert.deepEqual(out(`bol ho 'ka "ho"', "a\\tb";`), ['ka "ho" a\tb']);
  });

  test("keywords may be separated by extra spaces", () => {
    assert.deepEqual(output("ka  ho\tbhaiya bol   ho 1; chalat bani bhaiya"), ["1"]);
  });
});

describe("variables", () => {
  test("declare, multiple declarations, default khaali", () => {
    assert.deepEqual(out(`maan la a = 1, b = a + 1, c;\nbol ho a, b, c;`), ["1 2 khaali"]);
  });

  test("assignment and compound assignment", () => {
    assert.deepEqual(
      out(`maan la x = 10;\nx += 5; x -= 3; x *= 2; x /= 4; x %= 4;\nbol ho x;`),
      ["2"],
    );
  });

  test("identifiers that start with a keyword are not keywords", () => {
    assert.deepEqual(out(`maan la sachin = 1, jadiya = 2;\nbol ho sachin + jadiya;`), ["3"]);
  });

  test("Devanagari identifiers", () => {
    assert.deepEqual(out(`maan la नाम = "राम";\nbol ho नाम;`), ["राम"]);
  });

  test("block scoping and shadowing", () => {
    assert.deepEqual(
      out(`maan la a = 1;\n{ maan la a = 2; bol ho a; }\nbol ho a;`),
      ["2", "1"],
    );
    assertError(program(`{ maan la inner = 1; }\nbol ho inner;`), { kind: "RuntimeError", match: /inner/ });
  });

  test("inner blocks can update outer variables", () => {
    assert.deepEqual(out(`maan la a = 1;\n{ a = 5; }\nbol ho a;`), ["5"]);
  });
});

describe("expressions", () => {
  test("operator precedence", () => {
    assert.deepEqual(out(`bol ho 2 + 3 * 4, (2 + 3) * 4, 10 - 4 - 3, -2 * 3;`), ["14 20 3 -6"]);
  });

  test("comparison and equality", () => {
    assert.deepEqual(out(`bol ho 1 < 2, 2 <= 1, "a" < "b", 1 == 1, 1 != "1";`), ["sach jhooth sach sach sach"]);
  });

  test("string concatenation", () => {
    assert.deepEqual(out(`bol ho "umar: " + 20, "sahi: " + sach, "x" + khaali;`), ["umar: 20 sahi: sach xkhaali"]);
  });

  test("logical operators short-circuit and return operands", () => {
    assert.deepEqual(out(`bol ho khaali || "default", 0 && anjaan, !0, !"kuchh";`), ["default 0 sach jhooth"]);
  });
});

describe("control flow", () => {
  test("if / else if / else", () => {
    const check = (n) =>
      out(`maan la n = ${n};\njadi (n > 10) { bol ho "bada"; } na ta jadi (n > 5) { bol ho "beech"; } na ta { bol ho "chhota"; }`);
    assert.deepEqual(check(20), ["bada"]);
    assert.deepEqual(check(7), ["beech"]);
    assert.deepEqual(check(1), ["chhota"]);
  });

  test("while with break and continue", () => {
    assert.deepEqual(
      out(`maan la i = 0;\njab le (sach) {\n  i += 1;\n  jadi (i > 6) { bas kara; }\n  jadi (i % 2 == 0) { aage badha; }\n  bol ho i;\n}`),
      ["1", "3", "5"],
    );
  });

  test("break only exits the innermost loop", () => {
    assert.deepEqual(
      out(`maan la i = 0;\njab le (i < 2) {\n  i += 1;\n  maan la j = 0;\n  jab le (sach) { j += 1; jadi (j == 2) { bas kara; } }\n  bol ho i, j;\n}`),
      ["1 2", "2 2"],
    );
  });
});

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

describe("standard library", () => {
  const withRandom = (random, body) => output(program(body), { random });

  test("sankhya turns text into a number", () => {
    assert.deepEqual(out(`bol ho sankhya("42") + 1, sankhya(" 3.5 "), sankhya("-7"), sankhya(9);`), ["43 3.5 -7 9"]);
  });

  test("sankhya rejects text that isn't a number", () => {
    assertError(program(`bol ho sankhya("abc");`), { kind: "RuntimeError", line: 2, match: /"abc" sankhya na ha/ });
    assertError(program(`bol ho sankhya("");`), { kind: "RuntimeError", match: /sankhya na ha/ });
    assertError(program(`bol ho sankhya("Infinity");`), { kind: "RuntimeError", match: /sankhya na ha/ });
    assertError(program(`bol ho sankhya([1]);`), { kind: "RuntimeError", match: /"sankhya" ke string chahi/ });
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
    assertError(program(`bol ho bada(5);`), { kind: "RuntimeError", match: /"bada" ke string chahi/ });
  });

  test("tod splits text, jod joins a list", () => {
    assert.deepEqual(
      out(`maan la l = tod("aalu,pyaaz,,sattu", ",");\nbol ho l, lambai(l), tod("abc", "");\nbol ho jod(["a", 1, sach], "-"), jod([], ","), jod(tod("1 2 3", " "), "+");`),
      ['["aalu", "pyaaz", "", "sattu"] 4 ["a", "b", "c"]', "a-1-sach  1+2+3"],
    );
    assertError(program(`bol ho tod("a,b", 1);`), { kind: "RuntimeError", match: /"tod" ke string chahi/ });
    assertError(program(`bol ho jod("ab", ",");`), { kind: "RuntimeError", match: /"jod" ke list chahi/ });
  });

  test("new built-in names can be shadowed", () => {
    assert.deepEqual(out(`kaam jod(a, b) { lauta da a + b; }\nmaan la gol = "round";\nbol ho jod(2, 3), gol;`), ["5 round"]);
  });
});

describe("errors", () => {
  test("missing start / end / code after end", () => {
    assertError(`bol ho 1;`, { kind: "SyntaxError", match: /ka ho bhaiya/ });
    assertError(`ka ho bhaiya\nbol ho 1;`, { kind: "SyntaxError", match: /chalat bani bhaiya/ });
    assertError(`ka ho bhaiya chalat bani bhaiya bol ho 1;`, { kind: "SyntaxError" });
  });

  test("missing semicolon reports the right line", () => {
    assertError(program(`bol ho 1\nbol ho 2;`), { kind: "SyntaxError", line: 3, match: /";"/ });
  });

  test("undeclared and redeclared variables", () => {
    assertError(program(`x = 1;`), { kind: "RuntimeError", line: 2, match: /"x"/ });
    assertError(program(`maan la x = 1;\nmaan la x = 2;`), { kind: "RuntimeError", line: 3 });
  });

  test("break/continue outside a loop", () => {
    assertError(program(`bas kara;`), { kind: "SyntaxError", match: /jab le/ });
    assertError(program(`aage badha;`), { kind: "SyntaxError" });
  });

  test("else without if", () => {
    assertError(program(`na ta { bol ho 1; }`), { kind: "SyntaxError", match: /jadi/ });
  });

  test("keyword used as a variable name", () => {
    assertError(program(`maan la sach = 1;`), { kind: "SyntaxError", match: /variable/ });
  });

  test("invalid assignment target", () => {
    assertError(program(`5 = 3;`), { kind: "SyntaxError" });
  });

  test("runtime type errors and divide by zero", () => {
    assertError(program(`bol ho 1 / 0;`), { kind: "RuntimeError", match: /Zero/ });
    assertError(program(`bol ho "a" - 1;`), { kind: "RuntimeError", match: /"-"/ });
    assertError(program(`bol ho -"a";`), { kind: "RuntimeError" });
  });

  test("unterminated string/comment and unknown characters", () => {
    assertError(program(`bol ho "adhoora;`), { kind: "SyntaxError", line: 2 });
    assertError(program(`/* kabhi band na`), { kind: "SyntaxError" });
    assertError(program(`bol ho 1 @ 2;`), { kind: "SyntaxError", match: /"@"/ });
  });

  test("infinite loop guard", () => {
    assert.throws(
      () => output(program(`jab le (sach) {}`), { maxLoopIterations: 1000 }),
      (err) => err instanceof BhojpuriError && /1000/.test(err.message),
    );
  });

  test("formatError points at the column", () => {
    const src = program(`bol ho a;`);
    try {
      output(src);
      assert.fail("should throw");
    } catch (err) {
      assert.equal(formatError(err, src).split("\n").at(-1), "    | " + " ".repeat(7) + "^");
    }
  });
});

describe("tokenizer", () => {
  test("longest keyword wins", () => {
    const types = tokenize("na ta jadi na ta").map((t) => t.value);
    assert.deepEqual(types, ["ELSE_IF", "ELSE", null]);
  });
});

describe("examples", () => {
  const dir = new URL("../examples/", import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".bhoj"))) {
    test(`${file} runs`, () => {
      const lines = output(readFileSync(new URL(file, dir), "utf8"));
      assert.ok(lines.length > 0);
    });
  }

  test("fizzbuzz output", () => {
    const lines = output(readFileSync(new URL("fizzbuzz.bhoj", dir), "utf8"));
    assert.deepEqual(lines, ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"]);
  });
});
