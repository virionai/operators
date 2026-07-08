export type Severity = "low" | "medium" | "high" | "critical";

export type CapsuleHydratedFile = {
  path: string;
  name: string;
  kind: "manifest" | "payload" | "chain" | "provenance" | "artifact";
  type: string;
  size: number;
  content?: string;
  binary?: boolean;
};

export type CapsuleHydration = {
  id: string;
  sourceName: string;
  capsuleName: string;
  hydratedAt: string;
  fileCount: number;
  payloadCount: number;
  eventCount: number;
  manifestId?: string;
  digestPrompt: string;
  files: CapsuleHydratedFile[];
};

export type Attachment = {
  id: string;
  name: string;
  type: string;
  status: "observed" | "verified" | "sealed" | "review";
  timestamp: string;
  size?: number;
  content?: string;
  capsuleHydration?: CapsuleHydration;
  hydratedFrom?: string;
  capsulePath?: string;
};

export type AnalysisTask = {
  id: string;
  label: string;
  source: string;
  confidence: number;
  progress: number;
  status: "active" | "queued" | "complete";
};

export type OperatorTask = {
  id: string;
  text: string;
  source: "operator" | "gemma4";
  severity: Severity;
  done: boolean;
  evidence: string;
  resolution?: string;
  resolvedAt?: string;
};

export type LedgerEvent = {
  id: string;
  time: string;
  at?: string;
  action: string;
  target: string;
  actor: string;
};

export const attachments: Attachment[] = [];
export const activeAnalysis: AnalysisTask[] = [];
export const operatorTasks: OperatorTask[] = [];
export const ledgerEvents: LedgerEvent[] = [];
export const initialMessages: Array<{ id: string; role: "operator" | "command"; text: string; time: string }> = [];
