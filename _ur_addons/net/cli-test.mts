/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  urnet net test CLI commands
  imported by @api-cli.mts and uses its process.argv

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR, PROC, CLASS } from '@ursys/core';
// note: ts files imported by node contain { default }
import EP_DEFAULT from './class-urnet-endpoint.ts';
import NS_DEFAULT, { I_NetSocket } from './class-urnet-socket.ts';
import NP_DEFAULT from './class-urnet-packet.ts';
import RT_DEFAULT from './urnet-types.ts';
// destructure defaults; these will get moved to ursys core at some point
const { NetEndpoint } = EP_DEFAULT;
const { NetPacket } = NP_DEFAULT;
const { AllocateAddress } = RT_DEFAULT;

/// TYPE DECLARATIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type T_Endpoint = InstanceType<typeof NetEndpoint>;
type T_Packet = InstanceType<typeof NetPacket>;

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('NetTest', 'TagGreen');
const DBG = true;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const [m_script, m_addon, ...m_args] = PROC.DecodeAddonArgs(process.argv);

/// TEST METHODS //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function RunLocalTests() {
  LOG('Running Local Tests');
  try {
    // configure the endpoint handlers

    const ep = new NetEndpoint();

    ep.registerMessage('FOO', async data => {
      LOG('FOO handler called, returned data: ', data);
      data.one = 1;
      return data;
    });
    ep.registerMessage('FOO', async data => {
      LOG('FOO handler 2 called, returned data: ', data);
      data.two = 2;
      return data;
    });

    // directly invoke the endpoint

    ep.call('FOO', { bar: 'baz' }).then(data => {
      LOG('L1 FOO call returned: ', data);
    });

    ep.send('LOCAL:FOO', { bar: 'banana' }).then(data => {
      LOG('L2 LOCAL:FOO send returned:', data);
    });

    /* skip signal because it's the same as send in the local context */

    // test the different versions of local message calls

    let pingStat = ep.ping(':FOO') ? 'PING OK' : 'PING FAIL';
    LOG('L3:', pingStat);

    pingStat = ep.ping('FOO') ? 'PING OK' : 'PING FAIL';
    LOG('L4:', pingStat);

    pingStat = ep.ping('LOCAL:FOO') ? 'PING OK' : 'PING FAIL';
    LOG('L5:', pingStat);

    /* end tests */
  } catch (err) {
    // format the error message to be nicer to read
    LOG.error(err.message);
    LOG.info(err.stack.split('\n').slice(1).join('\n').trim());
  }
}

/// REMOTE LOOPBACK ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RunPacketLoopbackTests() {
  LOG('Running Packet Tests');
  try {
    // configure endpoint handlers

    const ep = new NetEndpoint();

    ep.registerMessage('BAR', async data => {
      data.result = data.result || [];
      data.result.push('one');
      LOG('BAR handler called, returned data: ', data);
      return data;
    });
    ep.registerMessage('BAR', async data => {
      data.result = data.result || [];
      data.result.push('two');
      LOG('BAR handler called, returned data: ', data);
      return data;
    });

    // simulate the endpoint remote handler

    ep.call('BAR', { foo: 'meow' }).then(data => {
      LOG('L3 BAR netCall returned: ', data);
    });

    /* end tests */
  } catch (err) {
    // format the error message to be nicer to read
    LOG.error(err.message);
    LOG.info(err.stack.split('\n').slice(1).join('\n').trim());
  }
}

