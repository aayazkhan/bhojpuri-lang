# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-09-25

The first stable release. From now on, a program that works with 1.x keeps working with every later 1.x:
[STABILITY.md](STABILITY.md) says exactly what that covers. Changes since 0.7.0:

### Changed

- Text is counted in letters as people see them (Unicode grapheme clusters), so a Devanagari letter with
  its vowel signs, or an emoji with a skin tone, is one letter. Before, `lambai("नाम")` was 3; now it's 2,
  and `ulta`, indexes, `hissa`, `khoj`, `tod(text, "")` and `har … me` no longer split letters apart
  (`ulta("नमस्ते")` was `ेत्समन`). English text is unaffected. How some Devanagari conjuncts group
  follows the Unicode version of the browser or Node.js.

## [0.7.0] - 2026-09-24

### Added

- `STABILITY.md`: what stays the same from 1.0 on (keywords, built-ins, output, which situations are errors,
  the CLI, the library API, share links), what doesn't (message wording, the playground, the VS Code
  colours, internals), and how changes happen. In particular, new keywords only come in a major version.
- README: string escapes, the `bhojpuri` command and its exit codes, and every library export with the
  fields of `BhojpuriError`.
- `le aaw` in the playground: file tabs above the editor (`main.bhoj` plus any files added with
  **+ Naya file**, including folders like `lib/ganit.bhoj` and Devanagari names).
  - `le aaw` finds the other tabs using the same path rules as the CLI, and errors name the tab they
    come from.
  - **Chalaw** always runs `main.bhoj`, and the console can use `le aaw` too.
  - Share links carry every file. A single `main.bhoj` still makes the old kind of link, and old links
    still open.
  - Examples bring their extra files along, so `hisaab.bhoj` is now in the example list.
  - Code saved before this version becomes `main.bhoj`.

### Changed

- Error messages name types the way `kism` does: `sankhya`, `shabd`, `list`, `kosh`, `sach/jhooth`,
  `khaali` and `kaam`, instead of JavaScript's `number`, `string` and so on. For example:
  `"bada" ke shabd chahi, lekin sankhya mil gail.`
- In error messages, "only" is now `sirf` instead of `khali`, so it can't be mistaken for the keyword
  `khaali`. The message for an invalid assignment also mentions kosh keys (`d["k"]`).
- The lessons call `!` "nahi" (not), instead of "ulta", which is the name of the reverse built-in.
- Internal: the interpreter is split into smaller files. `src/values.js` holds the kinds of value and how
  they're shown, `src/scope.js` the variables, and `src/builtins.js` the built-in functions, grouped by topic.
  `src/interpreter.js` only runs statements and expressions. Behaviour is unchanged, and the tests are unchanged.

## [0.6.0] - 2026-09-24

### Added

- Functions without names: `kaam(x) { ... }` makes a function wherever a value is expected, e.g.
  `maan la dugna = kaam(x) { lauta da x * 2 };`. It can be passed, returned, stored and called straight away,
  and it keeps its surrounding variables like any function. `kaam naam(...)` still defines a named function.
- `le aaw "file.bhoj";` runs another file and makes its top-level functions and variables available.
  - Paths are relative to the file that asks, and `.bhoj` is optional.
  - Each file runs once; files that bring each other in, and name clashes, are errors.
  - Errors from another file's code name that file and show its line, even when one of its functions
    fails later.
  - It works in the CLI and the interactive prompt. Library users pass `loadFile` (and `file`) to `run()`.
  - Example: `examples/hisaab.bhoj` with `examples/lib/ganit.bhoj`.
- Did-you-mean hints: when a variable, function or built-in name isn't found but a similar one exists, the
  error suggests it, e.g. `"naam" naam ke koi variable na ba. Kahin "naamm" ta na?`. Missing kosh keys get
  the same hint. Short names (one or two letters) only get a hint for a difference in capitals.
- "Sikh" (learn) lessons in the playground: the **📘 Sikh** button opens 12 short lessons, from `bol ho` to
  `koshish kara`. Each has an explanation, an example that opens in the editor, and an exercise. **Jaanch
  kar** checks your output against the expected one (showing both when they differ), and **Jawab dekhaw**
  loads a solution. The panel opens for first-time visitors and remembers the current lesson.
