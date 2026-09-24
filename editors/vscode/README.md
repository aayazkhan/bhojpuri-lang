# Bhojpuri Lang for VS Code

Colours and editing support for [Bhojpuri Lang](https://github.com/aayazkhan/bhojpuri-lang) programs (`.bhoj` files):

- **Colours:** keywords (`jadi`, `har`, `koshish kara`, …), `sach` / `jhooth` / `khaali`, strings, numbers,
  comments, built-in calls such as `lambai(…)`, and function names after `kaam`.
  - The `{…}` parts of backtick strings are coloured as code.
  - `se` / `tak` / `kadam` / `me` are coloured only in a `har` loop header.
- **Comments:** `Ctrl/⌘ + /` comments a line out.
- **Brackets and quotes:** they close themselves, and pressing Enter after a `{` indents the next line.

## Install

The extension isn't on the Marketplace yet. To install it from a clone of the repository, copy the
folder into VS Code's extensions folder and restart VS Code:

```bash
cp -r editors/vscode ~/.vscode/extensions/aayazk.bhojpuri-lang-0.1.0
```

On Windows the folder is `%USERPROFILE%\.vscode\extensions`.

## Changing the colours

The grammar in `syntaxes/bhojpuri.tmLanguage.json` is generated from the keyword tables in
`src/keywords.js`, so don't edit it by hand. After changing a keyword, run:

```bash
node scripts/build-vscode-grammar.js
```

The tests fail if the grammar is out of date.
