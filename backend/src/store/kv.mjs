/** @type {Deno.Kv} */
export const kv = await Deno.env.get('DENO_DEPLOYMENT_ID')
  ? await Deno.openKv() // Use Deno Deploy's KV store
  : await Deno.openKv("./local.db");
