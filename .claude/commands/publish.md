---
description: Prepare a package for npm publish — bump version, update CHANGELOG/README, validate, commit
argument-hint: patch|minor|major
---

# /publish — prepare an npm release

You are preparing the current repository's primary publishable package for `npm publish`. **Do not run `npm publish`** — the user logs in and publishes manually.

## Argument

The release bump type: **$ARGUMENTS**

Must be one of `patch`, `minor`, `major`. If missing or invalid, stop and ask the user which one to use (don't guess).

## Target package

Find the publishable package in this repo:

1. If the **root `package.json`** has a `name` field and does **not** have `"private": true`, use it.
2. Otherwise look for `packages/*/package.json` entries that have a `name` and are not private. If exactly one matches, use it. If multiple match, stop and ask the user which to publish.
3. If none match, stop — there's nothing to publish.

Record the resolved package directory as `PKG_DIR` and read its current version as `CURRENT_VERSION`. Compute `NEW_VERSION` by bumping per the arg.

## Required files in PKG_DIR

- `package.json` — version will be bumped
- `CHANGELOG.md` — must have an `## [Unreleased]` section with content
- `README.md` — must have at least one `## What's New in vX.Y.Z` section (or be willing to gain its first)

If any are missing, stop and report which.

## Steps (in order)

### 1. Sanity checks

- Run `git status` — if the working tree has uncommitted changes **other than** the files you're about to touch, warn the user and ask before continuing. Small edits in CHANGELOG/README/package.json are fine to roll into the release commit.
- Confirm `CHANGELOG.md` has an `## [Unreleased]` section with at least one bullet under it. If empty, stop — there's nothing meaningful to release.

### 2. Bump version

Edit `PKG_DIR/package.json` and change `"version": "CURRENT_VERSION"` to `"version": "NEW_VERSION"`.

### 3. Finalize CHANGELOG

In `PKG_DIR/CHANGELOG.md`:
- Rename the `## [Unreleased]` heading to `## [NEW_VERSION] - YYYY-MM-DD [PUBLISHED]` using today's date (check the system context for `Today's date`; don't guess).
- Leave all content under it untouched.
- Do **not** create a new empty `## [Unreleased]` section — the next release cycle will re-create it.

### 4. Update README "What's New"

In `PKG_DIR/README.md`:
- Add a new `## What's New in NEW_VERSION` section at the top of the What's New block (just after the intro paragraph, before the first existing `## What's New` heading).
- Populate it with 3–5 concise bullets summarizing the most user-facing changes from the just-finalized CHANGELOG section. Prioritize: **Added** > **Changed** > **Removed** > **Fixed**. Pick highlights, not everything — readers want the top-of-mind items, not an exhaustive list.
- Delete any `## What's New in vX.Y.Z` sections so that only the **two most recent** remain (the new one plus the one before it).

### 5. Validate README reflects the release

Before committing, read both the finalized CHANGELOG section and the new README What's New. Every **Added** or **Changed** bullet in the CHANGELOG that represents a user-facing feature or behavior change should have a corresponding hit in the new README section (paraphrased, not verbatim). Pure internal refactors and Fixed-only entries don't need coverage.

If you find a significant CHANGELOG entry that isn't reflected in the README, add a bullet for it. If there are more than ~5 bullets after this pass, condense — the What's New section should be scannable.

### 6. Validate CHANGELOG entries match uncommitted/recent work

Run `git log --oneline` for the commits since the last `[PUBLISHED]` tag in CHANGELOG (find the version just before NEW_VERSION). Also check `git diff` for any uncommitted work. For every substantive commit or uncommitted change, verify the CHANGELOG section mentions it. If something significant is missing, **stop and ask the user** before finalizing — don't invent entries on their behalf.

### 7. Commit

Stage `PKG_DIR/package.json`, `PKG_DIR/CHANGELOG.md`, `PKG_DIR/README.md`. Create a commit with this message format:

```
vNEW_VERSION — <one-line summary of the release's headline change>

<2–4 line description of what this version delivers, drawn from the CHANGELOG highlights>
```

Use whatever Co-Authored-By convention the user has in recent commits on this repo — don't introduce or strip one.

### 8. Report

Report back with:
- The new version number
- The commit SHA
- Exactly what the user needs to run to publish, e.g. `cd PKG_DIR && npm publish`
- A reminder that the CHANGELOG's `[PUBLISHED]` tag is now in place — if the publish fails, they should revert both the tag and the version bump before retrying.

## Things not to do

- **Do not run `npm publish`.** The user publishes manually.
- **Do not push to git remote.** The commit stays local until the user pushes.
- **Do not add a new empty `[Unreleased]` section** after finalizing — next cycle re-creates it.
- **Do not invent CHANGELOG entries** to cover commits you find; ask the user if something's missing.
- **Do not bump if there's nothing meaningful in `[Unreleased]`** — stop and explain.
