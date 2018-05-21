# Promise + Continuations Samples

This repository contains a userland implementation of Promises, and uses it to explore async call graphs and how they relate to promises.

## Contents

* `src`: Exports a userland implementation of `Promise` named `NextTickPromise`. It uses Node's `nextTick` task queue to introduce asynchrony between Promise resolution and `then` callback invocations.
* `test`: Runs a test that ensures conformance of `NextTickPromise` to the A+ Promise spec.
* `samples`: Contains samples of async call graphs being generated with `NextTickPromise`.

## How to...

### Run Tests

`npm test`

### Run Samples

`npm run sample [sample-name]`
