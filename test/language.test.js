import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { run, tokenize, Session, BhojpuriError, formatError } from "../src/index.js";

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

describe("har loops", () => {
  test("counts from one number to another, both included", () => {
    assert.deepEqual(out(`har i = 1 se 5 tak { bol ho i; }`), ["1", "2", "3", "4", "5"]);
    assert.deepEqual(out(`maan la n = 3;\nhar i = n - 1 se n * 2 tak { bol ho i; }`), ["2", "3", "4", "5", "6"]);
  });

  test("kadam sets the step, including counting down", () => {
    assert.deepEqual(out(`har i = 0 se 10 tak kadam 4 { bol ho i; }`), ["0", "4", "8"]);
    assert.deepEqual(out(`har i = 10 se 0 tak kadam -5 { bol ho i; }`), ["10", "5", "0"]);
    assert.deepEqual(out(`har i = 0 se 0.3 tak kadam 0.1 { bol ho i * 10; }`), ["0", "1", "2", "3"]);
  });

  test("runs zero times when the range is empty", () => {
    assert.deepEqual(out(`har i = 5 se 1 tak { bol ho i; }\nhar i = 1 se 5 tak kadam -1 { bol ho i; }\nbol ho "ho gail";`), ["ho gail"]);
  });

  test("visits each item of a list or letter of a string", () => {
    assert.deepEqual(out(`har phal ["aam", 2, sach] me { bol ho phal; }`), ["aam", "2", "sach"]);
    assert.deepEqual(out(`har c "ghar" me { bol ho c; }\nhar x [] me { bol ho x; }`), ["g", "h", "a", "r"]);
  });

  test("changing the list inside the loop doesn't change what is visited", () => {
    assert.deepEqual(out(`maan la l = [1, 2];\nhar x l me { daal(l, x * 10); }\nbol ho l;`), ["[1, 2, 10, 20]"]);
  });

  test("the bounds are read once, and changing the loop variable doesn't skip values", () => {
    assert.deepEqual(out(`maan la n = 3;\nhar i = 1 se n tak { n = 100; i += 10; bol ho i; }`), ["11", "12", "13"]);
  });

  test("bas kara and aage badha", () => {
    assert.deepEqual(
      out(`har i = 1 se 10 tak {\n  jadi (i % 2 == 0) { aage badha; }\n  jadi (i > 6) { bas kara; }\n  bol ho i;\n}`),
      ["1", "3", "5"],
    );
    assert.deepEqual(out(`har x [1, 2, 3] me { jadi (x == 2) { bas kara; } bol ho x; }`), ["1"]);
  });

  test("lauta da inside a loop returns from the function", () => {
    assert.deepEqual(
      out(`kaam khoj(list, x) {\n  har i = 0 se lambai(list) - 1 tak { jadi (list[i] == x) { lauta da i; } }\n  lauta da -1;\n}\nbol ho khoj([5, 7, 9], 9), khoj([5], 1);`),
      ["2 -1"],
    );
  });

  test("the loop variable only exists inside the loop, and each round gets its own", () => {
    assertError(program(`har i = 1 se 2 tak {}\nbol ho i;`), { kind: "RuntimeError", line: 3, match: /"i" naam ke koi variable na ba/ });
    assert.deepEqual(
      out(`maan la kaam_list = [];\nhar i = 1 se 3 tak {\n  kaam dekhaw() { lauta da i; }\n  daal(kaam_list, dekhaw);\n}\nbol ho kaam_list[0](), kaam_list[2]();`),
      ["1 3"],
    );
    assert.deepEqual(out(`maan la i = "bahar";\nhar i = 1 se 1 tak { bol ho i; }\nbol ho i;`), ["1", "bahar"]);
  });

  test("se, tak, kadam and me are still ordinary names outside a loop header", () => {
    assert.deepEqual(
      out(`maan la se = 1, tak = 3, kadam = 2, me = [7];\nhar i = se se tak tak kadam kadam { bol ho i; }\nhar x me me { bol ho x; }`),
      ["1", "3", "7"],
    );
  });

  test("nested loops", () => {
    assert.deepEqual(
      out(`har i = 1 se 2 tak { har j = 1 se 2 tak { bol ho i * j; } }`),
      ["1", "2", "2", "4"],
    );
  });

  test("errors: bad bounds, zero step, not a list, loop guard", () => {
    assertError(program(`har i = "1" se 5 tak {}`), { kind: "RuntimeError", match: /"se" ke baad sankhya chahi, lekin string/ });
    assertError(program(`har i = 1 se khaali tak {}`), { kind: "RuntimeError", match: /"tak" ke baad/ });
    assertError(program(`har i = 1 se 5 tak kadam 0 {}`), { kind: "RuntimeError", line: 2, match: /"kadam" 0 na ho sakela/ });
    assertError(program(`har x 5 me {}`), { kind: "RuntimeError", match: /list, string ya kosh pe chal sakela, number pe na/ });
    assert.throws(() => output(program(`har i = 1 se 1000 tak {}`), { maxLoopIterations: 10 }), /10 baar/);
  });

  test("syntax errors point at the missing word", () => {
    assertError(program(`har i = 1 se 5 {}`), { kind: "SyntaxError", match: /"tak" chahi/ });
    assertError(program(`har i = 1 tak 5 {}`), { kind: "SyntaxError", match: /"se" chahi/ });
    assertError(program(`har x [1] {}`), { kind: "SyntaxError", match: /"me" chahi/ });
    assertError(program(`har 5 se 1 tak {}`), { kind: "SyntaxError", match: /variable ke naam/ });
    assertError(program(`har i = 1 se 2 tak bol ho i;`), { kind: "SyntaxError", match: /"\{"/ });
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

  test("chhaant returns a new sorted list", () => {
    assert.deepEqual(
      out(`maan la l = [42, 7, 19, 3, 88, 1];\nbol ho chhaant(l), l;\nbol ho chhaant(["kela", "aam", "Zebra"]), chhaant([]), chhaant([2.5, -1, 2]);`),
      ["[1, 3, 7, 19, 42, 88] [42, 7, 19, 3, 88, 1]", '["Zebra", "aam", "kela"] [] [-1, 2, 2.5]'],
    );
    assertError(program(`bol ho chhaant([1, "a"]);`), { kind: "RuntimeError", match: /"chhaant" khali sab sankhya ya sab string .* number aur string/ });
    assertError(program(`bol ho chhaant([[1], [2]]);`), { kind: "RuntimeError", match: /"chhaant"/ });
    assertError(program(`bol ho chhaant("cba");`), { kind: "RuntimeError", match: /"chhaant" ke list chahi/ });
  });

  test("ulta reverses a list or string without changing the original", () => {
    assert.deepEqual(out(`maan la l = [1, 2, 3];\nbol ho ulta(l), l, ulta("ghar"), ulta([]);`), ["[3, 2, 1] [1, 2, 3] rahg []"]);
    assertError(program(`bol ho ulta(5);`), { kind: "RuntimeError", match: /"ulta" ke list ya string chahi/ });
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
    assertError(program(`bol ho khoj("abc", 1);`), { kind: "RuntimeError", match: /"khoj" ke string chahi/ });
  });

  test("kul adds up a list of numbers", () => {
    assert.deepEqual(out(`bol ho kul([30, 40, 120]), kul([]), kul([-1.5, 1]);`), ["190 0 -0.5"]);
    assertError(program(`bol ho kul([1, "2"]);`), { kind: "RuntimeError", match: /"kul" ke sankhya ke list chahi, lekin string bhi/ });
  });

  test("ba also checks lists and strings", () => {
    assert.deepEqual(out(`bol ho ba([1, 2], 2), ba([1, 2], "2"), ba("namaste", "mas"), ba("namaste", "x"), ba({ "a": 1 }, "a");`), ["sach jhooth sach jhooth sach"]);
    assertError(program(`bol ho ba(5, 1);`), { kind: "RuntimeError", match: /"ba" ke kosh, list ya string chahi/ });
    assertError(program(`bol ho ba("abc", 1);`), { kind: "RuntimeError", match: /"ba" ke string chahi/ });
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
      // Examples that ask questions get no answers, like a run with empty input.
      const lines = output(readFileSync(new URL(file, dir), "utf8"), { input: () => null });
      assert.ok(lines.length > 0);
    });
  }

  test("fizzbuzz output", () => {
    const lines = output(readFileSync(new URL("fizzbuzz.bhoj", dir), "utf8"));
    assert.deepEqual(lines, ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"]);
  });
});

describe("interactive prompt (Session)", () => {
  function session(options) {
    const printed = [];
    const s = new Session({ print: (line) => printed.push(line), ...options });
    return { s, printed, result: (source) => s.run(source).result };
  }

  test("shows the value of an expression, with strings in quotes", () => {
    const { result } = session();
    assert.equal(result("2 + 3 * 4"), "14");
    assert.equal(result(`"Ram" + "u"`), '"Ramu"');
    assert.equal(result(`[1, "a"]`), '[1, "a"]');
    assert.equal(result(`({ "a": 1 })`), '{"a": 1}');
    assert.equal(result("1 < 2"), "sach");
  });

  test("shows nothing for statements, assignments and khaali", () => {
    const { result, printed } = session();
    assert.equal(result(`maan la x = 1`), null);
    assert.equal(result(`x = 5`), null);
    assert.equal(result(`khaali`), null);
    assert.equal(result(`bol ho "namaste", x`), null);
    assert.deepEqual(printed, ["namaste 5"]);
  });

  test("the ; after the last statement is optional, and several statements can share a line", () => {
    const { result } = session();
    assert.equal(result(`maan la a = 2; maan la b = 3; a * b`), "6");
    assert.equal(result(`a;`), "2");
    assert.throws(() => result(`maan la c = 1 bol ho c`), /";" chahi/);
  });

  test("variables and functions carry over, and names can be declared again", () => {
    const { result } = session();
    result(`kaam dugna(x) {\n  lauta da x * 2;\n}`);
    result(`maan la n = 21`);
    assert.equal(result(`dugna(n)`), "42");
    result(`maan la n = "naya"`);
    assert.equal(result(`n`), '"naya"');
    result(`maan la lambai = 3`);
    assert.equal(result(`lambai`), "3");
  });

  test("an error doesn't end the session", () => {
    const { s, result } = session();
    assert.throws(() => result(`naam`), (err) => err instanceof BhojpuriError && /"naam" naam ke koi variable/.test(err.message));
    assert.throws(() => result(`bol ho (`), (err) => err.kind === "SyntaxError");
    result(`maan la naam = "Ramu"`);
    assert.equal(s.run(`naam`).exit, false);
    assert.equal(result(`naam`), '"Ramu"');
  });

  test("chalat bani bhaiya ends the session", () => {
    const { s } = session();
    assert.deepEqual(s.run(`chalat bani bhaiya`), { exit: true, result: null });
    assert.deepEqual(s.run(`  chalat   bani bhaiya  `), { exit: true, result: null });
    assert.throws(() => s.run(`chalat bani bhaiya 1`));
  });

  test("isComplete waits for open brackets and comments", () => {
    const { s } = session();
    assert.equal(s.isComplete(`kaam f() {`), false);
    assert.equal(s.isComplete(`kaam f() {\n  lauta da 1;`), false);
    assert.equal(s.isComplete(`kaam f() {\n  lauta da 1;\n}`), true);
    assert.equal(s.isComplete(`maan la l = [1,`), false);
    assert.equal(s.isComplete(`/* abhi likhat bani`), false);
    assert.equal(s.isComplete(`"band na bhail`), true); // run reports the unterminated string
    assert.equal(s.isComplete(`}`), true);
  });

  test("poochh and sanyog work at the prompt", () => {
    const { result } = session({ input: () => "24", random: () => 0 });
    assert.equal(result(`sankhya(poochh("Umar? ")) + 1`), "25");
    assert.equal(result(`sanyog(1, 6)`), "1");
  });
});

describe("cli", () => {
  const cli = new URL("../bin/bhojpuri.js", import.meta.url).pathname;
  const example = (file) => new URL(`../examples/${file}`, import.meta.url).pathname;
  const bhojpuri = (args, input = "") => spawnSync(process.execPath, [cli, ...args], { input, encoding: "utf8" });

  test("runs a file", () => {
    const result = bhojpuri([example("hello.bhoj")]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Pranam duniya/);
  });

  test("poochh reads lines from stdin, and gives khaali at the end", () => {
    const result = bhojpuri([example("andaaz.bhoj")], "0\n101\r\n");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Koshish 1: 0 chhota ba/);
    assert.match(result.stdout, /Koshish 2: 101 bada ba/);
    assert.match(result.stdout, /Koshish 3: \nThik ba, phir kabhi/);
  });

  test("reads UTF-8 answers and a last line without a newline", () => {
    const dir = mkdtempSync(join(tmpdir(), "bhojpuri-"));
    const file = join(dir, "sawal.bhoj");
    writeFileSync(file, `ka ho bhaiya\nbol ho poochh() + "|" + poochh() + "|" + poochh();\nchalat bani bhaiya`);
    try {
      const result = bhojpuri([file], "राम\nश्याम");
      assert.equal(result.status, 0);
      assert.equal(result.stdout, "राम|श्याम|khaali\n");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test("errors go to stderr with exit code 1", () => {
    const result = bhojpuri([example("andaaz.bhoj")], "das\n");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /"das" sankhya na ha/);
  });

  test("with no file, runs piped lines as an interactive session", () => {
    const lines = [
      "2 + 3 * 4",
      `maan la naam = "Ramu"`,
      "naam",
      "kaam dugna(x) {",
      "  lauta da x * 2;",
      "}",
      "dugna(21)",
      "naam[10]",
      `maan la umar = sankhya(poochh("Umar? "))`,
      "24",
      "umar + 1",
      "chalat bani bhaiya",
      `bol ho "ee na chali"`,
    ];
    const result = bhojpuri([], lines.join("\n") + "\n");
    assert.equal(result.status, 0);
    assert.equal(result.stdout, `14\n"Ramu"\n42\nUmar? 25\n`);
    assert.match(result.stderr, /Index 10 bahar ba/);
  });

  test("the session reports code left unfinished at the end of input", () => {
    const result = bhojpuri([], "kaam f() {\n");
    assert.equal(result.status, 0);
    assert.match(result.stderr, /"\}" chahi/);
  });

  test("--version and --help", () => {
    assert.equal(bhojpuri(["--version"]).stdout.trim(), JSON.parse(readFileSync(new URL("../package.json", import.meta.url))).version);
    assert.match(bhojpuri(["--help"]).stdout, /poochh\(…\)/);
  });
});
