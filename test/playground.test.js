import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { encodeCode, decodeHash } from "../playground/share.js";
import { highlight } from "../playground/highlight.js";

// The text a browser would show for highlighted HTML.
const textOf = (html) => html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
// "[keyword:jadi] (x)" style, to compare colours easily.
const marks = (code) => highlight(code).replace(/<span class="tok-(\w+)">/g, "[$1:").replace(/<\/span>/g, "]");

describe("playground share links", () => {
  test("code survives the round trip, including Devanagari and emoji", async () => {
    const code = `ka ho bhaiya\n  maan la नाम = "राम 🙏";\n  bol ho \`Pranam {नाम}\`;\nchalat bani bhaiya`;
    const hash = await encodeCode(code);
    assert.match(hash, /^z=[A-Za-z0-9_-]+$/); // compressed and safe to put in an address
    assert.equal(await decodeHash("#" + hash), code);
    assert.equal(await decodeHash(hash), code);
  });

  test("every example fits in a short link", async () => {
    const dir = new URL("../examples/", import.meta.url);
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".bhoj"))) {
      const code = readFileSync(new URL(file, dir), "utf8");
      const hash = await encodeCode(code);
      assert.equal(await decodeHash(hash), code, file);
      assert.ok(hash.length < 2000, `${file}: ${hash.length} characters`);
    }
  });

  test("reads uncompressed links too", async () => {
    const plain = "code=" + Buffer.from("bol ho 1;").toString("base64url");
    assert.equal(await decodeHash("#" + plain), "bol ho 1;");
  });

  test("empty, unknown or damaged links give null", async () => {
    assert.equal(await decodeHash(""), null);
    assert.equal(await decodeHash("#"), null);
    assert.equal(await decodeHash("#section-2"), null);
    assert.equal(await decodeHash("#z=not-really-compressed"), null);
    const hash = await encodeCode("bol ho 1;");
    assert.equal(await decodeHash(hash.slice(0, -4)), null); // cut short
    assert.equal(await decodeHash("#code=" + Buffer.from([0xff, 0xfe]).toString("base64url")), null); // not UTF-8
  });

  test("large programs work", async () => {
    const code = "bol ho 1;\n".repeat(20000);
    assert.equal(await decodeHash(await encodeCode(code)), code);
  });
});

describe("playground code colours", () => {
  test("never changes the text, for every example and for broken code", () => {
    const dir = new URL("../examples/", import.meta.url);
    const samples = readdirSync(dir).filter((f) => f.endsWith(".bhoj")).map((f) => readFileSync(new URL(f, dir), "utf8"));
    samples.push(`bol ho "adha`, "/* band na", "bol ho `a {b", "x < y && a > b & c", "", "\n\n", "@#$ ₹ 🙏");
    for (const code of samples) assert.equal(textOf(highlight(code)), code);
  });

  test("keywords, literals, strings, numbers and comments", () => {
    assert.equal(
      marks(`jadi (x < 1) { bol ho "a", sach; } na ta jadi (y) {} // tippani`),
      '[keyword:jadi] (x &lt; [number:1]) { [keyword:bol ho] [string:"a"], [literal:sach]; } [keyword:na ta jadi] (y) {} [comment:// tippani]',
    );
  });

  test("se, tak, kadam and me only in a har loop header", () => {
    assert.equal(
      marks("har i = 1 se 10 tak kadam 2 { maan la me = se; }"),
      "[keyword:har] i = [number:1] [keyword:se] [number:10] [keyword:tak] [keyword:kadam] [number:2] { [keyword:maan la] me = se; }",
    );
    assert.equal(marks("har x l me {}"), "[keyword:har] x l [keyword:me] {}");
  });

  test("built-ins only when called, so a variable with the same name stays plain", () => {
    assert.equal(marks("chhaant(l); maan la lambai = 5; lambai (l)"), "[builtin:chhaant](l); [keyword:maan la] lambai = [number:5]; [builtin:lambai] (l)");
  });

  test("backtick strings colour their {…} parts as code", () => {
    assert.equal(
      marks("`Pranam {naam}, {lambai(\"ab\")} \\{x}`"),
      '[string:`Pranam ][punct:{]naam[punct:}][string:, ][punct:{][builtin:lambai]([string:"ab"])[punct:}][string: \\{x}`]',
    );
  });

  test("unfinished strings and comments are still coloured", () => {
    assert.equal(marks(`bol ho "adha\nbol ho 1;`), '[keyword:bol ho] [string:"adha]\n[keyword:bol ho] [number:1];');
    assert.equal(marks("/* band na\nbol ho 1;"), "[comment:/* band na\nbol ho 1;]");
  });

  test("words that only start with a keyword aren't keywords", () => {
    assert.equal(marks("maan la sachin = jadiya;"), "[keyword:maan la] sachin = jadiya;");
  });
});
