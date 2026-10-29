export type JobStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;            // total valid lines for this job
  retries: number;         // lines whose status is 'retry'
  lastStatus: JobStatus;   // status of the latest line (by `at`) for this job
  lastError: string | null;// `error` of the latest line (by `at`) that had one; else null
  firstAt: string;         // smallest `at`, kept verbatim (keep the offset, do not convert)
  lastAt: string;          // largest `at`, kept verbatim
};

export type ReadNight = (runsDir: string, night: string) => DigestRow[] | null;
