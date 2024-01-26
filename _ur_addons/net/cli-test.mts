/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  urnet net test CLI commands
  imported by @api-cli.mts and uses its process.argv

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { PR, PROC } from '@ursys/netcreate';
// note: ts files imported by node contain { default }
import EP_DEFAULT from './class-urnet-endpoint.ts';
import RT_DEFAULT from './urnet-types.ts';
// destructure defaults
const NetEndpoint = EP_DEFAULT.default;
const { AllocateAddress } = RT_DEFAULT;
// types can be imported as-is
import { NP_Data } from './urnet-types.ts';

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

  function tc() {
    let self = tc as any;
    if (self.count === undefined) self.count = 0;
    return `Test ${++self.count}`;
  }

  function TestCreateHost(name: string) {
    const host = new NetEndpoint();
    const host_remotes = new Map();

    /// REGISTER ADDRESS ///
    name = name.toUpperCase();
    host.urnet_addr = AllocateAddress({ label: name });

    /// REGISTER HANDLERS ///
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

    /// ADDITIONAL METHODS ///
    const xhost = host as any;
    xhost.X_RegisterRemote = (remote: InstanceType<typeof NetEndpoint>) => {
      const addr = remote.urnet_addr;
      host_remotes.set(addr, remote);
      const handled = remote.getMessages();
      const list = handled.map(netMsg => `'${netMsg}'`).join(', ');
      console.log(`host registered ${addr} - ${list}`);
      host._setRemoteMessages(addr, handled);
    };

    /// EXPORT ///
    return xhost;
  }

  function TestCreateRemote(name: string) {
    const remote = new NetEndpoint();

    /// REGISTER ADDRESS ///
    name = name.toUpperCase();
    remote.urnet_addr = AllocateAddress({ label: name });

    /// REGISTER HANDLERS ///
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

    /// ADDITIONAL METHODS ///
    const xremote = remote as any;

    /// EXPORT ///
    return xremote;
  }

  try {
    // create endpoint handlers
    const host = TestCreateHost('server');
    const alice = TestCreateRemote('alice');
    const bob = TestCreateRemote('bob');
    // manually register remotes to the host
    // simulating the connection handshake and message list capture
    host.X_RegisterRemote(alice);
    host.X_RegisterRemote(bob);

    // test endpoint local handler
    alice.call('ALICE', { caller: 'alice' }).then(data => {
      LOG(tc(), 'ALICE call returned', data);
    });
    host.call('SERVER', { caller: 'server' }).then(data => {
      LOG(tc(), 'SERVER call returned', data);
    });

    /**** WORKS UP TO HERE ****/

    alice.netCall('NET:ALICE', { caller: 'alice' }).then(data => {
      LOG(tc(), 'NET:ALICE netCall returned', data);
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
