import * as store from '../store/index.mjs';
import webSockets from "../web-sockets/web-sockets.mjs";

const key = Object.freeze([ 'counter' ]);

for await (let [ entry ] of store.kv.watch([ key ])) {
  webSockets.broadcastOutgoing({
    name: 'counter',
    count: entry.value?.toString() ?? '0'
  });
}