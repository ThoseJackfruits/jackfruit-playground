import * as path from "jsr:@std/path";

Deno.serve(async req => {
  const url = new URL(req.url);
  const { pathname } = url;
  const { signal } = req;

  if (pathname === '/' || pathname === '') {
    return new Response(await Deno.readFile("./index.html", { signal }), {
      headers: {
        "Content-Type": "text/html",
      },
    });
  }

  if (pathname.startsWith('/frontend/src/')) {
    const localPath = path.join('.', pathname);
    return new Response(await Deno.readFile(localPath, { signal }), {
      headers: {
        "Content-Type": getContentType(localPath),
      },
    });
  }

  return new Response("Not found", { status: 404 });
});

function getContentType(pathname) {
  const ext = path.extname(pathname);

  switch (ext) {
    case ".js":
    case ".mjs":
      return "text/javascript";
    case ".css":
      return "text/css";
    case ".html":
      return "text/html";
    default:
      throw new Error(`Serving unknown file extension: ${ ext }`);
  }
}
