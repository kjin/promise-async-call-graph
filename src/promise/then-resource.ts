import { AsyncResource } from "async_hooks";

export class ThenResource extends AsyncResource {
  constructor() {
    super('PROMISE-THEN');
  }

  wrap<S, T>(fn: ((value: S) => T)|undefined): ((value: S) => T)|undefined {
    if (typeof fn === 'function') {
      return (value: S) => this.runInAsyncScope(fn, undefined, value);
    } else {
      return fn;
    }
  }
}
