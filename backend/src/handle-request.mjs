import * as path from 'jsr:@std/path';
import handleAPIRequest from './handle-api-request.mjs';
import handleWebSocketUpgradeRequest from './handle-web-socket-upgrade-request.mjs';
import { kv } from '@store';

Deno.serve(async req => {
  if (req.headers.get('upgrade') === 'websocket') {
    return await handleWebSocketUpgradeRequest(req);
  }

  const url = new URL(req.url);
  const { pathname } = url;

  // In lieu of escaping pathname, just return Bad Req for '..'
  if (pathname.includes('..'))
    return new Response('Invalid pathname', { status: 400 });

  const { signal } = req;

  if (pathname.startsWith('/api/')) {
    return await handleAPIRequest(req);
  }

  const extension = path.extname(pathname);

  if (pathname.match(/^\/frontend\/(?:src|assets)\//)) {
    const localPath = path.join('.', pathname);
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

  if (!extension) {
    const importMap =
      await Deno.readTextFile("./frontend/src/import_map.json", { signal });
    const index = (await Deno.readTextFile("./index.html", { signal }))
      .replace('__IMPORTMAP__', importMap);

    return new Response(index, {
      headers: {
        "Content-Type": "text/html",
        "X-Visitor-Count": await getNextVisitorCount(),
      },
    });
  }

  return new Response("Not found", { status: 404 });
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
    case ".png":
      return "image/png";
    default:
      throw new Error(`Serving unknown file extension: ${ extension }`);
  }
}

async function getNextVisitorCount() {
  const key = [ 'visitor-count' ];
  // Make sure the key exists
  await kv
    .atomic()
    .check({ key, versionstamp: null })
    .set(key, new Deno.KvU64(0n))
    .commit();

  // Increment the count
  await kv
    .atomic()
    .sum(key, 1n)
    .commit();

  // Get the count, unwrapping the KvU64 value
  return (await kv.get(key)).value.value;
}