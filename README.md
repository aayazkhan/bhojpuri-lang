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
bhojpuri program.bhoj
```

Or run a file without installing anything:

```bash
npx @aayazk/bhojpuri-lang program.bhoj
```

## Quick start (from a clone of this repo)

```bash
npm test                              # run the test suite
node bin/bhojpuri.js examples/fizzbuzz.bhoj
npm run playground                    # browser playground at http://localhost:3000
```

To get a global `bhojpuri` command while developing:

```bash
npm link
bhojpuri examples/hello.bhoj
```

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
| `ba(kosh, key)`      | `sach` if the key exists                 |
| `hataw(kosh, key)`   | remove a key and return its value (`khaali` if it wasn't there) |

```
maan la umar = sankhya("24");
bol ho "Agila saal:", umar + 1;             // Agila saal: 25
bol ho jod(tod("aalu pyaaz sattu", " "), ", ");  // aalu, pyaaz, sattu
bol ho "Paasa:", sanyog(1, 6);
```

Giving a built-in the wrong kind of value is an error, not a silent wrong answer: `sankhya("abc")`
stops the program and says `"abc"` isn't a number.

Built-in names are ordinary variables, so you can reuse the names for your own variables.

### Operators

`+ - * / %`, `== != < > <= >=`, `&& || !`. `+` joins strings, for example `"umar: " + 20`.
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
  run(source, { print: (line) => lines.push(line), maxLoopIterations: 100_000 });
} catch (err) {
  if (err instanceof BhojpuriError) console.error(formatError(err, source));
}
```

## Project layout

```
bin/bhojpuri.js      CLI
src/                 tokenizer, parser, interpreter, keywords, messages
examples/*.bhoj      sample programs
playground/          browser playground (uses src/ directly as ES modules)
scripts/serve.js     zero-dependency static server for the playground
test/                node:test suite
```

## Contributing

Changes go through Git Flow: branch off `develop`, document the change in [CHANGELOG.md](CHANGELOG.md),
and open a pull request. `main` only receives releases. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © Ayyaz Khan
