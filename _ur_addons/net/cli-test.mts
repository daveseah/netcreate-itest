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
    // configure fake host
    const host = new NetEndpoint();
    const host_remotes = new Map();

    const host_in = (...data) => {
      const pkt = host.newPacket();
      pkt.setFromObject(data);
      if (pkt.data === undefined) LOG('host_in: pkt.data is undefined');
      host.receivePacket(pkt);
    };
    const host_out = pkt => {
      const remotes = [...host_remotes.values()];
      if (pkt.data === undefined) LOG('host_out: pkt.data is undefined');
      remotes.forEach(remep => remep.receivePacket(pkt));
    };
    host.registerHandler('NET:SRV', data => {
      LOG('NET:SRV handler called with data', data);
      return { hello: 'NET:SRV says hello' };
    });

    // configure fake remotes 0 and 1
    const remotes = [];
    for (let num = 3; num > 0; num--) remotes.push(new NetEndpoint());
    remotes.forEach((remep, i) => {
      let index = i + 1;
      remep.urnet_addr = AllocateAddress(`remote${index}`);
      host_remotes.set(remep.urnet_addr, remep);
      const r_out = pkt => {
        host.receivePacket(pkt);
      };
      const r_in = data => remep.receivePacket(data);
      remep.setWireOut(r_out);
      remep.setWireIn(r_in);
      remep.registerHandler(`NET:REMOTE${index}`, data => {
        if (data === undefined) {
          LOG.error(`error: NET:REMOTE${index} handler received undefined data`);
          data = {};
        }
        LOG(`NET:REMOTE${index} handler received data`, data);
        data.remote = `NET:REMOTE${index} says hello`;
        return data;
      });
    });

    // allocate server address last so it's UA003
    host.setAddress(AllocateAddress('host'));
    host.setWireOut(host_out);
    host.setWireIn(host_in);

    host.send('NET:REMOTE1', { host: 'calling' }).then(data => {
      LOG('host <<< NET:REMOTE1', data);
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
