import { createInterfaceKit } from "interface-kit";
import type { InterfaceKitController } from "interface-kit";

const KEY = "__interfaceKitExt";

declare global {
  interface Window {
    [KEY]?: InterfaceKitController;
  }
}

const existing = window[KEY];

if (existing) {
  existing.destroy();
  delete window[KEY];
} else {
  const kit = createInterfaceKit({ enabled: true, zIndex: 2147483000 });
  kit.mount();

  // Controller methods proxy to a bridge that only exists once React has committed.
  const unsubscribe = kit.subscribe((snapshot) => {
    if (!snapshot.isMounted) return;
    kit.setActive(true);
    unsubscribe();
  });

  window[KEY] = kit;
}
