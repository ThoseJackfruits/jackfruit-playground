import { kv } from '../../kv.mjs';

const key = Object.freeze([ 'counter' ]);

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

// Make sure the key exists
await kv
  .atomic()
  .check({ key, versionstamp: null })
  .set(key, new Deno.KvU64(0n))
  .commit();

// HANDLERS ////////////////////////////////////////////////////////////////////

async function getCounter() {
  let { value } = (await kv.get(key)).value;
  return new Response(JSON.stringify({ value: value.toString() }));
}

async function incrementCounter() {
  // Increment the count
  await kv
    .atomic()
    .sum(key, 1n)
    .commit();

  // Get the count, unwrapping the KvU64 value
  let { value } = (await kv.get(key)).value;
  return new Response(JSON.stringify({ value: value.toString() }));
}
