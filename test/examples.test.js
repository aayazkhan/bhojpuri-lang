import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { output } from "./helpers.js";

describe("examples", () => {
  const dir = new URL("../examples/", import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".bhoj"))) {
    test(`${file} runs`, () => {
      // Examples that ask questions get no answers, like a run with empty input.
      // `le aaw` paths are relative to the examples folder.
      const loadFile = (path) => {
        const url = new URL(path.endsWith(".bhoj") ? path : `${path}.bhoj`, dir);
        return { id: url.href, name: path, source: readFileSync(url, "utf8") };
      };
      const lines = output(readFileSync(new URL(file, dir), "utf8"), { input: () => null, loadFile });
      assert.ok(lines.length > 0);
    });
  }

  test("fizzbuzz output", () => {
    const lines = output(readFileSync(new URL("fizzbuzz.bhoj", dir), "utf8"));
    assert.deepEqual(lines, ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"]);
  });
});
