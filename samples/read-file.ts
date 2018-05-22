import { Cnysa } from 'cnysa';
import { AsyncResource } from 'async_hooks';
import { wrapPool, AsyncTask } from '../src/wrap-pool';
import * as fs from 'fs';

export function runReadFileSample(sampleName: string) {
  const c = Cnysa.get();

  // Re-define readFile, creating a new AsyncResource object corresponding to
  // the readFile call.
  const readFile: AsyncTask<string, string> = (input, cb) => {
    const a1 = new AsyncResource('fs.readFile');
    fs.readFile(input, 'utf8', (err: Error, output: string) => {
      a1.runInAsyncScope(() => {
        cb(err, output);
      });
      a1.emitDestroy();
    });
  };
  const pooledReadFile: AsyncTask<string, string> = wrapPool(readFile, 1);

  switch (sampleName) {
    case 'read-file': {
      new AsyncResource('[request-1]').runInAsyncScope(() => {
        readFile('package.json', () => {
          c.mark('file 1 opened');
        });
      });
      new AsyncResource('[request-2]').runInAsyncScope(() => {
        readFile('package.json', () => {
          c.mark('file 2 opened');
        });
      });
      break;
    }
    case 'read-file-pooled': {
      new AsyncResource('[request-1]').runInAsyncScope(() => {
        pooledReadFile('package.json', () => {
          c.mark('file 1 opened');
        });
      });
      new AsyncResource('[request-2]').runInAsyncScope(() => {
        pooledReadFile('package.json', () => {
          c.mark('file 2 opened');
        });
      });
      break;
    }
    default: {
      console.log('Please see samples/read-file.ts for a list of samples');
    }
  }
}
