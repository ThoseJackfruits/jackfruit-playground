import { counter } from '@store';

addEventListener('ws-message-counter-increment', async event => {
  await counter.increment();
});
