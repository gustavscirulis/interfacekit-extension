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

## Limitations

- Style edits are ephemeral and are lost on reload.
- Iframes are not covered — the editor binds to the top-level document.
- The generated prompt references DOM selectors, not source files.
