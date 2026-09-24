# Bhojpuri Lang

A toy programming language with Bhojpuri keywords, inspired by [Bhailang](https://bhailang.js.org/).
Written in plain JavaScript with zero dependencies. It runs in Node.js and in the browser.

```
ka ho bhaiya
  maan la naam = "duniya";
  bol ho "Pranam", naam;
chalat bani bhaiya
```

## Quick start

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

```
maan la i = 0;
jab le (i < 10) {
  i += 1;
  jadi (i == 3) { aage badha; }
  jadi (i == 8) { bas kara; }
  bol ho i;
}
```

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

### Built-in functions

| Name                 | Meaning                                  |
| -------------------- | ---------------------------------------- |
| `lambai(x)`          | length of a list or string               |
| `daal(list, value)`  | add `value` to the end of `list`         |
| `nikaal(list)`       | remove and return the last item (`khaali` if empty) |

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
import { run, formatError, BhojpuriError } from "bhojpuri-lang";

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
