import type { Operation, TextOp } from "@collab-editor/shared";

export function transformOp(opA: Operation, opB: Operation): Operation {
  const transformedOps: TextOp[] = [];
  const opsA = [...opA.ops];
  const opsB = [...opB.ops];

  for (const a of opsA) {
    let transformed = { ...a };
    for (const b of opsB) {
      transformed = transformSingle(transformed, b);
    }
    transformedOps.push(transformed);
  }

  return {
    ...opA,
    ops: transformedOps,
    revision: opB.revision + 1,
  };
}

function transformSingle(a: TextOp, b: TextOp): TextOp {
  if (a.type === "insert" && b.type === "insert") {
    if (b.position <= a.position) {
      return { ...a, position: a.position + (b.chars?.length ?? 0) };
    }
    return a;
  }

  if (a.type === "insert" && b.type === "delete") {
    if (b.position < a.position) {
      const deleteCount = b.count ?? 0;
      const newPos = Math.max(b.position, a.position - deleteCount);
      return { ...a, position: newPos };
    }
    return a;
  }

  if (a.type === "delete" && b.type === "insert") {
    if (b.position <= a.position) {
      return { ...a, position: a.position + (b.chars?.length ?? 0) };
    }
    return a;
  }

  if (a.type === "delete" && b.type === "delete") {
    const aStart = a.position;
    const aCount = a.count ?? 0;
    const aEnd = aStart + aCount;
    const bStart = b.position;
    const bCount = b.count ?? 0;
    const bEnd = bStart + bCount;

    if (bEnd <= aStart) {
      return { ...a, position: Math.max(0, aStart - bCount) };
    } else if (bStart >= aEnd) {
      return a;
    } else {
      const newStart = bStart < aStart ? bStart : aStart;
      const originalOverlap = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
      const newCount = Math.max(0, aCount - originalOverlap);
      return { ...a, position: newStart, count: newCount };
    }
  }

  return a;
}

export function applyOp(doc: string, op: Operation): string {
  let result = doc;

  const sorted = [...op.ops].sort((a, b) => {
    if (b.position !== a.position) {
      return b.position - a.position;
    }
    if (a.type === "delete" && b.type === "insert") return -1;
    if (a.type === "insert" && b.type === "delete") return 1;
    return 0;
  });

  for (const textOp of sorted) {
    if (textOp.type === "insert" && textOp.chars) {
      result =
        result.slice(0, textOp.position) +
        textOp.chars +
        result.slice(textOp.position);
    }

    if (textOp.type === "delete") {
      const count = textOp.count ?? 0;
      result =
        result.slice(0, textOp.position) +
        result.slice(textOp.position + count);
    }
  }

  return result;
}
