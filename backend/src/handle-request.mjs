import * as path from 'jsr:@std/path';
import handleAPIRequest from './handle-api-request.mjs';

/** @type {Deno.Kv} */
const kv = await Deno.env.get('DENO_DEPLOYMENT_ID')
  ? await Deno.openKv() // Use Deno Deploy's KV store
  : await Deno.openKv("./local.db");

Deno.serve(async req => {
  const url = new URL(req.url);
  const { pathname } = url;
  const { signal } = req;
  const localPath = path.join('.', pathname);
  const extension = path.extname(localPath);

  if (pathname.startsWith('/api/')) {
    return await handleAPIRequest(req);
  }

  if (pathname.startsWith('/frontend/src/')) {
    try {
      return new Response(await Deno.readFile(localPath, { signal }), {
        headers: {
          "Content-Type": getContentType(extension)
        },
      });
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return new Response("Not found", { status: 404 });
      }

      throw error;
    }
  }

  // Init the visitor count to 0 if the key doesn't exist

  return new Response(await Deno.readFile("./index.html", { signal }), {
    headers: {
      "Content-Type": "text/html",
      "X-Visitor-Count": await getNextVisitorCount(),
    },
  });
});

function getContentType(extension) {
  switch (extension) {
    case ".js":
    case ".mjs":
      return "text/javascript";
    case ".css":
      return "text/css";
    case ".html":
      return "text/html";
    default:
      throw new Error(`Serving unknown file extension: ${ extension }`);
  }
}

async function getNextVisitorCount() {
  const key = 'visitor-count';
  // Make sure the key exists
  await kv
    .atomic()
    .check({ key: [ key ], versionstamp: null })
    .set([ key ], new Deno.KvU64(0n))
    .commit();

  // Increment the count
  await kv
    .atomic()
    .sum([ key ], 1n)
    .commit();

  // Get the count, unwrapping the KvU64 value
  return (await kv.get([ key ])).value.value;
}