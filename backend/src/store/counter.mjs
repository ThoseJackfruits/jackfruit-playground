import { kv } from './kv.mjs';

export const key = Object.freeze([ 'counter' ]);

// Make sure the key exists
await kv
  .atomic()
  .check({ key, versionstamp: null })
  .set(key, new Deno.KvU64(0n))
  .commit();

export async function increment() {
  // Increment the count
  await kv
  .atomic()
  .sum(key, 1n)
  .commit();
}
