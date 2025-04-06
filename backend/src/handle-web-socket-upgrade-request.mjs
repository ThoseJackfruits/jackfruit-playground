import webSockets from './web-sockets/web-sockets.mjs';

export default function handleWebSocketUpgradeRequest(req) {
  // Create a WebSocket connection
  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.addEventListener('open', () => {
    console.log("WebSocket open");
    webSockets.add(socket);
  });

  socket.addEventListener('message', (event) => {
    if (event.data) {
      webSockets.broadcastIncoming(event.data);
    }
  });

  socket.addEventListener('error', (error) => {
    console.error("WebSocket error:", error);
    webSockets.remove(socket);
  });

  socket.addEventListener('close', () => {
    console.log("WebSocket close");
    webSockets.remove(socket);
  });

  // Return the WebSocket response
  return response;
}
