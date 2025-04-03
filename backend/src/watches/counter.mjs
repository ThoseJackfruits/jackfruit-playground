import { kv } from '../kv.mjs';
import webSockets from "../web-sockets.mjs";

const key = Object.freeze([ 'counter' ]);

for await (let [ entry ] of kv.watch([ key ])) {
  webSockets.broadcastOutgoing({
    name: 'counter',
    count: entry.value?.toString() ?? '0'
  });
}