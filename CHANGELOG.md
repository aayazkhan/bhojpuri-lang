# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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

[Unreleased]: https://github.com/aayazkhan/bhojpuri-lang/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/aayazkhan/bhojpuri-lang/releases/tag/v0.1.0
