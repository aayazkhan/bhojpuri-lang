import { MAIN } from "./files.js";

// Share links keep the code after the "#" in the address, so it never reaches a server:
//   #z=<base64url of the deflate-compressed UTF-8 code>   (one file: what the playground makes)
//   #code=<base64url of the UTF-8 code>                    (one file, no compression, for old browsers)
//   #f=<base64url of the deflate-compressed JSON [{ name, code }, ...]>   (several files)

const COMPRESSED = "z=";
const PLAIN = "code=";
const FILES = "f=";

function toBase64Url(bytes) {
  let binary = "";
  // In chunks, because String.fromCharCode(...bytes) fails for very large arrays.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function pipe(bytes, transform) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * The part of a share link after "#", for this code.
 * @param {string} code
 */
export async function encodeCode(code) {
  const bytes = new TextEncoder().encode(code);
  if (typeof CompressionStream === "undefined") return PLAIN + toBase64Url(bytes);
  return COMPRESSED + toBase64Url(await pipe(bytes, new CompressionStream("deflate")));
}

/**
 * The part of a share link after "#", for all the playground's files. A lone main.bhoj uses the
 * one-file form, so its links look the same as before files existed.
 * @param {{ name: string, code: string }[]} files main.bhoj first
 */
export async function encodeFiles(files) {
  if (files.length === 1 && files[0].name === MAIN) return encodeCode(files[0].code);
  const bytes = new TextEncoder().encode(JSON.stringify(files.map(({ name, code }) => ({ name, code }))));
  if (typeof CompressionStream === "undefined") return null; // too long to share uncompressed
  return FILES + toBase64Url(await pipe(bytes, new CompressionStream("deflate")));
}

/**
 * The files in a share link's "#..." part (main.bhoj first), or null if there are none or
 * it's damaged. One-file links give just main.bhoj.
 * @param {string} hash e.g. location.hash
 */
export async function decodeFiles(hash) {
  const value = hash.replace(/^#/, "");
  if (!value.startsWith(FILES)) {
    const code = await decodeHash(hash);
    return code === null ? null : [{ name: MAIN, code }];
  }
  if (typeof DecompressionStream === "undefined") return null;
  try {
    const bytes = await pipe(fromBase64Url(value.slice(FILES.length)), new DecompressionStream("deflate"));
    const files = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    const valid = Array.isArray(files) && files.length > 0 && files[0].name === MAIN &&
      files.every((f) => typeof f?.name === "string" && typeof f?.code === "string");
    return valid ? files.map(({ name, code }) => ({ name, code })) : null;
  } catch {
    return null;
  }
}

/**
 * The code in a share link's "#..." part, or null if there is none or it's damaged.
 * @param {string} hash e.g. location.hash
 */
export async function decodeHash(hash) {
  const value = hash.replace(/^#/, "");
  try {
    if (value.startsWith(PLAIN)) return new TextDecoder("utf-8", { fatal: true }).decode(fromBase64Url(value.slice(PLAIN.length)));
    if (value.startsWith(COMPRESSED) && typeof DecompressionStream !== "undefined") {
      const bytes = await pipe(fromBase64Url(value.slice(COMPRESSED.length)), new DecompressionStream("deflate"));
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
  } catch {
    // A link that was cut short or edited by hand: fall back to the normal start page.
  }
  return null;
}
