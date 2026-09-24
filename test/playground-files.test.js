import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { run, formatError } from "../src/index.js";
import { MAIN, cleanName, resolvePath, makeLoader, importsIn } from "../playground/files.js";
import { encodeCode, encodeFiles, decodeFiles } from "../playground/share.js";

describe("playground files", () => {
  test("cleanName tidies typed names and refuses unusable ones", () => {
    assert.equal(cleanName("ganit"), "ganit.bhoj");
    assert.equal(cleanName("  lib/ganit.bhoj "), "lib/ganit.bhoj");
    assert.equal(cleanName("./madad"), "madad.bhoj");
    assert.equal(cleanName("गणित"), "गणित.bhoj");
    for (const bad of ["", "do shabd", "../bahar", "/root", "a//b", "notes.txt", "x!"]) assert.equal(cleanName(bad), null, bad);
  });

  test("resolvePath follows the same rules as the bhojpuri command", () => {
    assert.equal(resolvePath("ganit"), "ganit.bhoj");
    assert.equal(resolvePath("lib/ganit.bhoj"), "lib/ganit.bhoj");
    assert.equal(resolvePath("madad", "lib/ganit.bhoj"), "lib/madad.bhoj");
    assert.equal(resolvePath("../main", "lib/ganit.bhoj"), "main.bhoj");
    assert.equal(resolvePath("./x", MAIN), "x.bhoj");
    assert.equal(resolvePath("गणित", "lib/x.bhoj"), "lib/गणित.bhoj"); // not percent-encoded
  });

  test("importsIn finds le aaw paths", () => {
    assert.deepEqual(importsIn(`le aaw "lib/ganit.bhoj";\n  le  aaw 'madad';\nbol ho "le aaw";`), ["lib/ganit.bhoj", "madad"]);
  });

  test("a program can bring in another tab, and errors name that tab", () => {
    const files = [
      { name: MAIN, code: `ka ho bhaiya\n  le aaw "lib/ganit";\n  bol ho varg(7);\n  bol ho bhaag(1, 0);\nchalat bani bhaiya` },
      { name: "lib/ganit.bhoj", code: `ka ho bhaiya\n  le aaw "madad";\n  kaam varg(n) { lauta da n * n }\nchalat bani bhaiya` },
      { name: "lib/madad.bhoj", code: `ka ho bhaiya\n  kaam bhaag(a, b) {\n    lauta da a / b;\n  }\nchalat bani bhaiya` },
    ];
    const lines = [];
    try {
      run(files[0].code, { print: (l) => lines.push(l), loadFile: makeLoader(() => files), file: MAIN });
      assert.fail("expected an error");
    } catch (err) {
      assert.deepEqual(lines, ["49"]);
      assert.match(formatError(err, files[0].code), /^Chalat samay galti \(lib\/madad\.bhoj, line 3, col 16\): Zero se bhaag/);
    }
  });

  test("Devanagari file names work end to end", () => {
    const files = [
      { name: MAIN, code: `ka ho bhaiya
  le aaw "गणित";
  bol ho दुगुना(21);
chalat bani bhaiya` },
      { name: "गणित.bhoj", code: `ka ho bhaiya
  kaam दुगुना(x) { lauta da x * 2 }
chalat bani bhaiya` },
    ];
    const lines = [];
    run(files[0].code, { print: (l) => lines.push(l), loadFile: makeLoader(() => files), file: MAIN });
    assert.deepEqual(lines, ["42"]);
  });

  test("the loader sees files added later", () => {
    const files = [{ name: MAIN, code: "" }];
    const load = makeLoader(() => files);
    assert.equal(load("naya"), null);
    files.push({ name: "naya.bhoj", code: "x" });
    assert.deepEqual(load("naya", MAIN), { id: "naya.bhoj", name: "naya.bhoj", source: "x" });
  });
});

describe("share links with several files", () => {
  test("all files survive the round trip, main.bhoj first", async () => {
    const files = [
      { name: MAIN, code: `ka ho bhaiya\n  le aaw "lib/ganit";\nchalat bani bhaiya` },
      { name: "lib/ganit.bhoj", code: "ka ho bhaiya\n  maan la नाम = \"राम 🙏\";\nchalat bani bhaiya" },
    ];
    const hash = await encodeFiles(files);
    assert.match(hash, /^f=[A-Za-z0-9_-]+$/);
    assert.deepEqual(await decodeFiles("#" + hash), files);
  });

  test("a lone main.bhoj uses the old one-file link, and old links still open", async () => {
    const code = "ka ho bhaiya bol ho 1; chalat bani bhaiya";
    assert.equal(await encodeFiles([{ name: MAIN, code }]), await encodeCode(code));
    assert.deepEqual(await decodeFiles("#" + (await encodeCode(code))), [{ name: MAIN, code }]);
  });

  test("the example with two files makes a short link", async () => {
    const dir = new URL("../examples/", import.meta.url);
    const files = [
      { name: MAIN, code: readFileSync(new URL("hisaab.bhoj", dir), "utf8") },
      { name: "lib/ganit.bhoj", code: readFileSync(new URL("lib/ganit.bhoj", dir), "utf8") },
    ];
    const hash = await encodeFiles(files);
    assert.ok(hash.length < 2000, `${hash.length} characters`);
    assert.deepEqual(await decodeFiles(hash), files);
  });

  test("damaged or odd several-file links give null", async () => {
    const pack = async (value) => {
      const stream = new Blob([new TextEncoder().encode(JSON.stringify(value))]).stream().pipeThrough(new CompressionStream("deflate"));
      return "#f=" + Buffer.from(await new Response(stream).arrayBuffer()).toString("base64url");
    };
    assert.equal(await decodeFiles("#f=not-compressed"), null);
    assert.equal(await decodeFiles(await pack([])), null);
    assert.equal(await decodeFiles(await pack([{ name: "other.bhoj", code: "" }])), null); // main.bhoj must be first
    assert.equal(await decodeFiles(await pack([{ name: MAIN, code: 5 }])), null);
    assert.equal(await decodeFiles(await pack({ name: MAIN })), null);
  });
});