- The Sikh lessons are written in Bhojpuri (Roman letters) as well as English. Bhojpuri is shown by
  default, and a button switches language (remembered). A test checks that both ask for the same code.
  The README starts with a short introduction in Bhojpuri.
- String helpers: `saaf` (trim spaces, tabs and newlines from both ends), `jagah(text, purana, naya)`
  (replace every match; an empty search text is an error), `shuru_me` and `ant_me` (starts / ends with).
- `badal(list, kaam)` (map: a new list with the `kaam` applied to every item) and `chhaan(list, kaam)`
  (filter: a new list of the items the `kaam` says `sach` to). Any function works, including built-ins.
- Issue templates: a bug report form (program, what happened, what you expected, where it ran, version)
  and an idea form, plus links to the playground and the language guide.

### Changed

- The `;` can be left out just before a `}` in files too (before, only at the interactive prompt), so short
  blocks like `jadi (x > 0) { bol ho "haan" }` and `kaam(x) { lauta da x * 2 }` work anywhere. Only more
  programs are accepted; two statements on one line still need a `;`.
- `bazaar.bhoj` uses `chhaan` and `badal`.
- Decimals are shown to 15 significant digits everywhere a number becomes text (`bol ho`, backtick strings,
  `shabd`, `jod`, `+` with a string, lists, kosh and the prompt), so `0.1 + 0.2` shows as `0.3`. Only the
  display is rounded: values and `==` are unchanged.

## [0.5.0] - 2026-09-24

### Added

- Text in strings: a string written with backticks can contain `{expression}`, and each expression's value
  is written into the text, e.g. `` `Pranam {naam}, agila saal {umar + 1}` ``. Values look the way `bol ho`
  shows them. `\{` is a literal brace. Errors inside `{ }` point at the exact line and column. `"..."` and
  `'...'` strings are unchanged.
- Playground share links: the **Baantaw 🔗** button copies a link with the code compressed into the part of
  the address after `#`, which never reaches a server. Opening the link loads that code into the editor.
  Damaged links are ignored.
- Coloured code in the playground editor: keywords, `sach`/`jhooth`/`khaali`, strings, numbers, comments and
  built-in calls each get a colour as you type. The `{…}` parts of backtick strings are coloured as code, and
  `se`/`tak`/`kadam`/`me` only inside a `har` header. Half-typed code is coloured too.
- Playground console: a panel under the editor that runs one line at a time, like `bhojpuri` with no file.
  Results, printed output and errors show in the log, and variables and functions carry over. Unclosed
  `{` `(` `[` continue on a `...` line (Shift+Enter always adds a line). ↑/↓ recall earlier lines, `poochh`
  uses the question box, and **Naya shuru** starts a fresh session.
- VS Code extension in `editors/vscode/` for `.bhoj` files:
  - colours for keywords, literals, strings, numbers, comments, built-in calls and function names, including
    the `{…}` in backtick strings and `se`/`tak`/`kadam`/`me` only in a `har` header;
  - comment toggling, bracket and quote closing, and indentation.
  Its grammar is generated from `src/keywords.js` by `scripts/build-vscode-grammar.js`, and a test checks it's
  up to date. Install by copying the folder into `~/.vscode/extensions/`.

### Changed

- The playground toolbar wraps on narrow screens instead of squeezing its buttons.
- `fibonacci.bhoj` and `andaaz.bhoj` use backtick strings instead of joining text with `+`.
- The tests are split by topic into `test/*.test.js` (language, loops, functions, collections, built-ins,
  catching errors, prompt, CLI, examples), with shared helpers in `test/helpers.js`. `npm test` runs
  `node --test test/*.test.js`.

## [0.4.1] - 2026-09-24

### Fixed

- At the interactive prompt, the `;` can now also be left out just before a `}`, so one-line blocks like
  `koshish kara { phenk da "oops" } galti pe (g) { bol ho g }` or `jadi (x > 0) { bol ho "haan" }` work.
  Before, only the `;` at the very end of the line was optional. `.bhoj` files still need every `;`.

## [0.4.0] - 2026-09-24

### Added

- `poochh(question)` asks a question and returns the typed answer as text, or `khaali` when there is
  nothing more to read. The question is optional. In the CLI it reads a line from stdin (piped input
  works too); in the playground it opens the browser's question box and shows what was printed since the
  last question.
