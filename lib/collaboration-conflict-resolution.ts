/**
 * Conflict Resolution for Collaborative Editing
 * Handles conflicts when multiple users edit the same element
 */

import { prisma } from './prisma';

export interface ConflictResolutionStrategy {
  type: 'last_write_wins' | 'manual' | 'merge' | 'lock';
  [key: string]: any;
}

export interface Conflict {
  id: string;
  type: string;
  resourceId: string;
  userId: string;
  timestamp: number;
  data: any;
  strategy: ConflictResolutionStrategy;
}

/**
 * Detect conflicts in concurrent edits
 */
export async function detectConflicts(
  resourceId: string,
  newEdit: any,
  lastEditTimestamp: number
): Promise<boolean> {
  // Check if there were edits after the user's last known state
  const recentEdits = await prisma.collaborationEdit.findMany({
    where: {
      roomId: resourceId,
      timestamp: {
        gt: new Date(lastEditTimestamp),
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: 10,
  });

  return recentEdits.length > 0;
}

/**
 * Resolve conflicts using strategy
 */
export async function resolveConflict(
  conflict: Conflict,
  currentState: any,
  incomingState: any
): Promise<any> {
  switch (conflict.strategy.type) {
    case 'last_write_wins':
      // Use the most recent edit
      return incomingState;

    case 'merge':
      // Try to intelligently merge both states
      return mergeStates(currentState, incomingState);

    case 'lock':
      // Prevent simultaneous edits by locking
      return {
        locked: true,
        message: 'Resource is being edited by another user',
        currentState,
      };

    case 'manual':
      // Flag for manual resolution
      return {
        requiresManualResolution: true,
        conflicts: [currentState, incomingState],
      };

    default:
      return currentState;
  }
}

/**
 * Merge two states intelligently
 */
function mergeStates(stateA: any, stateB: any): any {
  if (typeof stateA !== 'object' || typeof stateB !== 'object') {
    // For non-object values, use last write wins
    return stateB;
  }

  // Deep merge objects
  const merged = { ...stateA };

  for (const key in stateB) {
    if (stateB.hasOwnProperty(key)) {
      if (
        stateA[key] &&
        typeof stateA[key] === 'object' &&
        typeof stateB[key] === 'object' &&
        !Array.isArray(stateA[key]) &&
        !Array.isArray(stateB[key])
      ) {
        // Recursively merge nested objects
        merged[key] = mergeStates(stateA[key], stateB[key]);
      } else {
        // Use the new value
        merged[key] = stateB[key];
      }
    }
  }

  return merged;
}

/**
 * Acquire lock for resource editing
 */
export async function acquireLock(
  resourceId: string,
  userId: string,
  timeout: number = 30000 // 30 seconds
): Promise<boolean> {
  try {
    // Check if resource is locked
    const existingLock = await prisma.collaborationRoom.findUnique({
      where: { id: resourceId },
      select: {
        isActive: true,
        settings: true,
      },
    });

    if (!existingLock) {
      return false;
    }

    const settings = existingLock.settings
      ? JSON.parse(existingLock.settings)
      : {};

    if (settings.lockedBy && settings.lockedBy !== userId) {
      const lockTime = settings.lockedAt || 0;
      const now = Date.now();

      // Check if lock has expired
      if (now - lockTime > timeout) {
        // Lock expired, acquire it
        await updateLock(resourceId, userId);
        return true;
      }

      return false; // Still locked by another user
    }

    // No lock or locked by this user
    await updateLock(resourceId, userId);
    return true;
  } catch (error) {
    console.error('[Conflict Resolution] Error acquiring lock:', error);
    return false;
  }
}

/**
 * Release lock for resource editing
 */
export async function releaseLock(resourceId: string, userId: string): Promise<void> {
  try {
    const room = await prisma.collaborationRoom.findUnique({
      where: { id: resourceId },
      select: { settings: true },
    });

    if (!room) return;

    const settings = room.settings ? JSON.parse(room.settings) : {};

    if (settings.lockedBy === userId) {
      settings.lockedBy = null;
      settings.lockedAt = null;

      await prisma.collaborationRoom.update({
        where: { id: resourceId },
        data: {
          settings: JSON.stringify(settings),
        },
      });
    }
  } catch (error) {
    console.error('[Conflict Resolution] Error releasing lock:', error);
  }
}

/**
 * Update lock settings
 */
async function updateLock(resourceId: string, userId: string): Promise<void> {
  const room = await prisma.collaborationRoom.findUnique({
    where: { id: resourceId },
    select: { settings: true },
  });

  if (!room) return;

  const settings = room.settings ? JSON.parse(room.settings) : {};
  settings.lockedBy = userId;
  settings.lockedAt = Date.now();

  await prisma.collaborationRoom.update({
    where: { id: resourceId },
    data: {
      settings: JSON.stringify(settings),
    },
  });
}

/**
 * Check if resource is locked
 */
export async function isLocked(resourceId: string): Promise<boolean> {
  try {
    const room = await prisma.collaborationRoom.findUnique({
      where: { id: resourceId },
      select: { settings: true },
    });

    if (!room) return false;

    const settings = room.settings ? JSON.parse(room.settings) : {};
    return !!settings.lockedBy;
  } catch (error) {
    console.error('[Conflict Resolution] Error checking lock:', error);
    return false;
  }
}

