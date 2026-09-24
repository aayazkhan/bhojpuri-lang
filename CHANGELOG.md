# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

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

[Unreleased]: https://github.com/aayazkhan/bhojpuri-lang/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/aayazkhan/bhojpuri-lang/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/aayazkhan/bhojpuri-lang/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/aayazkhan/bhojpuri-lang/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/aayazkhan/bhojpuri-lang/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/aayazkhan/bhojpuri-lang/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/aayazkhan/bhojpuri-lang/releases/tag/v0.1.0
