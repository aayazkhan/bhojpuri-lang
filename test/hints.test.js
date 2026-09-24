import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { editDistance, closestName } from "../src/suggest.js";
import { Session } from "../src/index.js";
import { program, assertError } from "./helpers.js";

describe("did-you-mean hints", () => {
  test("editDistance counts added, removed, changed and swapped letters", () => {
    assert.equal(editDistance("naam", "naam"), 0);
    assert.equal(editDistance("naam", "naamm"), 1); // added
    assert.equal(editDistance("naamm", "naam"), 1); // removed
    assert.equal(editDistance("naam", "neam"), 1); // changed
    assert.equal(editDistance("jdoo", "jodo"), 1); // swapped
    assert.equal(editDistance("kitten", "sitting"), 3);
    assert.equal(editDistance("abc", "xyz", 1), 2); // stops early, past the limit
  });

  test("closestName picks a likely typo, and nothing for short or distant names", () => {
    assert.equal(closestName("naam", ["umar", "naamm", "gaon"]), "naamm");
    assert.equal(closestName("Umar", ["umar"]), "umar"); // capitals don't count
    assert.equal(closestName("y", ["x"]), null); // short names only for capitals
    assert.equal(closestName("X", ["x"]), "x");
    assert.equal(closestName("bilkul_alag", ["naam", "umar"]), null);
    assert.equal(closestName("jodoo", ["jodo", "jodoa"]), "jodo"); // first of equals wins
    assert.equal(closestName("naam", []), null);
  });

  test("a misspelled variable, function or built-in gets a hint", () => {
    assertError(program(`maan la naamm = 1;\nbol ho naam;`), { kind: "RuntimeError", line: 3, match: /^"naam" naam ke koi variable na ba\. Kahin "naamm" ta na\?$/ });
    assertError(program(`kaam jodo(a, b) { lauta da a + b }\nbol ho jdoo(1, 2);`), { match: /Kahin "jodo" ta na\?/ });
    assertError(program(`bol ho lambaai("ab");`), { match: /Kahin "lambai" ta na\?/ });
    assertError(program(`maan la umar = 1;\nbol ho Umar;`), { match: /Kahin "umar" ta na\?/ });
  });

  test("the nearest scope's name is suggested first", () => {
    assertError(program(`maan la umar = 1;\nkaam f(umra) { lauta da umr }\nf(2);`), { match: /Kahin "umra" ta na\?/ });
  });

  test("without a close match, the old advice stays", () => {
    assertError(program(`bol ho bilkul_alag;`), { match: /Pahile "maan la bilkul_alag" likh ke banaw/ });
    assertError(program(`maan la x = 1;\nbol ho y;`), { match: /Pahile "maan la y"/ });
  });

  test("a misspelled kosh key gets a hint too", () => {
    assertError(program(`maan la d = { "naam": "Ramu", "gaon": "Ballia" };\nbol ho d["gaaon"];`), { match: /^Kosh me "gaaon" chaabi na ba\. Kahin "gaon" ta na\?$/ });
    assertError(program(`maan la d = { "naam": 1 };\nbol ho d["phone"];`), { match: /Pahile "ba\(kosh, chaabi\)"/ });
    assertError(program(`maan la d = { 1: "ek" };\nbol ho d[2];`), { match: /Kosh me 2 chaabi na ba\. Pahile/ });
  });

  test("hints work at the interactive prompt", () => {
    const s = new Session({ print: () => {} });
    s.run(`maan la naamm = "Sita"`);
    assert.throws(() => s.run(`naam`), /Kahin "naamm" ta na\?/);
  });
});
