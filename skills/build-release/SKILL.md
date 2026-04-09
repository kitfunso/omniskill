---
name: build-release
description: "Bump iOS/Android build numbers, build the Android .aab bundle, commit and push. Use this skill whenever the user says 'build release', 'bump build', 'build aab', 'bump and push', 'bump ios build number', 'build the aab file', or any combination of bumping build numbers, building Android bundles, and pushing. Also trigger when user says 'release build' or 'ship the build'."
---

# Build Release

Automates the full release build workflow for the Phzse app: bump build numbers, build web assets, build the Android .aab, commit everything, and push.

## Prerequisites

- Must be in the `C:/Users/skf_s/phzse` project directory
- Git must be on the correct branch (verify first, never assume)

## Steps

Execute these steps in order. Stop and report if any step fails.

### 1. Verify branch

```bash
cd "C:/Users/skf_s/phzse" && git branch
```

Confirm you're on `master`. If not, warn the user before proceeding.

### 2. Read current build numbers

Read these two files to find the current build number:

- **iOS**: `codemagic.yaml` — find the line `agvtool new-version -all N` and extract N
- **Android**: `android/app/build.gradle` — find the line `versionCode N` and extract N
- Also extract `versionName` from build.gradle (e.g., "2.1.0") for the .aab filename

Both should be the same number. The new build number = current + 1.

### 3. Bump build numbers

Edit both files, replacing the old number with the new one:

- `codemagic.yaml`: `agvtool new-version -all {NEW}`
- `android/app/build.gradle`: `versionCode {NEW}`

### 4. Build web assets

```bash
cd "C:/Users/skf_s/phzse" && npm run build
```

Wait for completion. This must succeed before proceeding.

### 5. Sync Capacitor

```bash
cd "C:/Users/skf_s/phzse" && npx cap sync android
```

### 6. Build Android bundle

```bash
cd "C:/Users/skf_s/phzse/android" && ./gradlew bundleRelease
```

This takes 30-60 seconds. Must finish with `BUILD SUCCESSFUL`.

### 7. Copy .aab to project root

```bash
cp "C:/Users/skf_s/phzse/android/app/build/outputs/bundle/release/app-release.aab" \
   "C:/Users/skf_s/phzse/app-release-v{VERSION_NAME}-build{NEW_BUILD}.aab"
```

The .aab is gitignored, so it won't be committed — it's just for local reference / Play Store upload.

### 8. Stage, commit, and push

Stage all modified files (not untracked directories like `.gstack/` or `prototypes/`):

```bash
git add codemagic.yaml android/app/build.gradle
```

Also stage any OTHER unstaged modified files from the current session (check `git status` first). Do NOT stage untracked directories unless they're clearly part of the work.

Commit with:

```
chore: bump build {NEW_BUILD} and release .aab

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

Then push:

```bash
git push
```

### 9. Report

Tell the user:
- Build number bumped: {OLD} → {NEW}
- .aab file: `app-release-v{VERSION}-build{NEW}.aab`
- Committed and pushed to remote
