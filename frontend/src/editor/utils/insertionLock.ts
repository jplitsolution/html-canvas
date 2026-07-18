let isInsertionLocked = false;
let lastInsertionTime = 0;

export function lockInsertion() {
  isInsertionLocked = true;
}

export function unlockInsertion() {
  isInsertionLocked = false;
  lastInsertionTime = 0;
}

export function canInsert(): boolean {
  if (isInsertionLocked) return false;
  const now = Date.now();
  if (now - lastInsertionTime < 300) {
    return false;
  }
  lastInsertionTime = now;
  return true;
}
