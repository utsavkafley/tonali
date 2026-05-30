import { PracticeSurface } from "@/components/PracticeSurface";
import { PadGrid } from "@/components/PadGrid";
import { PracticePanel } from "@/components/PracticePanel";

export default function Home() {
  return (
    <>
      {/* Theory + Practice hub (follows the focused layer) */}
      <PracticePanel />

      {/* Tap pads tucked in the top-right */}
      <PadGrid className="fixed right-6 top-6 z-20" />

      {/* The single layered practice surface */}
      <PracticeSurface />
    </>
  );
}