- An `input` option for `run()` / `new Interpreter()` that answers `poochh`. Without it, `poochh` is a
  runtime error.
- Example `andaaz.bhoj`, a number-guessing game.
- CLI tests that run `bin/bhojpuri.js` with piped input.
- Interactive prompt: `bhojpuri` without a file opens a `bhojpuri>` prompt. Each line runs straight away,
  without `ka ho bhaiya`, and the last `;` is optional. Values are shown (strings in quotes), and variables
  and functions carry over between lines (`maan la` can be run again for the same name). Unclosed brackets
  continue on a `...` prompt. Errors don't end the session. The arrow keys recall earlier lines, Ctrl+C
  clears the line, and `chalat bani bhaiya` or Ctrl+D leaves. Piped lines run the same way, without
  prompts.
- `Session` in the library API (`run`, `isComplete`) for building your own prompt.
- List helpers: `chhaant` (a new sorted list), `ulta` (reverse a list or string), `hissa` (part of a list or
  string, with an optional end and negative indexes), `khoj` (index of an item or piece of text, or `-1`)
  and `kul` (sum of a list of numbers). `chhaant`, `ulta` and `hissa` don't change the original.
- Catching errors: `koshish kara { ... } galti pe (g) { ... }` runs the second block when a runtime error
  happens in the first, even inside a function it calls. `g` (optional) is the error message. `phenk da
  value;` throws your own error with any value, and `galti pe (g)` receives the value unchanged. An uncaught
  `phenk da` stops the program and shows the value. Syntax errors can't be caught.
- `ba` also works on lists (does it contain the item?) and strings (does it contain the text?).
- Built-in functions can take optional arguments. The error for a wrong number of arguments then says
  "2 ya 3".

### Changed

- The CLI writes output with `fs.writeSync` instead of `console.log`, so questions and answers stay in
  order. If the program reading its output stops early (e.g. `bhojpuri x.bhoj | head`), it exits quietly
  instead of crashing with a broken-pipe error.
- CI runs the examples with empty stdin, so examples that ask questions don't wait for input.
- `koshish kara`, `galti pe` and `phenk da` are keywords. The single words `koshish`, `galti` and `phenk`
  can still be used as names.
- `andaaz.bhoj` catches an answer that isn't a number instead of stopping.
- Examples: `chhatai.bhoj` compares its bubble sort with `chhaant`, and `bazaar.bhoj` uses `kul`, `khoj`,
  `chhaant` and `ulta`.
- `bhojpuri` with no arguments opens the interactive prompt, instead of printing help and exiting with
  code 1. Use `bhojpuri --help` for help. Errors from the CLI now go to stderr with `fs.writeSync`.

## [0.3.1] - 2026-09-24

### Changed

- The npm package is now `@aayazk/bhojpuri-lang`. npm doesn't accept `bhojpuri-lang` because it is too
  close to an existing package, `bhojpurilang`. The command it installs is still `bhojpuri`. Install
  with `npm install -g @aayazk/bhojpuri-lang`, or run a file with `npx @aayazk/bhojpuri-lang file.bhoj`.
- `publishConfig.access` is set to `public` so `npm publish` publishes the scoped package publicly.
- README: new Install section, and the library example imports from `@aayazk/bhojpuri-lang`.

## [0.3.0] - 2026-09-24

### Added

- Standard library built-ins: `sankhya` (text to number), `shabd` (any value to text), `kism` (type of a
  value), `gol` (round), `neeche` (round down), `sanyog` (random whole number in a range), `bada` / `chhota`
  (upper / lower case), `tod` (split text) and `jod` (join a list). Wrong kinds of values give a clear
  Bhojpuri error, for example `sankhya("abc")`. Like the other built-ins, the names can be reused.
- A `random` option for `run()` / `new Interpreter()` that replaces `Math.random` for `sanyog`, so
  programs that use it can be tested.
- Example `paasa.bhoj` (a dice game) that uses the new built-ins.
- `har` loops: `har i = 1 se 10 tak { }` counts with both ends included, `kadam` sets the step
  (`har i = 10 se 0 tak kadam -2`), and `har x list me { }` visits each item of a list or letter of a
  string. `bas kara` and `aage badha` work inside them. The loop variable only exists inside the loop, and
  the bounds (or the list) are read once before the loop starts. Values from a fractional `kadam` are
  rounded to 15 significant digits so they print cleanly.
