import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { program, output, out, assertError } from "./helpers.js";

describe("koshish kara / galti pe / phenk da", () => {
  test("catches a runtime error and gives its message", () => {
    assert.deepEqual(
      out(`koshish kara {\n  bol ho "pahile";\n  bol ho sankhya("das");\n  bol ho "ee na chhapi";\n} galti pe (g) {\n  bol ho "Pakdail:", g;\n}\nbol ho "aage";`),
      ["pahile", 'Pakdail: "das" sankhya na ha, ekra ke sankhya na banawal ja sakela.', "aage"],
    );
  });

  test("the block runs normally when nothing goes wrong", () => {
    assert.deepEqual(out(`koshish kara { bol ho 1; } galti pe (g) { bol ho "galti"; }`), ["1"]);
  });

  test("the name after galti pe is optional", () => {
    assert.deepEqual(out(`koshish kara { bol ho [][0]; } galti pe { bol ho "pakdail"; }`), ["pakdail"]);
  });

  test("phenk da throws any value, and galti pe gets it unchanged", () => {
    assert.deepEqual(
      out(`kaam bhugtaan(paisa) {\n  jadi (paisa < 100) { phenk da { "kod": 402, "sandesh": "Paisa kam ba" }; }\n  lauta da "ho gail";\n}\nkoshish kara {\n  bol ho bhugtaan(500);\n  bol ho bhugtaan(50);\n} galti pe (g) {\n  bol ho kism(g), g["kod"], g["sandesh"];\n}`),
      ["ho gail", "kosh 402 Paisa kam ba"],
    );
    assert.deepEqual(out(`koshish kara { phenk da 42; } galti pe (g) { bol ho g + 1; }`), ["43"]);
  });

  test("an uncaught phenk da stops the program with the value as the message", () => {
    assertError(program(`bol ho 1;\nphenk da "Kuchh gadbad ba";`), { kind: "RuntimeError", line: 3, match: /^Kuchh gadbad ba$/ });
    assertError(program(`phenk da [1, "a"];`), { kind: "RuntimeError", match: /^\[1, "a"\]$/ });
  });

  test("errors in the handler, or thrown again, go to the next koshish out", () => {
    assert.deepEqual(
      out(`koshish kara {\n  koshish kara { phenk da "andar"; } galti pe (g) { phenk da g + " → bahar"; }\n} galti pe (g) {\n  bol ho g;\n}`),
      ["andar → bahar"],
    );
    assertError(program(`koshish kara { phenk da 1; } galti pe (g) { bol ho anjaan; }`), { kind: "RuntimeError", match: /"anjaan"/ });
  });

  test("loops, functions and returns work through koshish and galti pe", () => {
    assert.deepEqual(
      out(`har i = 1 se 4 tak {\n  koshish kara {\n    jadi (i == 2) { phenk da i; }\n    jadi (i == 4) { bas kara; }\n    bol ho "i", i;\n  } galti pe (g) {\n    bol ho "chhod", g;\n    aage badha;\n  }\n}`),
      ["i 1", "chhod 2", "i 3"],
    );
    assert.deepEqual(out(`kaam f() { koshish kara { lauta da "andar"; } galti pe { lauta da "galti"; } }\nbol ho f();`), ["andar"]);
  });

  test("the error variable and variables inside the blocks stay inside", () => {
    assertError(program(`koshish kara { phenk da 1; } galti pe (g) {}\nbol ho g;`), { kind: "RuntimeError", line: 3, match: /"g" naam ke koi variable/ });
  });

  test("catches runaway recursion and the loop guard", () => {
    assert.deepEqual(out(`kaam anant(n) { lauta da anant(n + 1); }\nkoshish kara { anant(0); } galti pe { bol ho "pakdail"; }`), ["pakdail"]);
    assert.deepEqual(
      output(program(`koshish kara { jab le (sach) {} } galti pe (g) { bol ho "ruk gail"; }`), { maxLoopIterations: 100 }),
      ["ruk gail"],
    );
  });

  test("koshish, galti and phenk on their own are still ordinary names", () => {
    assert.deepEqual(out(`maan la koshish = 1, galti = 2, phenk = [3];\nbol ho koshish + galti + phenk[0];`), ["6"]);
  });

  test("syntax errors: missing galti pe, galti pe without koshish, missing block", () => {
    assertError(program(`koshish kara { bol ho 1; }\nbol ho 2;`), { kind: "SyntaxError", line: 3, match: /"galti pe" chahi/ });
    assertError(program(`galti pe { bol ho 1; }`), { kind: "SyntaxError", match: /"galti pe" se pahile "koshish kara"/ });
    assertError(program(`koshish kara bol ho 1;`), { kind: "SyntaxError", match: /"\{" chahi/ });
    assertError(program(`koshish kara {} galti pe (5) {}`), { kind: "SyntaxError", match: /variable ke naam/ });
    assertError(program(`phenk da;`), { kind: "SyntaxError", match: /koi value/ });
  });
});
