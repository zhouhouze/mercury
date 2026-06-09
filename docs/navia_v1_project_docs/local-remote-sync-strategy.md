# Local And Remote Sync Strategy

## Current Finding

The local workspace can look updated in the Chrome extension UI while Git still reports a clean working tree. In the current repository state, `main` is clean and aligned with `origin/main`; the app and settings UI updates are already represented in the existing commit history.

## Why Git May Look Clean

- The visible UI changes were already committed in an earlier commit.
- The Chrome extension may be loading a tracked build output under `apps/chrome-extension/chrome-mv3-unpacked`.
- Generated caches and dependencies such as `.wxt/`, `node_modules/`, `.pytest_cache/`, and `.DS_Store` are ignored and will not be pushed.
- A browser may be loading an unpacked extension from a different local directory than the active repository.

## Recommended Check Before Upload

1. Confirm the active branch with `git status --short --branch`.
2. Compare tracked app and PRD files with `git diff --name-status HEAD -- apps PRD`.
3. Check untracked non-ignored files with `git ls-files --others --exclude-standard apps PRD`.
4. Verify the loaded Chrome extension path points to `apps/chrome-extension/chrome-mv3-unpacked`.
5. Commit only real source, PRD, or intentionally tracked build-output changes.

## Upload Policy

Use normal commits for actual file changes. Use tags for release markers. Avoid empty commits unless a release checkpoint is explicitly needed.
