/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  UNISYS server loader

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const DBG = true;

///	LOAD LIBRARIES ////////////////////////////////////////////////////////////
///	- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const UNET      = require('./server-network');

/// CONSTANTS /////////////////////////////////////////////////////////////////
///	- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const PROMPTS    = require('../system/util/prompts');
const PR         = PROMPTS.Pad('SRVLOAD');

/// MODULE VARS ///////////////////////////////////////////////////////////////
///	- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


/// API CREATE MODULE /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var UNISYS = {};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/ Initialize() is called by brunch-server.js to define the default UNISYS
    network values, so it can embed them in the index.ejs file for webapps
    override = { port }
/*/ UNISYS.InitializeNetwork = ( override ) => {
      return UNET.InitializeNetwork(override);
    };
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/ RegisterHandlers() is called before network is started, so they're
    ready to run. These are server-implemented reserved messages.
/*/ UNISYS.RegisterHandlers = () => {
      UNET.HandleMessage('SERVER_REFLECT',function(pkt) {
        pkt.Data().serverSays='REFLECTING';
        pkt.Data().stack.push('SRV_01');
        console.log(PR,'SERVER_REFLECT pkt',pkt.JSON());
        return pkt;
      });
    };
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/	StartNetwork() is called by brunch-server after the Express webserver
/*/	UNISYS.StartNetwork = () => {
      UNET.StartNetwork();
    };

/// EXPORT MODULE DEFINITION //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = UNISYS;
