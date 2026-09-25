import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { program, output, out, assertError } from "./helpers.js";

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
    assertError(program(`har i = 1 se 2 tak {}\nbol ho i;`), { kind: "RuntimeError", line: 3, match: /"i" naam ke kauno variable na ba/ });
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
    assertError(program(`har i = "1" se 5 tak {}`), { kind: "RuntimeError", match: /"se" ke baad sankhya chahi, lekin shabd/ });
    assertError(program(`har i = 1 se khaali tak {}`), { kind: "RuntimeError", match: /"tak" ke baad/ });
    assertError(program(`har i = 1 se 5 tak kadam 0 {}`), { kind: "RuntimeError", line: 2, match: /"kadam" 0 na ho sakela/ });
    assertError(program(`har x 5 me {}`), { kind: "RuntimeError", match: /list, shabd ya kosh pe chal sakela, sankhya pe na/ });
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
