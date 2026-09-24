import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { encodeCode, decodeHash } from "../playground/share.js";

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
