/**
 * Session/UI state (Interaction Model) — which layer is in focus on the single practice
 * surface. Pure UI; audio for each layer runs independently of focus, so cycling views
 * never stops a layer. Layers compose; the user moves between them freely (swipe up/down).
 */
import { create } from "zustand";

export type LayerId = "timing" | "harmony" | "texture";

/** Bottom → top. Swiping up moves toward the end of this list. */
export const LAYERS: LayerId[] = ["timing", "harmony", "texture"];

export const LAYER_META: Record<LayerId, { name: string; tagline: string }> = {
  timing: { name: "Rhythm", tagline: "Tempo, meter & feel" },
  harmony: { name: "Fretboard", tagline: "Keys, scales & harmony" },
  texture: { name: "Texture", tagline: "Bass, keys & effects" },
};

interface SessionState {
  focus: LayerId;
  setFocus: (layer: LayerId) => void;
  /** Move focus up (+1) or down (-1) the stack, clamped to the ends. */
  cycle: (dir: 1 | -1) => void;
}

export const useSession = create<SessionState>((set) => ({
  focus: "timing",
  setFocus: (focus) => set({ focus }),
  cycle: (dir) =>
    set((s) => {
      const i = LAYERS.indexOf(s.focus);
      const next = Math.min(LAYERS.length - 1, Math.max(0, i + dir));
      return { focus: LAYERS[next] };
    }),
}));
