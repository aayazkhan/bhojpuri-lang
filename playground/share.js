// Share links keep the code after the "#" in the address, so it never reaches a server:
//   #z=<base64url of the deflate-compressed UTF-8 code>   (what the playground makes)
//   #code=<base64url of the UTF-8 code>                    (no compression, for old browsers)

const COMPRESSED = "z=";
const PLAIN = "code=";

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
