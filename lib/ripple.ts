let installed = false;

function spawnScreenRipple(x: number, y: number) {
  if (typeof document === "undefined") return;
  const ink = document.createElement("span");
  ink.className = "ripple-screen-ink";
  ink.style.width = "84px";
  ink.style.height = "84px";
  ink.style.left = `${x}px`;
  ink.style.top = `${y}px`;
  document.body.appendChild(ink);
  window.setTimeout(() => ink.remove(), 550);
}

export function installTapRipple() {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== undefined && e.button > 0) return;
      spawnScreenRipple(e.clientX, e.clientY);
      const el = (e.target as HTMLElement | null)?.closest?.("button:not(:disabled)");
      if (!el) return;
      const host = el as HTMLElement;
      const rect = host.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const size = Math.max(rect.width, rect.height) * 2.2;
      const ink = document.createElement("span");
      ink.className = "ripple-ink";
      ink.style.width = `${size}px`;
      ink.style.height = `${size}px`;
      ink.style.left = `${e.clientX - rect.left}px`;
      ink.style.top = `${e.clientY - rect.top}px`;
      host.appendChild(ink);
      window.setTimeout(() => ink.remove(), 650);
    },
    { passive: true }
  );
}
