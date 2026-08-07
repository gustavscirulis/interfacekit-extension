import { createInterfaceKit } from "interface-kit";
import type { InterfaceKitController } from "interface-kit";

const KEY = "__interfaceKitExt";

declare global {
  interface Window {
    [KEY]?: InterfaceKitController;
  }
}

// setActive() only flips which children render; the toolbar's width is a motion
// value that stays collapsed unless its own open handler runs, which clips the
// expanded row into a 44px circle. Driving the real pointer path avoids that.
function expandToolbar(): boolean {
  const host = document.querySelector("[data-interface-kit]");
  const container = host?.shadowRoot?.querySelector("[data-interface-kit]");
  if (!container) return false;

  container.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
  document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  return true;
}

const existing = window[KEY];

if (existing) {
  existing.destroy();
  delete window[KEY];
} else {
  const kit = createInterfaceKit({ enabled: true, zIndex: 2147483000 });
  kit.mount();

  const unsubscribe = kit.subscribe((snapshot) => {
    if (!snapshot.isMounted) return;
    unsubscribe();
    requestAnimationFrame(expandToolbar);
  });

  window[KEY] = kit;
}
