import { AsyncResource } from "async_hooks";

export class NextTickTaskQueue extends AsyncResource {
  constructor() {
    super('PROMISE-MTQ');
  }

  push(fn: () => void): void {
    process.nextTick(() => this.runInAsyncScope(fn));
  }
}

/**
 * A class that represents an abstraction over a single deferred value.
 * A DeferredValue has a notion of "peers", which are other DeferredValue
 * objects, such that if a peer has had its value resolved, then this object's
 * deferred value will never be resolved. (In a Promise, deferred values
 * represent the eventual value and error object with which resolve and reject
 * will be called respectively, and they are peers of each other.)
 */
export class NextTickDeferredValue<T> {
  private static readonly DEFERRED = Symbol('deferred'); // Sentinel value
  private onFulfillQueue: Array<(value: T) => void> = [];
  private value: T|Symbol = NextTickDeferredValue.DEFERRED;
  private peers: NextTickDeferredValue<any>[] = [];
  private taskQueue: NextTickTaskQueue|null = null;

  /**
   * Specify a new function that will be invoked after the deferred value has
   * been fulfilled. If the deferred value was already fulfilled, it will be
   * invoked promptly (placed into the underlying task queue with the fulfilled
   * value as an argument).
   * @param fn The function to invoke.
   */
  onFulfillValue(fn: (value: T) => void) {
    if (this.checkPeers()) {
      return;
    } else if (this.value !== NextTickDeferredValue.DEFERRED) {
      this.taskQueue!.push(() => fn(this.value as T));
    } else {
      this.onFulfillQueue.push(fn);
    }
  }

  /**
   * Fulfill the deferred value. Any functions that were previously specified
   * to run through `onFulfillValue` will now be placed into the underlying task
   * queue (with the fulfilled value as an argument). After the first call,
   * subsequent calls to this function have no effect.
   * @param value The fulfilled value.
   */
  fulfillValue(value: T) {
    if (this.value !== NextTickDeferredValue.DEFERRED || this.checkPeers()) {
      return;
    }
    this.value = value;
    this.taskQueue = new NextTickTaskQueue();
    this.taskQueue.push(() => {
      this.onFulfillQueue.forEach(fn => fn(value));
      this.onFulfillQueue.length = 0;
    });
    this.peers.forEach(peer => peer.onFulfillQueue.length = 0);
  }

  /**
   * Set "peer" deferred values. If a peer's deferred value is fulfilled first,
   * the other functions on this object have no effect. This means that any
   * functions previously passed to onFulfillValue may never be called.
   * @param peers A list of peer DeferredValue objects.
   */
  setPeers(peers: NextTickDeferredValue<any>[]) {
    this.peers = peers;
  }

  private checkPeers() {
    return this.peers.some(
      peer => peer.value !== NextTickDeferredValue.DEFERRED
    );
  }
}
