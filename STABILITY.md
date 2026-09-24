# What stays stable

From version 1.0, Bhojpuri Lang follows [Semantic Versioning](https://semver.org/): a program that works
with 1.x keeps working with every later 1.x. This page says exactly what that promise covers.

Until 1.0 (versions 0.x), anything may still change between minor versions, and the
[changelog](CHANGELOG.md) says what did.

## Covered by the promise

These only change in a new **major** version (2.0, 3.0, …), and the changelog says how to update:

- **The language**
  - keywords: `ka ho bhaiya`, `maan la`, `jadi`, `har`, `koshish kara`, … (`KEYWORDS` in
    [src/keywords.js](src/keywords.js));
  - loop words: `se`, `tak`, `kadam`, `me` (`LOOP_WORDS`);
  - the syntax: statements, expressions, operators and their precedence, strings, backtick strings,
    comments, and where a `;` may be left out;
  - what each statement and operator does, including truthiness, `==` for lists and kosh, integer and
    decimal maths, and indexes starting at 0.
- **The built-in functions**: their names (`BUILTINS`), the arguments they take and what they return.
- **Output**: what `bol ho`, backtick strings, `shabd` and `jod` print for each kind of value, including
  decimals shown to 15 significant digits, lists as `[1, "a"]` and kosh as `{"k": 1}`.
- **Errors**: which situations are errors, whether each is a syntax error (`Likhai me galti`) or a runtime
  error (`Chalat samay galti`), and the line and column they point at. Also which runtime errors
  `koshish kara` can catch, and what `galti pe (g)` receives for a `phenk da`.
- **`le aaw`**: the path rules (relative to the file that asks, `.bhoj` optional), running each file
  once, and which names a file shares.
- **The `bhojpuri` command**:
  - `bhojpuri file.bhoj`, `bhojpuri` (the interactive prompt), `--help` and `--version`;
  - exit codes: `0` when the program finishes, `1` for an error or a file that can't be read;
  - `poochh` reading lines from stdin.
- **The library API**: everything exported from `@aayazk/bhojpuri-lang` (`src/index.js`), the documented
  `run()` options and `Session` methods, and the documented fields of `BhojpuriError`.
- **Playground share links**: every link made by a released version keeps opening in later versions.
- **Supported Node.js versions**: those in `engines` in `package.json` (18 and newer). Dropping one needs
  a major version.

## Not covered

These can change in any version, usually to get better:

- **The wording of error messages and hints.** Programs shouldn't depend on the exact text. Use the kind,
  line and column, or catch the error with `koshish kara`.
- **The playground**: its layout, lessons, examples and console.
- **The VS Code extension's** colours and scope names.
- **Anything not exported from `src/index.js`**: the files in `src/` are free to be reorganised.
- **Performance, and the playground's loop guard** (100,000 rounds).

## How things change

- **New built-in functions** may be added in any minor version (1.1, 1.2, …). Programs can reuse
  built-in names for their own variables and functions, so a new built-in can't break an existing
  program.
- **New keywords** are only added in a major version. A new keyword stops that word being usable as a
  name, and that would break programs. (This happened with `har` in 0.3.0 and `le aaw` in 0.6.0, before
  this promise.)
- **Renaming or removing** a keyword or built-in needs a major version. Where possible, the old name keeps
  working alongside the new one for the rest of the current major version.
- **Bug fixes** may change behaviour that was clearly wrong (a crash, or a result that contradicts the
  docs) in a patch or minor version. The changelog lists each one under *Fixed*.
- Anything described as *covered* above is documented in the [README](README.md). Behaviour that isn't
  documented anywhere isn't covered until it is.
