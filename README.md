# Bhojpuri Lang

A toy programming language with Bhojpuri keywords, inspired by [Bhailang](https://bhailang.js.org/).
Written in plain JavaScript with zero dependencies. It runs in Node.js and in the browser.

**[Try it in the playground →](https://aayazkhan.github.io/bhojpuri-lang/)**

```
ka ho bhaiya
  maan la naam = "duniya";
  bol ho "Pranam", naam;
chalat bani bhaiya
```

## Install

```bash
npm install -g @aayazk/bhojpuri-lang   # gives you the `bhojpuri` command
bhojpuri program.bhoj                  # run a program
bhojpuri                               # open the interactive prompt
```

Or run a file without installing anything:

```bash
npx @aayazk/bhojpuri-lang program.bhoj
```

## Quick start (from a clone of this repo)

```bash
npm test                              # run the test suite
node bin/bhojpuri.js examples/fizzbuzz.bhoj
node bin/bhojpuri.js                  # interactive prompt
npm run playground                    # browser playground at http://localhost:3000
```

To get a global `bhojpuri` command while developing:

```bash
npm link
bhojpuri examples/hello.bhoj
```

## Interactive prompt

Run `bhojpuri` without a file to try things out one line at a time:

```
$ bhojpuri
Bhojpuri Lang 0.4.1 — "chalat bani bhaiya" likh ke ya Ctrl+D se bahar nikal.
bhojpuri> 2 + 3 * 4
14
bhojpuri> maan la naam = "Ramu"
bhojpuri> bol ho "Pranam,", naam
Pranam, Ramu
bhojpuri> kaam dugna(x) {
...   lauta da x * 2;
... }
bhojpuri> dugna(21)
42
bhojpuri> chalat bani bhaiya
```

- **No markers needed:** there's no `ka ho bhaiya`. The `;` can be left out at the end of the line and just
  before a `}`, as in `jadi (x > 0) { bol ho "haan" }`. Two statements on one line still need a `;` between
  them, and `.bhoj` files still need every `;`.
- **Values are shown:** typing a value shows it, with strings in quotes. Statements, assignments and `khaali`
  show nothing.
- **Everything is remembered:** variables and functions carry over between lines. You can run
  `maan la x = ...` again to start a variable over.
- **Multi-line code:** while a `{`, `(` or `[` is still open, the prompt changes to `...` and keeps reading.
- **Errors don't end the session.** The arrow keys bring back earlier lines, Ctrl+C throws away the current
  line, and `chalat bani bhaiya` or Ctrl+D leaves.
- **A line starting with `{` is a block.** To see a kosh, wrap it in brackets (`({ "a": 1 })`) or put it in a
  variable first.
- **Piped input:** lines piped into `bhojpuri` without a file run the same way, without the prompts:
  `printf '2 + 3\nsanyog(1, 6)\n' | bhojpuri`.

## The language

Every program starts with `ka ho bhaiya` and ends with `chalat bani bhaiya`.
Statements end with `;`, and blocks use `{ }`.

| Bhojpuri             | Meaning            |
| -------------------- | ------------------ |
| `ka ho bhaiya`       | start of program   |
| `chalat bani bhaiya` | end of program     |
| `maan la`            | declare a variable (`let`) |
| `bol ho`             | print              |
| `jadi`               | `if`               |
| `na ta jadi`         | `else if`          |
| `na ta`              | `else`             |
| `jab le`             | `while`            |
| `har` … `se` … `tak` | counting `for` loop |
| `har` … `me`         | `for each` item of a list or string, or key of a kosh |
| `bas kara`           | `break`            |
| `aage badha`         | `continue`         |
| `kaam`               | define a function  |
| `lauta da`           | `return`           |
| `koshish kara` … `galti pe` | `try` … `catch` |
| `phenk da`           | `throw`            |
| `sach` / `jhooth`    | `true` / `false`   |
| `khaali`             | `null`             |

### Variables

```
maan la a = 10;
maan la b = "shabd", c;     // several at once; c starts as khaali
a += 5;                     // also -= *= /= %=
```

Variables are block-scoped. Names can be written in Devanagari too (`maan la नाम = "राम";`).

### Output

```
bol ho "jawab:", a * 2;     // several values are joined with a space
```

### Text in strings

Write a string with backticks to put values straight into the text. Whatever is inside `{ }` is worked out
and written in, the same way `bol ho` would show it:

```
maan la naam = "Ramu", umar = 24;
bol ho `Pranam {naam}, agila saal {umar + 1} ke ho jaiba`;   // Pranam Ramu, agila saal 25 ke ho jaiba
bol ho `Saaman: {jod(saaman, ", ")}`;
```

- Any expression works inside `{ }`: maths, function calls, indexes, even another string.
- Write `\{` for a literal brace. `"..."` and `'...'` strings don't change: braces in them are just text.
- Like other strings, a backtick string has to end on the same line.

### Conditions

```
jadi (a > 10) {
  bol ho "bada";
} na ta jadi (a > 5) {
  bol ho "beech ke";
} na ta {
  bol ho "chhota";
}
```

### Loops

`har` counts from one number to another. Both ends are included, just like "1 se 10 tak":

```
har i = 1 se 10 tak {
  bol ho i;                 // 1, 2, … 10
}

har i = 10 se 0 tak kadam -2 {
  bol ho i;                 // 10, 8, 6, 4, 2, 0 (kadam sets the step; it defaults to 1)
}
```

`har … me` visits each item of a list, each letter of a string, or each key of a kosh:

```
har phal ["aam", "kela"] me {
  bol ho phal;
}
```

- The loop variable only exists inside the loop.
- `se`, `tak`, `kadam` and `me` are only special inside a `har` loop's header. Everywhere else they're
  ordinary names, so you can still use them as variables.
- The start, end and step are worked out once, before the loop starts. Changing the loop variable or the
  list inside the loop doesn't change which values the loop visits.
- With a fractional step, values are rounded to 15 significant digits, so `har i = 0 se 1 tak kadam 0.1`
  gives `0, 0.1, … 1` without floating-point leftovers like `0.30000000000000004`.

`jab le` repeats while a condition is true:

```
maan la i = 0;
jab le (i < 10) {
  i += 1;
  jadi (i == 3) { aage badha; }
  jadi (i == 8) { bas kara; }
  bol ho i;
}
```

`bas kara` (break) and `aage badha` (continue) work in both kinds of loop.

### Functions

```
kaam jodo(a, b) {
  lauta da a + b;
}
bol ho jodo(2, 3);          // 5
```

- `lauta da;` with no value, or reaching the end of the function, returns `khaali`.
- Functions can call themselves (recursion). They're values too: you can pass them to other functions or return them.
- Functions remember the variables around them (closures):

```
kaam counter() {
  maan la n = 0;
  kaam badhaw() { n += 1; lauta da n; }
  lauta da badhaw;
}
maan la ginti = counter();
ginti(); ginti();
bol ho ginti();             // 3
```

Recursion can go about 1,000 calls deep (roughly Python's default). Deeper recursion gives an error
instead of crashing.

### Lists

```
maan la saaman = ["aalu", "pyaaz"];
daal(saaman, "sattu");      // add to the end
bol ho saaman[0];           // aalu
saaman[1] = "tamatar";
bol ho lambai(saaman);      // 3
bol ho nikaal(saaman);      // sattu (removes the last item)
bol ho saaman;              // ["aalu", "tamatar"]
```

Indexes start at 0. Strings can be indexed too (`"ghar"[0]` is `g`), but they can't be changed.
Lists are shared by reference, so a function that changes a list changes it for the caller too.

### Dictionaries (kosh)

A `kosh` stores values under keys:

```
maan la ramu = { "naam": "Ramu", "umar": 24 };
bol ho ramu["naam"];            // Ramu
ramu["gaon"] = "Ballia";        // add a key, or change one that exists
ramu["umar"] += 1;
bol ho lambai(ramu);            // 3
bol ho ramu;                    // {"naam": "Ramu", "umar": 25, "gaon": "Ballia"}

jadi (ba(ramu, "phone")) {      // does the key exist?
  bol ho ramu["phone"];
}
hataw(ramu, "gaon");            // remove a key; returns its value

har k ramu me {                 // loop over the keys
  bol ho k, "=", ramu[k];
}
```

- Keys can be strings or numbers, and `1` and `"1"` are different keys.
- Keys stay in the order they were added. `chaabi(d)` gives them as a list.
- Reading a key that doesn't exist is an error, so a typo in a key name gets caught. Check first with
  `ba(d, key)`. `hataw` on a missing key just returns `khaali`.
- Like lists, a kosh is shared by reference, and `==` is only `sach` for the very same kosh.
- A `{` at the start of a statement is still a block. A kosh literal is only read where a value is
  expected, such as after `=`, in `bol ho` or as a function argument.

### Built-in functions

| Name                 | Meaning                                  |
| -------------------- | ---------------------------------------- |
| `lambai(x)`          | length of a list or string, or the number of keys in a kosh |
| `daal(list, value)`  | add `value` to the end of `list`         |
| `nikaal(list)`       | remove and return the last item (`khaali` if empty) |
| `sankhya(text)`      | turn text into a number: `sankhya("42")` is `42` |
| `shabd(x)`           | turn any value into text: `shabd(42)` is `"42"` |
| `kism(x)`            | the type of a value: `sankhya`, `shabd`, `list`, `kosh`, `sach/jhooth`, `khaali` or `kaam` |
| `gol(n)`             | round to the nearest whole number: `gol(2.6)` is `3` |
| `neeche(n)`          | round down: `neeche(7 / 2)` is `3`       |
| `sanyog(a, b)`       | random whole number from `a` to `b`, both included |
| `bada(text)`         | text in UPPER case                       |
| `chhota(text)`       | text in lower case                       |
| `tod(text, sep)`     | split text into a list: `tod("a,b", ",")` is `["a", "b"]` |
| `jod(list, sep)`     | join a list into text: `jod(["a", "b"], "-")` is `"a-b"` |
| `chaabi(kosh)`       | list of the keys, in the order they were added |
| `ba(x, item)`        | `sach` if a kosh has the key, a list has the item, or a string contains the text |
| `hataw(kosh, key)`   | remove a key and return its value (`khaali` if it wasn't there) |
| `poochh(question)`   | ask a question and return the typed answer as text (see [Input](#input)) |
| `chhaant(list)`      | a new, sorted list: all numbers, or all strings |
| `ulta(x)`            | a list or string, reversed               |
| `hissa(x, start, end)` | part of a list or string (see below)   |
| `khoj(x, item)`      | where `item` first appears in a list (or text in a string), or `-1` |
| `kul(list)`          | the total of a list of numbers           |

```
maan la umar = sankhya("24");
bol ho "Agila saal:", umar + 1;             // Agila saal: 25
bol ho jod(tod("aalu pyaaz sattu", " "), ", ");  // aalu, pyaaz, sattu
bol ho "Paasa:", sanyog(1, 6);
```

Working with lists:

```
maan la ank = [42, 7, 19, 3];
bol ho chhaant(ank);          // [3, 7, 19, 42]   (ank itself doesn't change)
bol ho ulta(ank);             // [3, 19, 7, 42]
bol ho hissa(ank, 1, 3);      // [7, 19]          from index 1 up to (not including) 3
bol ho hissa(ank, -2);        // [19, 3]          leave out the end to go to the end; negatives count back
bol ho khoj(ank, 19), kul(ank);   // 2 71
bol ho ba(ank, 7), ba("namaste", "mas");   // sach sach
```

`chhaant`, `ulta` and `hissa` return new lists and leave the original alone. `chhaant` sorts numbers by
size and strings by character code, so capital letters come before lowercase ones.

Giving a built-in the wrong kind of value is an error, not a silent wrong answer: `sankhya("abc")`
stops the program and says `"abc"` isn't a number.

Built-in names are ordinary variables, so you can reuse the names for your own variables.

### Input

`poochh` asks a question, waits for an answer and returns it as text:

```
maan la naam = poochh("Tohar naam ka ba? ");
bol ho "Pranam,", naam;

maan la umar = sankhya(poochh("Umar? "));    // turn the answer into a number
bol ho "Agila saal:", umar + 1;
```

- The question is optional: `poochh()` just waits for an answer.
- The answer is always text. Use `sankhya(...)` for numbers.
- When there's nothing left to read, `poochh` returns `khaali`. That happens at the end of piped input,
  after Ctrl+D in a terminal, or on Cancel in the playground. Check with `jadi (jawab == khaali)`.
- In a terminal, it reads a line of what you type, and piped input works too:
  `printf '50\n25\n' | bhojpuri examples/andaaz.bhoj`.
- In the playground, it opens the browser's question box. The box also shows what was printed since the
  last question, and the question and answer are added to the output.

### Catching errors

`koshish kara` ("try doing") runs a block. If something goes wrong inside it, even deep inside a function
it calls, the `galti pe` ("on error") block runs instead of the program stopping:

```
koshish kara {
  maan la umar = sankhya(poochh("Umar? "));
  bol ho "Agila saal:", umar + 1;
} galti pe (g) {
  bol ho "Galti bhail:", g;     // g is the error message
}
```

`phenk da` ("throw it") raises your own error. It can be any value, and `galti pe (g)` gets it unchanged:

```
kaam bhugtaan(paisa) {
  jadi (paisa < 100) {
    phenk da { "kod": 402, "sandesh": "Paisa kam ba" };
  }
  lauta da "ho gail";
}

koshish kara {
  bhugtaan(50);
} galti pe (g) {
  bol ho g["sandesh"];          // Paisa kam ba
}
```

- The `(g)` is optional: `} galti pe {` is fine when you don't need the error.
- A `phenk da` that nobody catches stops the program and shows the value as the error message.
- Runtime errors can be caught, including runaway recursion and the playground's loop guard. Syntax errors
  can't, because they're found before the program starts.
- `bas kara`, `aage badha` and `lauta da` work inside both blocks.
- Write `galti pe` on the same line as the `}` that closes `koshish kara`, as with `na ta`. This matters
  most at the interactive prompt.
- On their own, `koshish`, `galti` and `phenk` are still ordinary names. Only the two-word forms are
  keywords.

### Operators

`+ - * / %`, `== != < > <= >=`, `&& || !`. `+` joins strings, for example `"umar: " + 20`
(a backtick string like `` `umar: {20}` `` is often easier to read).
The falsy values are `jhooth`, `khaali`, `0` and `""`. Everything else counts as true.

Comments use `// ...` and `/* ... */`.

### Errors

Errors point to the exact line and column:

```
Chalat samay galti (line 3, col 14): "b" naam ke koi variable na ba. Pahile "maan la b" likh ke banaw.
  3 |   bol ho a + b;
    |              ^
```

## Changing the keywords

All keywords and built-in function names live in [`src/keywords.js`](src/keywords.js), and all error text lives in
[`src/messages.js`](src/messages.js). Edit a value there and the tokenizer, CLI, playground and error
messages pick it up. After renaming keywords, update the `.bhoj` examples and the tests.

## How it works

```
source code ──► tokenizer ──► tokens ──► parser ──► AST ──► interpreter ──► output
              src/tokenizer.js         src/parser.js       src/interpreter.js
```

- **Tokenizer** splits the source into keywords, numbers, strings, names and operators. Multi-word keywords are matched longest-first.
- **Parser** is a recursive-descent parser that builds an abstract syntax tree (AST). The full grammar is at the top of `src/parser.js`.
- **Interpreter** walks the AST with a chain of scopes. `bas kara`, `aage badha` and `lauta da` are returned as signals up to the enclosing loop or function. Functions keep a reference to the scope they were defined in, which is what makes closures work.

## Using it as a library

```js
// npm install @aayazk/bhojpuri-lang
import { run, formatError, BhojpuriError } from "@aayazk/bhojpuri-lang";

const lines = [];
try {
  run(source, {
    print: (line) => lines.push(line),     // where bol ho goes (default: console.log)
    input: (question) => "Ramu",           // answers poochh; return null for "no more input"
    maxLoopIterations: 100_000,            // stop runaway loops
  });
} catch (err) {
  if (err instanceof BhojpuriError) console.error(formatError(err, source));
}
```

To build your own prompt, use `Session`. It keeps variables between inputs, and `run` returns the value to show:

```js
import { Session } from "@aayazk/bhojpuri-lang";

const session = new Session({ print: console.log });
session.run(`maan la x = 20`);
session.run(`x + 1`);          // { exit: false, result: "21" }
session.isComplete(`kaam f() {`); // false: still waiting for the closing }
```

Without an `input` option, `poochh` stops with a Bhojpuri error, because there's no one to answer it.
There's also a `random` option that replaces `Math.random` for `sanyog`, which is handy in tests.

## Project layout

```
bin/bhojpuri.js      CLI
src/                 tokenizer, parser, interpreter, keywords, messages
examples/*.bhoj      sample programs
playground/          browser playground (uses src/ directly as ES modules)
scripts/serve.js     zero-dependency static server for the playground
test/                node:test suite, one *.test.js file per topic
```

## Contributing

Changes go through Git Flow: branch off `develop`, document the change in [CHANGELOG.md](CHANGELOG.md),
and open a pull request. `main` only receives releases. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Ayyaz Khan
