import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { tokenize, BhojpuriError, formatError } from "../src/index.js";
import { program, output, out, assertError } from "./helpers.js";

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

describe("showing decimals", () => {
  test("decimals are shown to 15 significant digits", () => {
    assert.deepEqual(
      out(`bol ho 0.1 + 0.2, 0.1 * 3, 1 / 3, 10 / 4, -0.1 - 0.2, 123456789.123456789, 5, -7, 0.5;`),
      ["0.3 0.3 0.333333333333333 2.5 -0.3 123456789.123457 5 -7 0.5"],
    );
  });

  test("everywhere a number becomes text", () => {
    assert.deepEqual(
      out(`maan la x = 0.1 + 0.2;\nbol ho \`{x}\`, shabd(x), [x], "x=" + x, jod([x, 1.1 + 2.2], " "), { "k": x };`),
      ['0.3 0.3 [0.3] x=0.3 0.3 3.3 {"k": 0.3}'],
    );
  });

  test("only the display is rounded: the value and == are unchanged", () => {
    assert.deepEqual(out(`maan la x = 0.1 + 0.2;\nbol ho x == 0.3, x * 10 == 3.0000000000000004, gol(x * 10);`), ["jhooth sach 3"]);
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
