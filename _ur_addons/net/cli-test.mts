/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  urnet net test CLI commands
  imported by @api-cli.mts and uses its process.argv

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR, PROC } from '@ursys/netcreate';
// note: ts files imported by node contain { default }
import EP_DEFAULT, { EP_Socket } from './class-urnet-endpoint.ts';
import NP_DEFAULT from './class-urnet-packet.ts';
import RT_DEFAULT from './urnet-types.ts';
// destructure defaults
const NetEndpoint = EP_DEFAULT.default;
const NetPacket = NP_DEFAULT.default;
const { AllocateAddress } = RT_DEFAULT;

/// TYPE DECLARATIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type T_Endpoint = InstanceType<typeof NetEndpoint>;
type T_Packet = InstanceType<typeof NetPacket>;

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('TEST', 'TagGreen');
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

    ep.registerHandler('FOO', async data => {
      console.log('FOO handler called, returned data: ', data);
      data.one = 1;
      return 'one';
    });
    ep.registerHandler('FOO', async data => {
      console.log('FOO handler 2 called, returned data: ', data);
      data.two = 2;
      return 'two';
    });

    // directly invoke the endpoint

    ep.call('FOO', { bar: 'baz' }).then(data => {
      LOG('test 1: FOO call returned: ', data);
    });

    ep.send('LOCAL:FOO', { bar: 'banana' }).then(data => {
      LOG('test 2: LOCAL:FOO send returned void:', data === undefined);
    });

    /* skip signal because it's the same as send in the local context */

    // test the different versions of local message calls

    let pingStat = ep.ping(':FOO') ? 'PING OK' : 'PING FAIL';
    LOG('test 3:', pingStat);

    pingStat = ep.ping('FOO') ? 'PING OK' : 'PING FAIL';
    LOG('test 4:', pingStat);

    pingStat = ep.ping('LOCAL:FOO') ? 'PING OK' : 'PING FAIL';
    LOG('test 5:', pingStat);

    /* end tests */
  } catch (err) {
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

    ep.registerHandler('BAR', async data => {
      data.result = data.result || [];
      data.result.push('one');
      console.log('BAR handler called, returned data: ', data);
      return data;
    });
    ep.registerHandler('BAR', async data => {
      data.result = data.result || [];
      data.result.push('two');
      console.log('BAR handler called, returned data: ', data);
      return data;
    });

    // simulate the endpoint remote handler

    ep.call('BAR', { foo: 'meow' }).then(data => {
      LOG('test 1: BAR netCall returned: ', data);
    });

    /* end tests */
  } catch (err) {
    LOG.error(err.message);
    LOG.info(err.stack.split('\n').slice(1).join('\n').trim());
  }
}

/// PACKET TESTS //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RunPacketTests() {
  LOG('Running Packet Tests');
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function tc() {
    let self = tc as any;
    if (self.count === undefined) self.count = 0;
    return `Test ${++self.count}`;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function PT_CreateHost(name: string) {
    const host: T_Endpoint = new NetEndpoint();

    /// REGISTER HANDLERS
    name = name.toUpperCase();
    const netMsg = `NET:${name}`;
    const msg = name;
    //
    host.registerHandler(netMsg, data => {
      LOG(`<<< HANDLER: host recv '${netMsg}' <<<`, data);
      data.host = `${netMsg} says hello`;
      LOG(`>>> HANDLER: host retn >>>`, data);
      return data;
    });
    host.registerHandler(msg, data => {
      LOG(`<<< HANDLER: host recv '${msg}' <<<`, data);
      data.host = `${msg} says hello`;
      LOG(`>>> HANDLER: host retn >>>`, data);
      return data;
    });

    return host;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function PT_CreateRemote(name: string) {
    const remote: T_Endpoint = new NetEndpoint();

    /// REGISTER HANDLERS
    name = name.toUpperCase();
    const netMsg = `NET:${name}`;
    const msg = name;
    remote.registerHandler(netMsg, data => {
      LOG(`<<< HANDLER: remote recv '${netMsg}' <<<`, data);
      data.remote = `${netMsg} says hello`;
      LOG(`>>> HANDLER: remote retn >>>`, data);
      return data;
    });
    remote.registerHandler(msg, data => {
      LOG(`<<< HANDLER: remote recv '${msg}' <<<`, data);
      data.remote = `${msg} says hello`;
      LOG(`>>> HANDLER: remote retn >>>`, data);
      return data;
    });

    return remote;
  }

  /// RUNTIME PACKET TESTS ////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  try {
    // create endpoint handler for server
    const host = PT_CreateHost('server');
    const serverAddr = AllocateAddress({ prefix: 'SRV' });
    host.configAsServer(serverAddr);

    // create endpoint handler for clients
    const gateway = {
      send: (pkt: T_Packet) => host.pktReceive(pkt)
    };
    const add_client = (name: string) => {
      const client = PT_CreateRemote(name);
      const sock = {
        send: (pkt: T_Packet) => client.pktReceive(pkt)
      };
      const addr = host.addClient(sock);
      client.configAsClient(addr, gateway);
      return client;
    };
    const alice = add_client('alice');
    const bob = add_client('bob');

    // register messages for clients
    host.registerRemoteMessages(alice.urnet_addr, alice.listMessages());
    host.registerRemoteMessages(bob.urnet_addr, bob.listMessages());

    // test the different versions of local message calls
    host.call('ALICE', { caller: 'alice' }).then(data => {
      LOG(tc(), 'host ALICE call returned', data);
    });
    host.call('SERVER', { caller: 'server' }).then(data => {
      LOG(tc(), 'host SERVER call returned', data);
    });
    alice.netCall('NET:BOB', { caller: 'alice' }).then(data => {
      LOG(tc(), 'NET:BOB netCall returned', data);
    });

    /* end tests */
  } catch (err) {
    LOG.error(err.message);
    LOG.info(err.stack.split('\n').slice(1).join('\n').trim());
  }
}

/// TEST METHODS //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RunTests() {
  // RunLocalTests();
  // RunPacketLoopbackTests();
  RunPacketTests();
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { RunTests };
