export type OpType = "insert" | "delete" | "retain";

export interface TextOp {
  type: OpType;
  position: number;
  chars?: string; // for insert
  count?: number; // for delete
}

export interface Operation {
  ops: TextOp[];
  revision: number; // the document revision this op was based on
  userId: string;
  timestamp: number;
}
