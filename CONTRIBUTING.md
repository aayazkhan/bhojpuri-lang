# Contributing to Bhojpuri Lang

This project follows **Git Flow**. Nobody commits or pushes directly to `main` or `develop`.
Every change arrives through a pull request that is documented, tested and passes CI.

## Branches

| Branch        | Purpose                                              | Branches off | Merges into          |
| ------------- | ---------------------------------------------------- | ------------ | -------------------- |
| `main`        | Released code only. Every commit is a tagged release. | —            | —                    |
| `develop`     | Integration branch for the next release.             | `main`       | —                    |
| `feature/*`   | A new feature, e.g. `feature/for-loop`               | `develop`    | `develop`            |
| `fix/*`       | A bug fix found during development                   | `develop`    | `develop`            |
| `chore/*`     | Tooling, CI, dependencies, refactors                  | `develop`    | `develop`            |
| `docs/*`      | Documentation only                                   | `develop`    | `develop`            |
| `release/x.y.z` | Prepare a release: version bump, changelog         | `develop`    | `main`, then back to `develop` |
| `hotfix/x.y.z`  | Urgent fix for a released version                  | `main`       | `main`, then back to `develop` |

```
main     ●───────────────────────●─────────────●          (tags: v0.1.0, v0.2.0, v0.2.1)
          \                     / \           /
release    \           ●───────●   \         /
            \         /             \       /
hotfix       \       /               ●─────●
              \     /                       \
develop        ●───●───●───●─────────────────●
                    \     / \   /
feature/*            ●───●   ●─●
```

Both `main` and `develop` are protected on GitHub: direct pushes are blocked, and a PR can only
merge after CI passes.

## Making a change

1. **Start from an up-to-date `develop`:**
   ```bash
   git switch develop
   git pull
   git switch -c feature/short-description
   ```
2. **Write the code and tests.** Every feature or fix needs tests in `test/`, in the `*.test.js` file for
   that topic (shared helpers such as `out()` and `assertError()` are in `test/helpers.js`). Run `npm test`.
3. **Document it** (CI checks the changelog):
   - Add an entry under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md), in the right group
     (`Added`, `Changed`, `Fixed`, `Removed`).
   - Update [README.md](README.md) if the language, CLI or library API changes.
   - Add or update an example in `examples/` for new language features.
4. **Open a PR into `develop`** and fill in the PR template: what changed, why, how it was tested.
5. **Merge** once CI is green. Use **"Create a merge commit"** so stacked PRs keep a clean history.

## Releasing

1. `git switch -c release/x.y.z develop`
2. Bump `version` in `package.json` and move the `[Unreleased]` entries in `CHANGELOG.md` into a new
   `## [x.y.z] - YYYY-MM-DD` section.
3. Open a PR from `release/x.y.z` into **`main`**. After it merges, tag the merge commit:
   ```bash
   git switch main && git pull
   git tag -a vx.y.z -m "vx.y.z"
   git push origin vx.y.z
   ```
4. Merge `main` back into `develop` with a PR so `develop` has the release commit.
5. GitHub Pages serves the playground from `main`, so it updates on its own a minute or two after the merge.
6. Optional: `npm publish` from `main` (`prepublishOnly` runs the tests first). The package is
   `@aayazk/bhojpuri-lang`, and `publishConfig` in `package.json` makes it public. npm asks you to confirm
   with two-factor authentication.

**Hotfixes** follow the same steps, but branch from `main` as `hotfix/x.y.z` and bump the patch version.

## Versioning

We use [Semantic Versioning](https://semver.org/). While the version is `0.x`, a minor bump (`0.2.0`)
may include breaking language changes, and a patch bump (`0.2.1`) contains fixes only.

## Commit messages

- Write the summary line in the imperative mood, under ~72 characters: `Add for loop`, `Fix index error message`.
- Use the body to explain *why*, and list notable changes.
- Keep each commit focused on one thing.

## Code style

- Plain modern JavaScript (ES modules). There are no runtime dependencies; please keep it that way.
- Put all Bhojpuri words in `src/keywords.js` and all user-facing error text in `src/messages.js`.
- Match the style of the surrounding code.
