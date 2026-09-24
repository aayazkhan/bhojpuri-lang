import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Session, BhojpuriError } from "../src/index.js";
import { program, assertError } from "./helpers.js";

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

  test("the ; can also be left out just before a }", () => {
    const { result, printed } = session();
    assert.equal(result(`koshish kara { phenk da "oops" } galti pe (g) { bol ho "pakdail:", g }`), null);
    result(`jadi (1 < 2) { bol ho "haan" } na ta { bol ho "na" }`);
    result(`kaam dugna(x) { lauta da x * 2 }`);
    assert.equal(result(`dugna(4)`), "8");
    result(`har i = 1 se 3 tak { jadi (i == 2) { aage badha } bol ho i }`);
    assert.deepEqual(printed, ["pakdail: oops", "haan", "1", "3"]);
    assert.throws(() => result(`{ maan la a = 1 bol ho a }`), /";" chahi/);
  });

  test("files still need every ;", () => {
    assertError(program(`jadi (sach) { bol ho 1 }`), { kind: "SyntaxError", line: 2, match: /";" chahi rahe, lekin "\}"/ });
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
