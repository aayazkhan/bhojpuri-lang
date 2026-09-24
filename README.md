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

All keywords live in [`src/keywords.js`](src/keywords.js), and all error text lives in
[`src/messages.js`](src/messages.js). Edit a value there and the tokenizer, CLI, playground and error
messages pick it up. After renaming keywords, update the `.bhoj` examples and the tests.

## How it works

```
source code ──► tokenizer ──► tokens ──► parser ──► AST ──► interpreter ──► output
              src/tokenizer.js         src/parser.js       src/interpreter.js
```

- **Tokenizer** splits the source into keywords, numbers, strings, names and operators. Multi-word keywords are matched longest-first.
- **Parser** is a recursive-descent parser that builds an abstract syntax tree (AST). The full grammar is at the top of `src/parser.js`.
- **Interpreter** walks the AST with a chain of scopes. `bas kara` and `aage badha` are returned as signals up to the enclosing loop.

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
