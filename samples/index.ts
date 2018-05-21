import 'cnysa/register'; // Enable hook to collect async events
import { Cnysa } from 'cnysa';
import { AsyncResource } from 'async_hooks';
import { NextTickPromise as Promise } from '../src';

const [_bin, _script, sampleName] = process.argv;

const c = Cnysa.get();

switch (sampleName) {
  case 'then-before-resolve': {
    let p: Promise<undefined>;
    new AsyncResource('parent-1').runInAsyncScope(() => {
      p = new Promise((resolve, reject) => setImmediate(resolve));
    });
    new AsyncResource('parent-2').runInAsyncScope(() => {
      p.then(() => {
        c.mark('A');
      });
    });
    break;
  }
  case 'then-after-resolve': {
    let p: Promise<undefined>;
    new AsyncResource('parent-1').runInAsyncScope(() => {
      p = new Promise((resolve, reject) => resolve());
    });
    new AsyncResource('parent-2').runInAsyncScope(() => {
      setImmediate(() => {
        p.then(() => {
          c.mark('A');
        });
      });
    });
    break;
  }
  case 'promise-all': {
    let p: Promise<undefined>;
    let q: Promise<undefined>;
    new AsyncResource('parent-1').runInAsyncScope(() => {
      p = new Promise((resolve, reject) => resolve());
    });
    new AsyncResource('parent-2').runInAsyncScope(() => {
      q = new Promise((resolve, reject) => resolve());
    });
    new AsyncResource('parent-3').runInAsyncScope(() => {
      setImmediate(() => {
        Promise.all([p, q]).then(() => {
          c.mark('A');
        });
      });
    });
    break;
  }
  default: {
    console.log('Please see samples/index.ts for a list of samples');
  }
}
