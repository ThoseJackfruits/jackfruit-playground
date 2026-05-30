import * as path from 'jsr:@std/path';
import handleAPIRequest from './handle-api-request.mjs';
import handleWebSocketUpgradeRequest from './handle-web-socket-upgrade-request.mjs';
import { kv } from '@store';

const CSP = [
  `default-src 'self';`,
  `font-src 'self' https://fonts.gstatic.com;`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;`,
  `img-src 'self';`
].join(' ');

Deno.serve(async req => {
  if (req.headers.get('upgrade') === 'websocket') {
    return await handleWebSocketUpgradeRequest(req);
  }

  const url = new URL(req.url);
  let { pathname } = url;

  // In lieu of escaping pathname, just return Bad Req for '..'
  if (pathname.includes('..'))
    return new Response('Invalid pathname', { status: 400 });

  const { signal } = req;

  if (pathname.startsWith('/api/')) {
    return await handleAPIRequest(req);
  }

  const extension = path.extname(pathname);

  if (pathname.startsWith('/frontend/')) {
    console.log('FRONTEND', pathname);

    try {
      return new Response(await Deno.readFile(localPath, { signal }), {
        headers: {
          'Content-Type': getContentType(extension)
        }
      });
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return new Response('Not found', { status: 404 });
      }

      throw error;
    }
  }


  const assetsPath = path.join('.', 'dist');

  if (pathname === '/' || pathname === '')
    pathname = '/index.html';

  const asset = path.join(assetsPath, pathname.substring(1));
  let assetStat;

  try {
    assetStat = await Deno.stat(asset);
  } catch (error) {
    console.error(error);
  }

  if (assetStat?.isFile) {
    return new Response(await Deno.readFile(asset, { signal }), {
      headers: {
        'Content-Security-Policy': CSP,
        'Content-Type': getContentType(path.extname(asset)),
      }
    });
  }

  const indexPath = path.join(assetsPath, 'index.html');
  return new Response(await Deno.readFile(indexPath, { signal }), {
    headers: {
      'Content-Security-Policy': CSP,
      'Content-Type': 'text/html'
    }
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