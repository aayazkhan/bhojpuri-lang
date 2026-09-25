import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { run, Session, formatError } from "../src/index.js";

const program = (body) => `ka ho bhaiya\n${body}\nchalat bani bhaiya`;

/** Run `main` with an in-memory set of files for `le aaw`. Returns the output, or throws. */
function runWith(files, main = "main.bhoj") {
  const lines = [];
  const loadFile = (path) => {
    const name = path.endsWith(".bhoj") ? path : `${path}.bhoj`;
    return name in files ? { id: name, name, source: files[name] } : null;
  };
  run(files[main], { print: (line) => lines.push(line), loadFile, file: main });
  return lines;
}

/** The formatted error from running `main`. */
function errorWith(files, main = "main.bhoj") {
  try {
    runWith(files, main);
  } catch (err) {
    return formatError(err, files[main]);
  }
  assert.fail("expected an error");
}

describe("le aaw (using other files)", () => {
  test("brings in a file's top-level functions and variables", () => {
    const files = {
      "ganit.bhoj": program(`maan la PI = 3.14;\nkaam varg(n) { lauta da n * n }`),
      "main.bhoj": program(`le aaw "ganit.bhoj";\nbol ho varg(7), PI;`),
    };
    assert.deepEqual(runWith(files), ["49 3.14"]);
  });

  test(".bhoj can be left off, and functions keep using their own file's names", () => {
    const files = {
      "ganit.bhoj": program(`maan la guna = 3;\nkaam teen_guna(n) { lauta da n * guna }`),
      "main.bhoj": program(`le aaw "ganit";\nmaan la guna2 = 10;\nbol ho teen_guna(guna2);`),
    };
    assert.deepEqual(runWith(files), ["30"]);
  });

  test("each file runs once, however often it's brought in", () => {
    const files = {
      "ek.bhoj": program(`bol ho "ek chalal";\nkaam f() { lauta da 1 }`),
      "do.bhoj": program(`le aaw "ek";\nkaam g() { lauta da f() + 1 }`),
      "main.bhoj": program(`le aaw "ek";\nle aaw "do";\nle aaw "ek.bhoj";\nbol ho f(), g();`),
    };
    assert.deepEqual(runWith(files), ["ek chalal", "1 2"]);
  });

  test("errors inside a brought-in file name that file and show its line", () => {
    const files = {
      "kharab.bhoj": program(`kaam f() { lauta da 1 }\nbol ho sankhya("x");`),
      "main.bhoj": program(`le aaw "kharab";`),
    };
    assert.equal(
      errorWith(files),
      'Chalat samay galti (kharab.bhoj, line 3, col 15): "x" sankhya na ha, ekra ke sankhya na banawal ja sakela.\n  3 | bol ho sankhya("x");\n    |               ^',
    );
    const syntax = { "s.bhoj": program(`bol ho 1\nbol ho 2;`), "main.bhoj": program(`le aaw "s";`) };
    assert.match(errorWith(syntax), /^Likhai me galti \(s\.bhoj, line 3, col 1\)/);
    const template = { "t.bhoj": program("bol ho `a {anjaan}`;"), "main.bhoj": program(`le aaw "t";`) };
    assert.match(errorWith(template), /^Chalat samay galti \(t\.bhoj, line 2, col 12\): "anjaan"/);
    const unclosed = { "u.bhoj": program("bol ho `a {x`;"), "main.bhoj": program(`le aaw "u";`) };
    assert.match(errorWith(unclosed), /^Likhai me galti \(u\.bhoj, line 2, col 11\)/);
  });

  test("an error in a function from another file, called later, is labelled with that file", () => {
    const files = {
      "lib.bhoj": program(`kaam bhaag(a, b) {\n  lauta da a / b;\n}`),
      "main.bhoj": program(`le aaw "lib";\nbol ho bhaag(1, 0);`),
    };
    // The failing division is inside lib's function, so the error points there, not at main.
    assert.equal(
      errorWith(files),
      "Chalat samay galti (lib.bhoj, line 3, col 14): Zero se bhaag na dihal ja sakela.\n  3 |   lauta da a / b;\n    |              ^",
    );
  });

  test("files that bring each other in are an error", () => {
    const files = {
      "main.bhoj": program(`bol ho "main";\nle aaw "b";`),
      "b.bhoj": program(`le aaw "main";`),
    };
    assert.match(errorWith(files), /^Chalat samay galti \(b\.bhoj, line 2, col 1\): "main" ghuma-phira ke apna-aap ke le aawat ba/);
  });

  test("a name that already exists is a clash", () => {
    const files = {
      "ek.bhoj": program(`kaam f() { lauta da 1 }`),
      "main.bhoj": program(`kaam f() { lauta da 2 }\nle aaw "ek";`),
    };
    assert.match(errorWith(files), /"f" pahile se banal ba, aur "ek" bhi ek "f" det ba/);
  });

  test("missing files, no file loader, and a path that isn't a string", () => {
    assert.match(errorWith({ "main.bhoj": program(`le aaw "nahi_ba";`) }), /"nahi_ba" file na mil paail/);
    assert.throws(() => run(program(`le aaw "x";`), { print: () => {} }), /"le aaw" na chal sakela/);
    assert.throws(() => run(program(`le aaw ganit;`), { print: () => {} }), /file ke naam/);
  });

  test("works at the interactive prompt, bringing a file in once", () => {
    const printed = [];
    const session = new Session({
      print: (line) => printed.push(line),
      loadFile: (path) => ({ id: path, name: path, source: program(`bol ho "chalal";\nkaam f() { lauta da 5 }`) }),
    });
    session.run(`le aaw "lib"`);
    session.run(`le aaw "lib"`);
    assert.equal(session.run(`f()`).result, "5");
    assert.deepEqual(printed, ["chalal"]);
  });
});

describe("le aaw in the bhojpuri command", () => {
  test("paths are relative to the file that asks, wherever you run it from", () => {
    const dir = mkdtempSync(join(tmpdir(), "bhojpuri-"));
    try {
      writeFileSync(join(dir, "lib.bhoj"), program(`kaam dugna(x) { lauta da x * 2 }`));
      writeFileSync(join(dir, "main.bhoj"), program(`le aaw "lib";\nbol ho dugna(21);`));
      writeFileSync(join(dir, "kharab.bhoj"), program(`bol ho anjaan;`));
      writeFileSync(join(dir, "use.bhoj"), program(`le aaw "kharab";`));
      const cli = new URL("../bin/bhojpuri.js", import.meta.url).pathname;
      const ok = spawnSync(process.execPath, [cli, join(dir, "main.bhoj")], { cwd: tmpdir(), encoding: "utf8" });
      assert.equal(ok.stdout, "42\n");
      const bad = spawnSync(process.execPath, [cli, "use.bhoj"], { cwd: dir, encoding: "utf8" });
      assert.equal(bad.status, 1);
      assert.match(bad.stderr, /\(kharab\.bhoj, line 2, col 8\): "anjaan"/);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
