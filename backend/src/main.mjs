import * as path from "jsr:@std/path";

Deno.serve(async req => {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === '/' || !pathname) {
    // serve the index.html file
    return new Response(await Deno.readTextFile("./index.html", { signal }));
  }

  const localPath = path.join('.', pathname);

  if (pathname.startsWith('/backend/src/')) {
    return new Response(await Deno.readTextFile(localPath, { signal }));
  }

  return new Response("Not found", { status: 404 });
});
