export function add(a: number, b: number): number {
  return a + b;
}

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
  console.log('Add 2 + 3 =', add(2, 3));
}

Deno.serve((req) => {
  if (req.headers.get('upgrade') !== 'websocket') {
    return new Response('Not a websocket request', {
      status: 400,
      headers: {
        'content-type': 'text/plain',
      },
    });
  }
  const { socket, response } = Deno.upgradeWebSocket(req);
  socket.addEventListener('open', () => {
    console.log('a client connected!');
  });
  socket.addEventListener('message', (event) => {
    if (event.data === 'ping') {
      socket.send('pong');
    }
  });
  return response;
});
