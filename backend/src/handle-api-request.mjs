import routes from './api-routes/index.mjs';

/**
 * 
 * @param {Request} request 
 */
export default async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const { pathname } = url;

  let path = routes[pathname];
  if (!path)
    return new Response("Not found", { status: 404 });

  let method = path[request.method];
  if (!method)
    return new Response("Not found", { status: 404 });

  return await method.handle({ request });
}
