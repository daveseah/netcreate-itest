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
  try {
    /** CONFIGURE HOST **/

    const host = new NetEndpoint();
    const host_remotes = new Map();
    //
    const host_in = (...data) => {
      const pkt = host.newPacket();
      pkt.setFromObject(data);
      if (pkt.data === undefined) LOG('host_in: pkt.data is undefined');
      host.receivePacket(pkt);
    };
    const host_out = pkt => {
      if (pkt.data === undefined) LOG('host_out: pkt.data is undefined');
      const remep = host_remotes.get(pkt);
      remep.receivePacket(pkt);
    };
    //
    host.registerHandler('NET:SRV', data => {
      LOG(`<<< HANDLER: host recv 'NET:SRV' <<<`, data);
      data.host = 'NET:SRV says hello';
      LOG(`>>> HANDLER: host retn >>>`, data);
      return data;
    });

    /** CONFIGURE REMOTES **/

    const remotes = [];
    for (let num = 3; num > 0; num--) remotes.push(new NetEndpoint());
    remotes.forEach((remep, i) => {
      let index = i;
      remep.urnet_addr = AllocateAddress({ label: `remote${index}` });
      host_remotes.set(remep.urnet_addr, remep);
      const r_out = pkt => {
        host.receivePacket(pkt);
      };
      const r_in = data => remep.receivePacket(data);
      remep.setWireOut(r_out);
      remep.setWireIn(r_in);
      const msgName = `NET:REMOTE${index}`;
      console.log('.. registering handler for', msgName);
      remep.registerHandler(msgName, data => {
        if (data === undefined) {
          LOG.error(`error: ${msgName} handler received undefined data`);
          data = {};
        }
        LOG(`<<< HANDLER: remote[${i}] recv 'NET:REMOTE${index}' <<< data`, data);
        data.remote = `${msgName} says hello`;
        LOG(`>>> HANDLER: ${remep.urnet_addr} retn >>>`, data);
        return data;
      });
      const handlers = [msgName];
      host._setRemoteMessages(remep.urnet_addr, handlers);
    });

    // allocate server address last so it's UA003
    host.setAddress(AllocateAddress({ label: 'host' }));
    host.setWireOut(host_out);
    host.setWireIn(host_in);

    /** SEND TESTS **/

    const u_send_remote = (src, dst) => {
      const data = {};
      const msgName = `NET:REMOTE${dst}`;
      data[`remote${src}`] = 'calling';
      const remep = remotes[src];
      LOG(`<<< ${remep.urnet_addr} send '${msgName}' <<<`, data);
      remep.netSend(msgName, data).then(data => {
        LOG(`>>> ${remep.urnet_addr} recv '${msgName}' >>>`, data);
      });
    };

    u_send_remote(0, 1);

    // host.netSend('NET:REMOTE1', { host: 'calling' }).then(data => {
    //   LOG(`>>> DONE: host recv 'NET:REMOTE1 >>>`, data);
    // });

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
