import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { KEYWORDS, LOOP_WORDS, BUILTINS } from "../src/index.js";
import { grammarText } from "../scripts/build-vscode-grammar.js";

const extension = new URL("../editors/vscode/", import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, extension), "utf8"));

// Every regular expression in the grammar, found by walking the JSON.
function regexes(node, found = []) {
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (["match", "begin", "end"].includes(key)) found.push(value);
      else regexes(value, found);
    }
  }
  return found;
}

describe("VS Code extension", () => {
  test("the grammar is up to date with src/keywords.js", () => {
    const committed = readFileSync(new URL("syntaxes/bhojpuri.tmLanguage.json", extension), "utf8");
    assert.equal(committed, grammarText, "Run: node scripts/build-vscode-grammar.js");
  });

  test("every keyword, loop word and built-in is in the grammar", () => {
    for (const text of [...Object.values(KEYWORDS), ...Object.values(LOOP_WORDS), ...Object.values(BUILTINS)]) {
      const pattern = text.split(" ").join("[ \\\\t]+");
      assert.ok(grammarText.includes(pattern), `${text} is missing`);
    }
  });

  test("its regular expressions are valid", () => {
    const found = regexes(JSON.parse(grammarText));
    assert.ok(found.length > 10);
    for (const source of found) assert.doesNotThrow(() => new RegExp(source, "u"), source);
  });

  test("the manifest points at files that exist", () => {
    const manifest = readJson("package.json");
    const [language] = manifest.contributes.languages;
    const [grammar] = manifest.contributes.grammars;
    assert.deepEqual(language.extensions, [".bhoj"]);
    assert.equal(grammar.language, language.id);
    assert.equal(grammar.scopeName, JSON.parse(grammarText).scopeName);
    for (const path of [language.configuration, grammar.path]) assert.ok(existsSync(new URL(path, extension)), path);
    readJson(language.configuration); // valid JSON
  });
});
