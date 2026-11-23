export type BriefInput = {
  name?: string;
  problem?: string;
  features?: string[];
  accent?: string;
  url?: string;
  logo?: string | null;
  /** When true, the end card says this is a sample film. */
  sample?: boolean;
};

export type Cue = {
  t: number;
  sfx: "tick" | "click" | "whoosh" | "chime" | "thud" | "ui";
  gain?: number;
  align?: "start" | "peak";
};

export type ComposeOk = {
  ok: true;
  html: string;
  duration: number;
  events: Cue[];
  hostname: string;
};

export type ComposeNo = { ok: false; reason: string };

export function compose(input: BriefInput, opts?: { fontUrl?: string }): ComposeOk | ComposeNo;
export function screenText(text: string): { ok: true } | { ok: false; reason: string };
