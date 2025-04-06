import * as store from '../../store/index.mjs';

// ROUTES //////////////////////////////////////////////////////////////////////

export default {
  '/api/counter': {
    'GET': {
      handle: getCounter,
    },
    'PUT': {
      handle: incrementCounter,
    },
  },
};


// HANDLERS ////////////////////////////////////////////////////////////////////

async function getCounter() {
  let { value } = (await store.kv.get(store.counter.key)).value;
  return new Response(JSON.stringify({ value: value.toString() }));
}

async function incrementCounter() {
  await store.counter.increment();
  let { value } = (await store.kv.get(store.counter.key)).value;
  return new Response(JSON.stringify({ value: value.toString() }));
}
