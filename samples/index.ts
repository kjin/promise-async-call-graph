import 'cnysa/register'; // Enable hook to collect async events
import { Cnysa } from 'cnysa';
import { AsyncResource } from 'async_hooks';
import { NextTickPromise as Promise } from '../src/promise';
import { wrapPool, AsyncTask } from '../src/wrap-pool';
import { runReadFileSample } from './read-file';

const c = Cnysa.get();

function runSample(sampleName: string) {
  if (sampleName.startsWith('read-file')) {
    runReadFileSample(sampleName);
    return;
  }
  switch (sampleName) {
    case 'relations': {
      const a1 = new AsyncResource('MyAsyncResource');
      setImmediate(() => {
        setImmediate(() => {
          a1.runInAsyncScope(() => {
            setImmediate(() => {
              c.mark('A');
            });
          });
          a1.emitDestroy();
        });
      });
      break;
    }
    case 'userspace-queue': {
      const work: AsyncTask<number, number> = (input, cb) => {
        setTimeout(() => {
          cb(null, input);
        }, input);
      };
      const pooledWork = wrapPool(work, 2);
      pooledWork(1000, () => {});
      pooledWork(1000, () => {});
      pooledWork(1000, () => {
        c.mark('A');
      });
      break;
    }
    case 'then-before-resolve': {
      let p: Promise<undefined>;
      new AsyncResource('[request-1]').runInAsyncScope(() => {
        p = new Promise((resolve, reject) => setImmediate(resolve));
      });
      new AsyncResource('[request-2]').runInAsyncScope(() => {
        p.then(() => {
          c.mark('promise resolved');
        });
      });
      break;
    }
    case 'then-after-resolve': {
      let p: Promise<undefined>;
      new AsyncResource('[request-1]').runInAsyncScope(() => {
        p = new Promise((resolve, reject) => resolve());
      });
      new AsyncResource('[request-2]').runInAsyncScope(() => {
        setImmediate(() => {
          p.then(() => {
            c.mark('promise resolved');
          });
        });
      });
      break;
    }
    case 'promise-all': {
      let p: Promise<undefined>;
      let q: Promise<undefined>;
      new AsyncResource('[request-1]').runInAsyncScope(() => {
        p = new Promise((resolve, reject) => resolve());
      });
      new AsyncResource('[request-2]').runInAsyncScope(() => {
        q = new Promise((resolve, reject) => resolve());
      });
      new AsyncResource('[request-3]').runInAsyncScope(() => {
        setImmediate(() => {
          Promise.all([p, q]).then(() => {
            c.mark('promise resolved');
          });
        });
      });
      break;
    }
    default: {
      console.log('Please see samples/*.ts for a list of samples');
    }
  }
}

const [_bin, _script, sampleName] = process.argv;

runSample(sampleName);
