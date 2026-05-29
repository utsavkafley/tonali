import { Metronome } from "@/components/Metronome";
import { PadGrid } from "@/components/PadGrid";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-16 p-8">
      {/* Tap pads tucked in the top-right (SPEC Step 2) */}
      <PadGrid className="absolute right-6 top-6" />

      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Tonali</h1>
        <p className="mt-1 text-sm text-foreground/50">Metronome</p>
      </header>
      <Metronome />
    </main>
  );
}
