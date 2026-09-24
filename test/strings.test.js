import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { Session } from "../src/index.js";
import { program, out, assertError } from "./helpers.js";

describe("text in strings (backtick strings)", () => {
  test("puts the value of each {expression} into the text", () => {
    assert.deepEqual(
      out(`maan la naam = "Ramu", umar = 24;\nbol ho \`Pranam {naam}, agila saal {umar + 1} ke ho jaiba\`;`),
      ["Pranam Ramu, agila saal 25 ke ho jaiba"],
    );
  });

  test("values are shown the way bol ho shows them", () => {
    assert.deepEqual(
      out(`bol ho \`{sach} {khaali} {[1, "a"]} {{ "k": 2 }} {1.5}\`;`),
      ['sach khaali [1, "a"] {"k": 2} 1.5'],
    );
  });

  test("any expression works: calls, indexes, nested strings and templates", () => {
    assert.deepEqual(
      out(`maan la l = [10, 20];\nkaam dugna(x) { lauta da x * 2; }\nbol ho \`{dugna(l[1])} {bada("ok")} {"}"} {\`andar {l[0]}\`}\`;`),
      ["40 OK } andar 10"],
    );
  });

  test("a backtick string is a normal string value", () => {
    assert.deepEqual(out(`maan la s = \`ab{1 + 1}\`;\nbol ho kism(s), lambai(s), s == "ab2", \`\` == "";`), ["shabd 3 sach sach"]);
  });

  test("escapes, and \\{ for a literal brace", () => {
    assert.deepEqual(out(`bol ho \`a\\tb \\{x\\} \\\` \\\\\`;`), ["a\tb {x} ` \\"]);
  });

  test("normal strings don't change: braces in them are just text", () => {
    assert.deepEqual(out(`maan la naam = 1;\nbol ho "{naam}", '{naam}';`), ["{naam} {naam}"]);
  });

  test("errors point inside the string", () => {
    assertError(program(`bol ho \`a {naam\`;`), { kind: "SyntaxError", line: 2, match: /"\{" band na bhail/ });
    assertError(program(`bol ho \`a {}\`;`), { kind: "SyntaxError", match: /"\{ \}" ke bhitar kuchh likh/ });
    assertError(program(`bol ho \`a {1 2}\`;`), { kind: "SyntaxError", match: /"\}" chahi rahe, lekin "2"/ });
    assertError(program(`bol ho \`abc;`), { kind: "SyntaxError", match: /String band na bhail/ });
    assert.throws(
      () => out(`  bol ho \`a {anjaan}\`;`),
      (err) => err.kind === "RuntimeError" && err.line === 2 && err.col === 14 && /"anjaan"/.test(err.message),
    );
  });

  test("works at the interactive prompt", () => {
    const s = new Session({ print: () => {} });
    s.run(`maan la naam = "Sita"`);
    assert.equal(s.run(`\`Pranam {naam}\``).result, '"Pranam Sita"');
  });
});
