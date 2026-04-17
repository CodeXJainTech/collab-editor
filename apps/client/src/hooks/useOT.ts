import { useRef, useCallback } from "react";
import type { Operation, TextOp } from "@collab-editor/shared";

interface UseOTOptions {
  userId: string;
  onRemoteOp: (op: Operation) => void;
}

export function useOT({ userId, onRemoteOp }: UseOTOptions) {
  const revisionRef = useRef(0);

  const setRevision = useCallback((rev: number) => {
    revisionRef.current = rev;
  }, []);

  // called when we receive a broadcast op from server
  const receiveOp = useCallback(
    (op: Operation) => {
      revisionRef.current = op.revision;
      onRemoteOp(op);
    },
    [onRemoteOp],
  );

  // build an insert operation from Monaco change event
  const buildInsertOp = useCallback(
    (position: number, chars: string): Operation => {
      return {
        ops: [{ type: "insert", position, chars }],
        revision: revisionRef.current,
        userId,
        timestamp: Date.now(),
      };
    },
    [userId],
  );

  // build a delete operation from Monaco change event
  const buildDeleteOp = useCallback(
    (position: number, count: number): Operation => {
      return {
        ops: [{ type: "delete", position, count }],
        revision: revisionRef.current,
        userId,
        timestamp: Date.now(),
      };
    },
    [userId],
  );

  return {
    revisionRef,
    setRevision,
    receiveOp,
    buildInsertOp,
    buildDeleteOp,
  };
}
