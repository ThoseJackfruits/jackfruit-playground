import routes from './api-routes/index.mjs';

/**
 * 
 * @param {Request} req 
 */
export default async function handleAPIRequest(req) {
  const url = new URL(req.url);
  const { pathname } = url;

  for (let route of routes) {
    if (route.pathname === pathname) {
      return await route.handle(req);
    }
  }

  return new Response("Not found", { status: 404 });
}
