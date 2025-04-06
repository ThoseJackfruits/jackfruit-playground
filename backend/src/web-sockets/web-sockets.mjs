class WebSockets {
  /** @type {Set<WebSocket>} */
  sockets = new Set();

  broadcastIncoming(dataRaw) {
    let data;

    try {
      data = JSON.parse(dataRaw);
    } catch (error) {
      console.error('Error parsing message:', error);
      return;
    }

    dispatchEvent(new CustomEvent('ws-message', {
      detail: { data }
    }));

    if (data.name) {
      dispatchEvent(new CustomEvent(`ws-message-${ data.name }`, {
        detail: { data }
      }));
    }
  }

  broadcastOutgoing(data) {
    for (const socket of this.sockets) {
      socket.send(JSON.stringify(data));
    }
  }

  add(socket) {
    this.sockets.add(socket);
  }

  remove(socket) {
    this.sockets.delete(socket);
  }
}

export default new WebSockets();