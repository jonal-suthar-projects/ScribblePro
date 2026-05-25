const MAX_PROCESSED = 100;

/**
 * Drop duplicate client actions when actionId is provided.
 * Per-player guards (guessedPlayerIds, fvVotes) remain the primary defense.
 */
export function consumeActionId(room, actionId) {
  if (!actionId) return true;

  if (!room.processedActionIds) {
    room.processedActionIds = new Set();
  }

  if (room.processedActionIds.has(actionId)) {
    return false;
  }

  room.processedActionIds.add(actionId);
  if (room.processedActionIds.size > MAX_PROCESSED) {
    const arr = [...room.processedActionIds];
    room.processedActionIds = new Set(arr.slice(-MAX_PROCESSED));
  }
  return true;
}
