---
name: publish-repo
description: "Ship an npm package release: bump version, update CHANGELOG/README/manifests, build, test, commit, tag, npm publish, push, and optionally install globally. Use when the user says 'publish', 'release', 'ship the package', 'bump version and push', or 'update docs and publish npm'. Works for any Node.js repo with a package.json."
---

# Publish Repo

End-to-end release workflow for npm packages. Handles version bump, docs, build, test, publish, push, and global install.

## Prerequisites

- Must be in a directory with `package.json`
- Must have npm publish access (already logged in)
- Git working tree should be clean or have only the changes to release

## Steps

### 0. Verify state

```bash
git branch
git status
```

Confirm you're on the correct branch (usually `master` or `main`). If not, ask before proceeding.

### 1. Determine version bump

Check the current version from `package.json`. Determine the bump type:

- If the user specifies a version (e.g., "bump to 0.12.0"), use that exactly.
- If the user says "patch", "minor", or "major", bump accordingly.
- If unspecified, infer from the changes in this session:
  - Bug fix or small improvement: **patch** (0.11.1 -> 0.11.2)
  - New feature or capability: **minor** (0.11.1 -> 0.12.0)
  - Breaking change: **major** (0.11.1 -> 1.0.0)
- Confirm the version with the user before proceeding if ambiguous.

### 2. Bump version in ALL manifests

**NEVER use `npm version` — it only bumps `package.json` and `package-lock.json`.** Always bump manually with Edit to catch every manifest.

Search for the old version string across the repo:

```bash
grep -rn '"version".*OLD_VERSION' --include='*.json' . | grep -v node_modules | grep -v package-lock
```

Typical files to bump (edit each one):
- `package.json` (root)
- Any nested `package.json` files (extensions/, plugins/)
- Any `*.plugin.json` or `openclaw.plugin.json` manifests
- MCP server version strings in source code

After bumping all manifests, run `npm install` to sync `package-lock.json` to the new version.

**Verify all manifests match** after bumping — grep again and confirm zero hits for the old version (excluding package-lock.json and node_modules).

Update ALL of them. Do NOT leave any behind. This has caused version desync bugs before.

### 3. Update CHANGELOG.md

Add a new section at the top, after the `# Changelog` heading:

```markdown
## X.Y.Z (YYYY-MM-DD)

### Fixed / Added / Changed
- **Short title.** Description of the change.
```

Use today's date. Categorize entries as Fixed, Added, or Changed. Keep descriptions concise but specific.

### 4. Update README.md

Add a "What's new in vX.Y.Z" section if the README has that pattern. Keep it to 1-3 bullet points. Do not rewrite existing sections.

### 5. Update other relevant docs

Check for:
- Plugin/extension READMEs that reference the changed functionality
- Integration guides affected by the changes
- Any doc that references the old behavior

Only update docs that are actually affected. Do not touch unrelated files.

### 6. Build

```bash
npm run build
```

Must succeed before proceeding.

### 7. Test

```bash
npx vitest run
```

Or whatever the test command is (`npm test`, `npx jest`, etc.). ALL tests must pass. If a test fails due to version sync, fix it. If a test fails for other reasons, stop and report.

### 8. Commit

Stage only the changed files (not `git add -A`). Write a commit message:

```
chore: bump to vX.Y.Z, update changelog and readme

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

### 9. Publish to npm

```bash
npm publish
```

Wait for confirmation. If it fails (auth, version conflict), report and stop.

### 10. Tag and push

```bash
git tag vX.Y.Z
git push origin <branch>
git push origin vX.Y.Z
```

### 11. Install globally (if applicable)

If the package is a CLI tool (has a `bin` field in package.json):

```bash
npm install -g <package-name>@X.Y.Z
```

Verify:

```bash
<cli-command> --version
```

### 12. Close related issues/PRs

If any commits reference `Closes #N` or `Fixes #N`, verify the issues/PRs were closed. If not, close them manually with a comment.

## Rules

- Never publish without passing tests.
- **NEVER use `npm version` to bump.** It misses plugin manifests and causes version desync. Always edit each file manually.
- Never skip the version bump in any manifest. Grep to find them all.
- After bumping, verify with grep that no manifest still has the old version.
- If `package-lock.json` is stale, run `npm install` to regenerate it before committing.
- Do not amend previous commits. Always create new commits.
- Report what was published at the end: package name, version, npm URL, tag.
