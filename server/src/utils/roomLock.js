/**
 * Per-room mutex — serializes transitions so two socket events cannot
 * corrupt the same room state concurrently.
 */
export class RoomLock {
  constructor() {
    this.queues = new Map();
  }

  async run(roomCode, fn) {
    const code = roomCode?.toUpperCase();
    if (!code) throw new Error('Invalid room code for lock');

    const previous = this.queues.get(code) || Promise.resolve();
    let release;
    const current = new Promise((resolve) => {
      release = resolve;
    });

    const chain = previous.then(() => current);
    this.queues.set(code, chain);

    try {
      await previous;
      return await fn();
    } finally {
      release();
      if (this.queues.get(code) === chain) {
        this.queues.delete(code);
      }
    }
  }
}
