/**
 * Drum pattern presets. Each pattern is 16 steps (16th notes in one 4/4 bar).
 * Step index 0=beat1, 4=beat2, 8=beat3, 12=beat4.
 * Swing is a 0..1 amount passed to Transport.swing.
 */

export type DrumInstrument = "kick" | "snare" | "hihatClosed" | "hihatOpen";
export const DRUM_INSTRUMENTS: DrumInstrument[] = ["kick", "snare", "hihatClosed", "hihatOpen"];

export const INSTRUMENT_LABELS: Record<DrumInstrument, string> = {
  kick: "Kick",
  snare: "Snare",
  hihatClosed: "Hat",
  hihatOpen: "O.Hat",
};

export type DrumPattern = {
  id: string;
  name: string;
  swing: number;
  steps: Record<DrumInstrument, boolean[]>;
};

const b = (s: string): boolean[] =>
  s.split("").map((c) => c === "X");

export const DRUM_PATTERNS: DrumPattern[] = [
  {
    id: "rock",
    name: "Rock",
    swing: 0,
    steps: {
      kick:        b("X...X...X...X..."),  // every beat
      snare:       b("....X.......X..."),  // 2, 4
      hihatClosed: b("X.X.X.X.X.X.X.X."),  // every 8th
      hihatOpen:   b("................"),
    },
  },
  {
    id: "blues",
    name: "Blues Shuffle",
    swing: 0.55,
    steps: {
      kick:        b("X...X...X...X..."),
      snare:       b("....X.......X..."),
      hihatClosed: b("X.X.X.X.X.X.X.X."),  // swing applied to off-beats
      hihatOpen:   b("................"),
    },
  },
  {
    id: "funk",
    name: "Funk",
    swing: 0.1,
    steps: {
      kick:        b("X..X..X.X......."),
      snare:       b("....X.X.....X.X."),
      hihatClosed: b("XXX.XXX.XXX.XXX."),
      hihatOpen:   b("...X...X...X...X"),
    },
  },
  {
    id: "jazz",
    name: "Jazz",
    swing: 0.58,
    steps: {
      kick:        b("X..............."),  // light downbeat
      snare:       b("............X..."),  // brush on 4
      hihatClosed: b("X.X.X.X.X.X.X.X."),  // ride-cymbal feeling, swung
      hihatOpen:   b("....X.......X..."),  // foot hi-hat on 2, 4
    },
  },
  {
    id: "bossa",
    name: "Bossa Nova",
    swing: 0,
    steps: {
      kick:        b("X...X.X.X...X..."),
      snare:       b("..X.....X......."),  // rimshot feel
      hihatClosed: b("X.X.X.X.X.X.X.X."),
      hihatOpen:   b("................"),
    },
  },
];
