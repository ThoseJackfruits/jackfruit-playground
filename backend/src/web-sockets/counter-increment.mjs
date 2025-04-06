import * as store from '../store/index.mjs';

addEventListener('ws-message-counter-increment', async event => {
  await store.counter.increment();
});