/// PACKET TESTS //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
async function RunPacketTests() {
  LOG.info('Running Packet Tests');
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function PT_Register(name: string, ep: T_Endpoint) {
    /// REGISTER HANDLERS
    name = name.toUpperCase();
    const netMsg = `NET:${name}`;
    const msg = name;
    //
    ep.registerMessage(netMsg, data => {
      data[name] = `'${netMsg}' succeeded`;
      LOG.info(`'${netMsg}' handler called, returned data: `, data);
      return data;
    });
    ep.registerMessage(msg, data => {
      data[name] = `'${msg}' succeeded`;
      LOG.info(`'${msg}' handler called, returned data: `, data);
      return data;
    });
    return ep;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function PT_AddServer(name: string) {
    const host: T_Endpoint = new NetEndpoint();
    const serverAddr = AllocateAddress({ prefix: 'SRV' });
    host.configAsServer(serverAddr);
    PT_Register(name, host);
    return host;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  async function PT_AddClient(name, host: T_Endpoint, gateway: I_NetSocket) {
    const client: T_Endpoint = new NetEndpoint();
    const sock = {
      send: (pkt: T_Packet) => client.pktReceive(pkt)
    };
    const addr = host.addClient(sock);
    const auth = {
      identity: 'my_voice_is_my_passport',
      secret: 'crypty'
    };
    client.urnet_addr = addr; // hack to set the address
    const authData = await client.connectAsClient(gateway, auth);
    const info = { name: 'UDSClient', type: 'client' };
    const regdata = await client.registerClient(info);
    PT_Register(name, client);
    host.registerRemoteMessages(addr, client.listNetMessages());
    return client;
  }

  /// RUNTIME PACKET TESTS ////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  try {
    // create endpoint handler for server
    const host = PT_AddServer('server');
    const client_gateway = {
      send: (pkt: T_Packet) => host.pktReceive(pkt)
    };

    const alice = await PT_AddClient('alice', host, client_gateway);
    const bob = await PT_AddClient('bob', host, client_gateway);
    const bob2 = await PT_AddClient('bob', host, client_gateway);

    // test test local calls
    host.call('ALICE', { caller: 'host' }).then(data => {
      LOG(1, 'host ALICE call returned', data);
    });
    host.call('SERVER', { caller: 'host' }).then(data => {
      LOG(2, 'host SERVER call returned', data);
    });

    // test network calls
    alice.netCall('NET:BOB', { caller: 'alice' }).then(data => {
      LOG(3, 'NET:BOB netCall returned', data);
    });
    alice.netSend('NET:ALICE', { caller: 'alice' }).then(data => {
      LOG(4, 'NET:ALICE netSend returned', data);
    });
    bob.netPing('NET:SERVER').then(data => {
      LOG(5, 'SERVER netPing NET:SERVER returned', data);
    });
    bob.netPing('NET:BOB').then(data => {
      LOG(6, 'SERVER netPing NET:BOB returned', data);
    });
    bob.netSignal('NET:ALICE', { caller: 'bob' });

    /* end tests */
  } catch (err) {
    // format the error message to be nicer to read
    LOG.error(err.message);
    LOG.info(err.stack.split('\n').slice(1).join('\n').trim());
  }
}

/// RUNTIME OPERATION SEQUENCER TEST ////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RunSeqTests() {
  const ops = new CLASS.OpSequencer('URNET_Handshake');
  const f_connecting = ops => console.log('connecting');
  const f_authenticating = ops => console.log('authenticating');
  const f_registering = ops => console.log('registering');
  const f_listening = ops => console.log('listening');

  ops.addOp('wait', { func: f_connecting });
  ops.addOp('auth', { func: f_authenticating });
  ops.addOp('reg', { func: f_registering });
  ops.addOp('listen', { func: f_listening });

  const f_change = (newOp, oldOp, ops) =>
    console.log('* change *', oldOp._opName, '->', newOp._opName);
  ops.subscribe('listen', f_change);

  let op = ops.next();
  while (op) {
    op.data.func(ops);
    if (ops.matchOp('auth')) console.log('* auth matched in loop *');
    op = ops.next();
  }

  console.log('total ops staged', ops.length);
  ops.dispose();
  try {
    console.log('disposed', ops.length());
  } catch (err) {
    console.log('disposed success');
  }
}

/// TEST METHODS //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RunTests() {
  RunLocalTests();
  RunPacketLoopbackTests();
  RunPacketTests();
  RunSeqTests();
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { RunTests };
