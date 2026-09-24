import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

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

  test("stops quietly when the reader of its output goes away", () => {
    const dir = mkdtempSync(join(tmpdir(), "bhojpuri-"));
    const file = join(dir, "bahut.bhoj");
    writeFileSync(file, `ka ho bhaiya\nhar i = 1 se 200000 tak { bol ho i; }\nchalat bani bhaiya`);
    try {
      const result = spawnSync("sh", ["-c", `"${process.execPath}" "${cli}" "${file}" | head -2`], { encoding: "utf8" });
      assert.equal(result.stdout, "1\n2\n");
      assert.equal(result.stderr, "");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test("errors go to stderr with exit code 1", () => {
    const dir = mkdtempSync(join(tmpdir(), "bhojpuri-"));
    const file = join(dir, "galti.bhoj");
    writeFileSync(file, `ka ho bhaiya\nbol ho "pahile";\nbol ho sankhya(poochh());\nchalat bani bhaiya`);
    try {
      const result = bhojpuri([file], "das\n");
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "pahile\n");
      assert.match(result.stderr, /line 3.*"das" sankhya na ha/);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  test("the guessing game survives an answer that isn't a number", () => {
    const result = bhojpuri([example("andaaz.bhoj")], "das\n");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /"das" sankhya na ha — ee koshish bekaar gail/);
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
