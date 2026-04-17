import type { Operation, TextOp } from '@collab-editor/shared';

// transform op_a against op_b
// returns a new op_a that achieves the same intent
// after op_b has already been applied
export function transformOp(opA: Operation, opB: Operation): Operation {
  const transformedOps: TextOp[] = [];

  let opsA = [...opA.ops];
  let opsB = [...opB.ops];

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

// transform a single TextOp against another single TextOp
function transformSingle(a: TextOp, b: TextOp): TextOp {
  if (a.type === 'insert' && b.type === 'insert') {
    // if b inserted at or before a's position, shift a right
    if (b.position <= a.position) {
      return { ...a, position: a.position + (b.chars?.length ?? 0) };
    }
    return a;
  }

  if (a.type === 'insert' && b.type === 'delete') {
    // if b deleted content before a's position, shift a left
    if (b.position < a.position) {
      const deleteCount = b.count ?? 0;
      const newPos = Math.max(b.position, a.position - deleteCount);
      return { ...a, position: newPos };
    }
    return a;
  }

  if (a.type === 'delete' && b.type === 'insert') {
    // if b inserted before a's position, shift a right
    if (b.position <= a.position) {
      return { ...a, position: a.position + (b.chars?.length ?? 0) };
    }
    return a;
  }

  if (a.type === 'delete' && b.type === 'delete') {
    if (b.position < a.position) {
      const deleteCount = b.count ?? 0;
      const newPos = Math.max(b.position, a.position - deleteCount);
      return { ...a, position: newPos };
    }
    // if b deleted overlapping region, adjust a's count
    if (b.position === a.position) {
      return { ...a, count: Math.max(0, (a.count ?? 0) - (b.count ?? 0)) };
    }
    return a;
  }

  return a;
}

// apply an operation to a document string
// returns the new document string
export function applyOp(doc: string, op: Operation): string {
  let result = doc;

  // sort ops by position descending so earlier positions
  // do not shift later ones during application
  const sorted = [...op.ops].sort((a, b) => {
    if (b.position !== a.position) {
      return b.position - a.position;
    }
    if (a.type === 'delete' && b.type === 'insert') return -1;
    if (a.type === 'insert' && b.type === 'delete') return 1;
    return 0;
  });

  for (const textOp of sorted) {
    if (textOp.type === 'insert' && textOp.chars) {
      result =
        result.slice(0, textOp.position) +
        textOp.chars +
        result.slice(textOp.position);
    }

    if (textOp.type === 'delete') {
      const count = textOp.count ?? 0;
      result =
        result.slice(0, textOp.position) +
        result.slice(textOp.position + count);
    }
  }

  return result;
}