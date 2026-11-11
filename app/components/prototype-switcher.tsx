// PROTOTYPE — throwaway. Floating variant switcher for UI prototypes.
// Hidden in production builds.

import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PrototypeSwitcher({
  variants,
  current,
  children,
}: {
  variants: { key: string; name: string }[];
  current: string;
  children?: React.ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const idx = Math.max(0, variants.findIndex((v) => v.key === current));

  const go = (d: number) => {
    const next = variants[(idx + d + variants.length) % variants.length];
    const p = new URLSearchParams(params);
    p.set("variant", next.key);
    setParams(p, { replace: true, preventScrollReset: true });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-1.5 rounded-2xl bg-zinc-900 px-3 py-2 text-sm text-white shadow-2xl ring-2 ring-fuchsia-500">
      <div className="flex items-center gap-2">
        <button onClick={() => go(-1)} className="rounded-full p-1 hover:bg-white/15">
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-48 text-center font-mono">
          {variants[idx].key} ({variants[idx].name})
        </span>
        <button onClick={() => go(1)} className="rounded-full p-1 hover:bg-white/15">
          <ChevronRight className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}
