// The playground's files: `main.bhoj` plus any others, which `le aaw` can bring in. Paths
// follow the same rules as the `bhojpuri` command: relative to the file that asks, and
// ".bhoj" is added when there's no extension.

export const MAIN = "main.bhoj";

// Letters (any script, with their vowel signs), digits, _ and -, with / between folders.
const NAME = /^[\p{L}\p{M}\p{N}_-]+(\/[\p{L}\p{M}\p{N}_-]+)*\.bhoj$/u;

/**
 * A tidy file name for what someone typed, like "lib/ganit" → "lib/ganit.bhoj",
 * or null if it can't be used (spaces, "..", a leading "/", another extension).
 */
export function cleanName(typed) {
  let name = typed.trim().replace(/^\.\//, "");
  if (!/\.[^/]*$/.test(name)) name += ".bhoj";
  return NAME.test(name) ? name : null;
}

/** Where `le aaw "path"` in the file `from` points, e.g. ("../ganit", "lib/x.bhoj") → "ganit.bhoj". */
export function resolvePath(path, from = MAIN) {
  const withExtension = /\.[^/]*$/.test(path) ? path : `${path}.bhoj`;
  // Resolve like a URL path, which handles "./" and "../" for us. URLs percent-encode letters
  // like Devanagari, so decode them back.
  return decodeURIComponent(new URL(withExtension, `file:///${from}`).pathname.slice(1));
}

/** A `loadFile` for the interpreter that finds files among the playground's tabs. */
export function makeLoader(getFiles) {
  return (path, from) => {
    const name = resolvePath(path, from ?? MAIN);
    const file = getFiles().find((f) => f.name === name);
    return file ? { id: name, name, source: file.code } : null;
  };
}

/** The paths a program brings in with `le aaw "..."`, in order. */
export function importsIn(code) {
  return [...code.matchAll(/\ble[ \t]+aaw[ \t]+(["'])(.*?)\1/g)].map((m) => m[2]);
}
