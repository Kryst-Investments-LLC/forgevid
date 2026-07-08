/**
 * Operational Transformation (OT) for Collaborative Editing
 * Ensures consistency when multiple users edit simultaneously
 */

export interface Operation {
  type: 'insert' | 'delete' | 'retain';
  value?: any;
  length?: number;
}

export interface TransformationContext {
  timestamp: number;
  userId: string;
  operationIndex: number;
}

/**
 * Transform operation A against operation B
 * Returns: [A', B'] where A' is A transformed by B, and B' is B transformed by A
 */
export function transform(
  opA: Operation[],
  opB: Operation[],
  contextA: TransformationContext,
  contextB: TransformationContext
): [Operation[], Operation[]] {
  // Simple transformation logic
  // In production, use a robust OT library like ShareJS or similar
  
  if (opA.length === 0) return [opA, opB];
  if (opB.length === 0) return [opA, opB];

  // For now, implement basic transformation
  const transformedA: Operation[] = [];
  const transformedB: Operation[] = [];

  let indexA = 0;
  let indexB = 0;

  while (indexA < opA.length || indexB < opB.length) {
    const opA_current = opA[indexA];
    const opB_current = opB[indexB];

    // If both operations are retain, keep as is
    if (opA_current?.type === 'retain' && opB_current?.type === 'retain') {
      transformedA.push(opA_current);
      transformedB.push(opB_current);
      indexA++;
      indexB++;
    }
    // If A is insert and B is retain, insert happens first
    else if (opA_current?.type === 'insert' && opB_current?.type === 'retain') {
      transformedA.push(opA_current);
      transformedB.push({ type: 'retain', length: 1 });
      indexA++;
      indexB++;
    }
    // If A is retain and B is insert, B happens first
    else if (opA_current?.type === 'retain' && opB_current?.type === 'insert') {
      transformedA.push({ type: 'retain', length: 1 });
      transformedB.push(opB_current);
      indexA++;
      indexB++;
    }
    // If both are insert, order by timestamp
    else if (opA_current?.type === 'insert' && opB_current?.type === 'insert') {
      if (contextA.timestamp <= contextB.timestamp) {
        transformedA.push(opA_current);
        transformedB.push({ type: 'retain', length: opA_current.length || 1 });
        indexA++;
      } else {
        transformedA.push({ type: 'retain', length: opB_current.length || 1 });
        transformedB.push(opB_current);
        indexB++;
      }
    }
    // Default: advance both
    else {
      if (opA_current) transformedA.push(opA_current);
      if (opB_current) transformedB.push(opB_current);
      if (opA_current) indexA++;
      if (opB_current) indexB++;
    }
  }

  return [transformedA, transformedB];
}

/**
 * Apply operation to state
 */
export function apply(state: any[], operation: Operation[]): any[] {
  const result = [...state];
  let position = 0;

  for (const op of operation) {
    switch (op.type) {
      case 'insert':
        if (op.value !== undefined) {
          result.splice(position, 0, op.value);
          position++;
        }
        break;
      case 'delete':
        result.splice(position, op.length || 1);
        break;
      case 'retain':
        position += op.length || 1;
        break;
    }
  }

  return result;
}

/**
 * Invert operation (for undo)
 */
export function invert(operation: Operation[]): Operation[] {
  const inverted: Operation[] = [];

  for (const op of operation.reverse()) {
    switch (op.type) {
      case 'insert':
        inverted.push({ type: 'delete', length: op.length || 1 });
        break;
      case 'delete':
        inverted.push({ type: 'insert', value: op.value, length: op.length });
        break;
      case 'retain':
        inverted.push(op);
        break;
    }
  }

  return inverted;
}

/**
 * Compose two operations into one
 */
export function compose(opA: Operation[], opB: Operation[]): Operation[] {
  return [...opA, ...opB];
}

/**
 * Check if operations are equivalent
 */
export function equals(opA: Operation[], opB: Operation[]): boolean {
  if (opA.length !== opB.length) return false;

  for (let i = 0; i < opA.length; i++) {
    const a = opA[i];
    const b = opB[i];

    if (a.type !== b.type) return false;
    if (a.length !== b.length) return false;
    if (a.value !== b.value) return false;
  }

  return true;
}

