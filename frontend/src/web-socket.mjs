const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const socket = new WebSocket(`${ protocol }//${ window.location.host }/ws`);

socket.addEventListener('open', (event) => {
  console.log('WebSocket connection established');
});

socket.addEventListener('message', (event) => {
  console.log('Message from server:', event.data);
  const data = JSON.parse(event.data);
  dispatchEvent(new CustomEvent('ws-message', {
    detail: { data }
  }));

  if (data.name) {
    dispatchEvent(new CustomEvent(`ws-message-${ data.name }`, {
      detail: { data }
    }));
  }
});

socket.addEventListener('close', (event) => {
  console.log('WebSocket connection closed', event.code, event.reason);
});

socket.addEventListener('error', (event) => {
  console.error('WebSocket error:', event);
});