- `se`, `tak`, `kadam` and `me` are only special inside a `har` header, so they can still be used as names.
  They are listed in `LOOP_WORDS` in `src/keywords.js`, which `src/index.js` also exports.

- Dictionaries (`kosh`): `{ "naam": "Ramu", "umar": 24 }` literals (a trailing comma is allowed), reading
  with `d["naam"]`, and adding or changing keys with `d["gaon"] = "Ballia"` / `d["umar"] += 1`. Keys can be
  strings or numbers and keep the order they were added in. Reading a missing key is an error.
  `lambai` counts the keys, `kism` returns `kosh`, and `har k d me { }` loops over the keys.
- Built-ins for dictionaries: `chaabi` (list of keys), `ba` (does a key exist?) and `hataw` (remove a key).
- Example `ginti.bhoj`, which counts words with a kosh.

### Changed

- `har` is now a keyword, so it can no longer be used as a variable name.
- The examples that counted by hand with `jab le` (`pahada`, `fizzbuzz`, `chhatai`, `fibonacci`, `bazaar`,
  `paasa`) now use `har`. In `bazaar.bhoj`, the helper `jod` is renamed `kul_jor` so it no longer shares a
  name with the built-in `jod`.
- The error for `bas kara` / `aage badha` outside a loop now mentions both `jab le` and `har`.

## [0.2.0] - 2026-09-24

### Added

- Functions: `kaam naam(a, b) { ... }` and `lauta da` (return). Functions support recursion and closures,
  and they are values that can be passed to or returned from other functions.
- Lists: `[1, 2, 3]` literals (a trailing comma is allowed), indexing `l[0]` (strings too), and index
  assignment `l[0] = 5` / `l[0] += 1`.
- Built-in functions `lambai` (length), `daal` (push) and `nikaal` (pop). Their names can be shadowed.
- Clear errors for a wrong number of arguments, calling something that isn't a function, `lauta da`
  outside a function, bad or out-of-range indexes, changing a string, and runaway recursion (reported
  instead of crashing with a JavaScript stack overflow).
- Examples `fibonacci.bhoj`, `bazaar.bhoj` and `chhatai.bhoj` (bubble sort). The playground and
  `bhojpuri --help` list the built-in functions.
- The playground is published with GitHub Pages at https://aayazkhan.github.io/bhojpuri-lang/, served
  from `main`, so the live site always matches the latest release.
- npm package metadata (`author`, `repository`, `homepage`, `bugs`), plus a `prepublishOnly` script that
  runs the tests before `npm publish`.
- MIT license (`LICENSE`, the `license` field in `package.json`, and a License section in the README).
- `CONTRIBUTING.md` describing the Git Flow branching model, documentation rules and the release process.
- This changelog.
- Pull request template.
- CI: tests run on Node 18, 20 and 22, and every example program is run. A policy check makes sure
  branch names match Git Flow and that each PR updates the changelog.

## [0.1.0] - 2026-09-24

### Added

- The language: `ka ho bhaiya` / `chalat bani bhaiya`, variables (`maan la`), printing (`bol ho`),
  conditions (`jadi` / `na ta jadi` / `na ta`), loops (`jab le`, `bas kara`, `aage badha`) and
  literals (`sach`, `jhooth`, `khaali`).
- Tokenizer, recursive-descent parser and tree-walking interpreter with no dependencies.
- Error messages in Bhojpuri that show the line and column.
- `bhojpuri` CLI for running `.bhoj` files.
- Browser playground (`npm run playground`).
- Example programs and a `node:test` test suite.

[Unreleased]: https://github.com/aayazkhan/bhojpuri-lang/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/aayazkhan/bhojpuri-lang/compare/v0.7.0...v1.0.0
[0.7.0]: https://github.com/aayazkhan/bhojpuri-lang/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/aayazkhan/bhojpuri-lang/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/aayazkhan/bhojpuri-lang/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/aayazkhan/bhojpuri-lang/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/aayazkhan/bhojpuri-lang/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/aayazkhan/bhojpuri-lang/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/aayazkhan/bhojpuri-lang/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/aayazkhan/bhojpuri-lang/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/aayazkhan/bhojpuri-lang/releases/tag/v0.1.0
