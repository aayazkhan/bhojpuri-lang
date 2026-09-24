import assert from "node:assert/strict";
import { run, BhojpuriError } from "../src/index.js";

export const program = (body) => `ka ho bhaiya\n${body}\nchalat bani bhaiya`;

export function output(source, options = {}) {
  const lines = [];
  run(source, { print: (line) => lines.push(line), ...options });
  return lines;
}

export const out = (body) => output(program(body));

export function assertError(source, { kind, line, match }) {
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
