export type RunStatus = "ok" | "retry" | "fail";

export interface DigestRow {
  job: string;
  /** null when the log line has no owner; views show it as "—" */
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError?: string;
  firstAt: string;
  lastAt: string;
}

export interface Night {
  rows: DigestRow[];
  /** lines that did not parse: counted, never thrown */
  badLines: number;
}

/** Reads `<runsDir>/<night>.jsonl` (night = "YYYY-MM-DD"). Throws only if the file is missing. */
export type ReadNight = (runsDir: string, night: string) => Promise<Night>;
