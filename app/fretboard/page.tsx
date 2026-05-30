import { Fretboard } from "@/components/Fretboard";
import { FretboardControls } from "@/components/FretboardControls";

export default function FretboardPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-10 p-8">
      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Fretboard</h1>
        <p className="mt-1 text-sm text-foreground/50">
          A key + scale, in degrees, across the frets you choose.
        </p>
      </header>

      <FretboardControls />
      <Fretboard />
    </main>
  );
}
