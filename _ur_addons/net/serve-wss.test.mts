import { Stop } from './serve-wss';

describe('Stop', () => {
  it('should close all clients and the server', async () => {
    // Mock WSS and its clients
    const WSS = {
      clients: [{ close: jest.fn() }, { close: jest.fn() }, { close: jest.fn() }],
      close: jest.fn()
    };

    // Mock WSS_INFO
    const WSS_INFO = {
      ws_url: 'ws://localhost:8080'
    };

    // Replace the original WSS and WSS_INFO with the mocks
    jest.spyOn(global, 'WSS', 'get').mockReturnValue(WSS);
    jest.spyOn(global, 'WSS_INFO', 'get').mockReturnValue(WSS_INFO);

    // Call the Stop function
    await Stop();

    // Assert that all clients were closed
    expect(WSS.clients.every(client => client.close.mock.calls.length === 1)).toBe(
      true
    );

    // Assert that the server was closed
    expect(WSS.close.mock.calls.length).toBe(1);
  });
});
