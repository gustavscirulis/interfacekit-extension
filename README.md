# InterfaceKit Extension

A Chrome extension (MV3) wrapper around [`interface-kit`](https://www.npmjs.com/package/interface-kit),
so the visual style editor can be used on any page without installing it into that app's source.

Click the toolbar icon to activate the editor on the current tab. Click it again to tear it down.

## Build

```bash
pnpm install
pnpm build
```

Then open `chrome://extensions`, enable Developer mode, and **Load unpacked** → `dist/`.

`pnpm watch` rebuilds on change with sourcemaps; reload the extension in `chrome://extensions`
to pick up changes.

## How it works

`src/background.ts` injects `content.js` into the active tab via `chrome.scripting.executeScript`
under `activeTab` — nothing runs until you click. `src/content.ts` calls `createInterfaceKit()`,
which mounts its own UI into a shadow root, so the page's styles and the editor's don't collide.

Re-injection into the same tab acts as a toggle: the content script's isolated world persists
across `executeScript` calls, so the second run finds its own `window` flag and destroys the
instance.

Two non-obvious requirements, both silent failures if missed:

- `enabled: true` must be passed explicitly. `interface-kit` defaults to
  `process.env.NODE_ENV === "development"` and disables itself when `process` is undefined.
- `setActive` only works after the controller reports `isMounted`. Its methods proxy to a bridge
  that doesn't exist until React commits, so calling it synchronously after `mount()` is a no-op.

The esbuild `--define:process.env.NODE_ENV` flag is load-bearing: it selects React's production
build and eliminates a bare `process` reference in the dependency that would otherwise throw.

## Patched dependency

`patches/interface-kit@0.1.3.patch` (applied via `patchedDependencies` in `pnpm-workspace.yaml`) fixes
three bugs in `interface-kit`'s click handler that only show up on real apps, all in `dist/index.js`:

- `handleClick` ran `document.querySelector('[contenteditable="true"]:not([data-interface-kit])')`
  document-wide and treated any match as "the kit is mid text-edit", swallowing the click and
  clearing the selection. Any app with a mounted rich-text editor — Lexical, ProseMirror, Slate, or a
  hand-rolled `contentEditable` div — matched on every click, so the editor was stuck in picking mode:
  hover highlighting worked, clicking never opened the panel. Both that check and the sibling
  `elementUnder.closest('[contenteditable="true"]')` bail are now gated on `state.isEditingText`,
  which also makes app-owned editable regions selectable.
- `SelectionOverlay` dropped its outline when React replaced the selected node but never cleared
  `state.selectedElement`, leaving the panel open on a detached element with default values. It now
  clears the selection.
- Clicking a different element while one was selected only deselected, so switching selection took two
  clicks. It now reselects, matching the headless `dist/core.js` engine.

`dist/react.js` and `dist/core.js` carry the same three bugs upstream but are unreachable from this
extension, so they are left alone.

Bumping `interface-kit` past 0.1.3 makes the patch unused, which fails `pnpm install` loudly rather
than silently reverting the fixes. Re-diff the hunks against the new `dist/index.js` (search for
`contenteditable="true"]:not`), re-run `pnpm patch interface-kit@<version>` / `pnpm patch-commit`, and
re-verify before taking the bump.

## Limitations

- Style edits are ephemeral and are lost on reload.
- Iframes are not covered — the editor binds to the top-level document.
- The generated prompt references DOM selectors, not source files.
