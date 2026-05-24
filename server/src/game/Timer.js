/**
 * Server-side timer — authoritative time source for all clients
 */
export class GameTimer {
  constructor(onTick, onComplete) {
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.interval = null;
    this.remaining = 0;
    this.total = 0;
    this.running = false;
  }

  start(seconds) {
    this.stop();
    this.total = seconds;
    this.remaining = seconds;
    this.running = true;
    this.onTick(this.remaining, this.total);
    this.interval = setInterval(() => {
      this.remaining -= 1;
      this.onTick(this.remaining, this.total);
      if (this.remaining <= 0) {
        this.stop();
        this.onComplete();
      }
    }, 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.running = false;
  }

  getRemaining() {
    return this.remaining;
  }
}
