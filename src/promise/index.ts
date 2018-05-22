import { NextTickDeferredValue } from './deferred-value';
import { ThenResource } from './then-resource';

/**
 * An implementation of the `Promise` specification using process.nextTick as
 * a queueing mechanism.
 */
export class NextTickPromise<T> {
  private static readonly UNKNOWN = {};
  private resolved: NextTickDeferredValue<T>;
  private rejected: NextTickDeferredValue<Error>;

  constructor(
    fn: (resolve: (value?: T) => void, reject: (err: Error) => void) => void
  ) {
    // Initialize deferred value storage.
    this.resolved = new NextTickDeferredValue<T>();
    this.rejected = new NextTickDeferredValue<Error>();
    this.resolved.setPeers([this.rejected]);
    this.rejected.setPeers([this.resolved]);
    // Intialize resolve/reject callbacks.
    const reject = (err: Error) => this.rejected.fulfillValue(err);
    const resolve = (value?: T) => {
      let then;
      try {
        // Check if the resolved value is a thenable.
        if (
          value !== null &&
          typeof value === 'object' ||
          typeof value === 'function'
        ) {
          then = (value as any).then;
        }
        if (typeof then === 'function') {
          // The resolved value is indeed a thenable. We should recursively
          // call `then` on the value until we get to one that isn't, and
          // resolve with that value.
          // Since thenables are not constrained to call a single callback,
          // enforce that constraint here by ensuring that only the first
          // call to resolve or reject succeeds.
          let once = false;
          const wrapOnce = <T>(fn: (arg: T) => void) => (arg: T) => {
            if (!once) {
              once = true;
              fn(arg);
            }
          };
          try {
            // Call `then` on the value.
            then.call(value, wrapOnce(resolve), wrapOnce(reject));
          } catch (err) {
            // Reject with a synchronously thrown error.
            wrapOnce(reject)(err);
          }
        } else {
          // The resolved value isn't a thenable, so resolve with it.
          this.resolved.fulfillValue(value as T);
        }
      } catch (err) {
        // Reject with a synchronously thrown error.
        reject(err);
      }
    };
    // Call the passed function synchronously.
    try {
      fn(resolve, reject);
    } catch (err) {
      // Reject with a synchronously thrown error.
      reject(err);
    }
  }
  
  then<S>(
    onResolve?: (value: T) => S|NextTickPromise<S>,
    onReject?: (err: Error) => S|NextTickPromise<S>
  ): NextTickPromise<S|T> {
    const resource = new ThenResource();
    onResolve = resource.wrap(onResolve);
    onReject = resource.wrap(onReject);
    const result = new NextTickPromise<any>((resolve, reject) => {
      // Helper function to queue a callback to run when a deferred value is
      // resolved.
      const addResolutionHandler = <X>(
        deferredValue: NextTickDeferredValue<X>,
        cb: (value: X) => S|NextTickPromise<S>
      ) => {
        // Instead of directly queueing the callback, we queue a wrapper
        // that does some extra checks and error handling.
        deferredValue.onFulfillValue(value => {
          let pending;
          try {
            // Run the callback.
            pending = cb(value);
            if (pending === result) {
              // If an object returns itself through a `then` callback, reject
              // with a TypeError.
              reject(new TypeError());
              return;
            }
          } catch (err) {
            // Reject with a synchronously thrown error.
            reject(err);
            return;
          }
          // Resolve with the value returned by the `then` callback.
          resolve(pending);
        });
      };
      // Register the given callbacks, or "pass-through" callbacks if none
      // are provided.
      if (typeof onResolve === 'function') {
        addResolutionHandler(this.resolved, onResolve);
      } else {
        this.resolved.onFulfillValue(resolve);
      }
      if (typeof onReject === 'function') {
        addResolutionHandler(this.rejected, onReject);
      } else {
        this.rejected.onFulfillValue(reject);
      }
    });
    return result;
  }

  catch<S>(onReject?: (err: Error) => S|NextTickPromise<S>): NextTickPromise<S> {
    return this.then(undefined, onReject) as NextTickPromise<S>;
  }

  static all<T = any>(promises: NextTickPromise<T>[]): NextTickPromise<T[]> {
    return new NextTickPromise((resolve, reject) => {
      const results: T[] = new Array(promises.length);
      let count = 0;
      promises.forEach((promise, index) => {
        promise.then(value => {
          results[index] = value;
          if (++count === results.length) {
            resolve(results);
          }
        }, reject);
      })
    });
  }

  static race<T = any>(promises: NextTickPromise<T>[]): NextTickPromise<T> {
    return new NextTickPromise((resolve, reject) => {
      promises.forEach(promise => promise.then(resolve, reject))
    });
  }

  static resolve<T>(value: T): NextTickPromise<T> {
    return new NextTickPromise((resolve, reject) => {
      resolve(value);
    });
  }

  static reject(err: Error): NextTickPromise<never> {
    return new NextTickPromise((resolve, reject) => {
      reject(err);
    });
  }
}
