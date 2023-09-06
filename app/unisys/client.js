/* eslint-disable no-debugger */
if (window.NC_DBG) console.log(`inc ${module.id}`);
/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  This is the main browser client UNISYS module, which implements:

    LIFECYCLE - a promise-based hooked run order system
    MESSAGING - a networked remote procedure call/event system
    STATE     - a networked global application state system

  UNISYS is designed to work with React or our own module system:
  for modules:
    UMOD = UNISYS.NewModule()
    UDATA = UNISYS.NewDataLink(UMOD)
  for React:
    COMPONENT = class MyComponent extends UNISYS.Component

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const DBG = {
  hook: false
};

/// CLASSES ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import UniData, {
  ValidateMessageNames,
  MessageNames
} from 'unisys/client-datalink-class';
import UniModule from 'unisys/client-module-class';
import UniComponent from 'unisys/client-react-component';

/// LIBRARIES /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { ForceReloadSingleApp, ForceReloadOnNavigation } from 'settings';
import { Hook, SetScope, Scope, Execute } from 'unisys/client-lifecycle';
import STATE from 'unisys/client-state';
import { IsStandaloneMode, Connect, SocketUADDR } from 'unisys/client-network';
import { Pad } from 'system/util/prompts';
const PR = Pad('UNISYS');

/// INITIALIZE MAIN MODULE ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var UNISYS = new UniModule(module.id);
var UDATA = new UniData(UNISYS);

/// UNISYS MODULE MAKING //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: Make new module with UNISYS convenience methods
 */
UNISYS.NewModule = uniqueName => {
  return new UniModule(uniqueName);
};

/// UNISYS CONNECTOR //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: Make new module with UNISYS convenience methods
 */
UNISYS.NewDataLink = (module, optName) => {
  return new UniData(module, optName);
};

/// UNISYS MESSAGE REGISTRATION ///////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
UNISYS.RegisterMessagesPromise = (messages = []) => {
  if (IsStandaloneMode()) {
    console.warn(PR, 'STANDALONE MODE: RegisterMessagesPromise() suppressed!');
    return Promise.resolve();
  }
  if (messages.length) {
    try {
      messages = ValidateMessageNames(messages);
    } catch (e) {
      console.error(e);
    }
  } else {
    messages = MessageNames();
  }
  return new Promise((resolve, reject) => {
    UDATA.Call('SRV_REG_HANDLERS', { messages }).then(data => {
      resolve(data);
    });
  });
};

/// LIFECYCLE METHODS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: LIFECYCLE Hook() functions
 */
UNISYS.Hook = (phase, f) => {
  if (typeof phase !== 'string') throw Error('arg1 is phase as string');
  if (typeof f !== 'function') throw Error('arg2 is function callback');
  Hook(phase, f, UNISYS.ModuleID()); // pass phase and hook function
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: System Initialize
 */
UNISYS.SystemInitialize = module_id => {
  UNISYS.SetScope(module_id);
  ForceReloadSingleApp();
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API HELPER: LIFECYCLE Scope() functions
    The 'scope' is used by LIFECYCLE to determine what modules implementing
    various HOOKS will be called. The root_module_id is a path that will
    be considered the umbrella of "allowed to hook" modules. For REACT apps,
    this is the root directory of the root view component. Additionally,
    the unisys and system directories are allowed to run their hooks
 */
UNISYS.SetScope = root_module_id => {
  SetScope(root_module_id); // pass phase and hook function
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API HELPER: SETTINGS ForceReloadSingleApp
    checks to see if settings flag is "dirty"; if it is, then reload the
    location to ensure no linger apps are running in the background. Yes
    this is a bit of a hack.
 */

UNISYS.ForceReloadOnNavigation = () => {
  ForceReloadOnNavigation();
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API HELPER: return TRUE if passed module.id is within the current set
    scope
 */
UNISYS.InScope = module_id => {
  let currentScope = Scope();
  return module_id.includes(currentScope);
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: application startup
 */
UNISYS.EnterApp = async () => {
  try {
    await Execute('TEST_CONF'); // TESTCONFIG hook
    await Execute('INITIALIZE'); // INITIALIZE hook
    await Execute('LOADASSETS'); // LOADASSETS hook
    await Execute('CONFIGURE'); // CONFIGURE support modules
  } catch (e) {
    console.error(
      'EnterApp() Lifecycle Error. Check phase execution order effect on data validity.\n',
      e
    );
    debugger;
  }
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: call this when the view system's DOM has stabilized and is ready
    for manipulation by other code
 */
UNISYS.SetupDOM = async () => {
  try {
    await Execute('DOM_READY'); // GUI layout has finished composing
  } catch (e) {
    console.error(
      'SetupDOM() Lifecycle Error. Check phase execution order effect on data validity.\n',
      e
    );
    debugger;
  }
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: network startup
 */
UNISYS.JoinNet = () => {
  return new Promise((resolve, reject) => {
    try {
      Connect(UDATA, { success: resolve, failure: reject });
    } catch (e) {
      console.error(
        'EnterNet() Lifecycle Error. Check phase execution order effect on data validity.\n',
        e
      );
      debugger;
    }
  });
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: configure system before run
 */
UNISYS.SetupRun = async () => {
  try {
    await Execute('RESET'); // RESET runtime datastructures
    await Execute('START'); // START running
    await Execute('APP_READY'); // tell network APP_READY
    await Execute('RUN'); // tell network APP_READY
  } catch (e) {
    console.error(
      'SetupRun() Lifecycle Error. Check phase execution order effect on data validity.\n',
      e
    );
    debugger;
  }
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: handle periodic updates for a simulation-driven timestep
 */
UNISYS.Run = async () => {
  r;
  try {
    await Execute('UPDATE');
  } catch (e) {
    console.error(e);
  }
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: do the Shutdown lifecycle
    NOTE ASYNC ARROW FUNCTION (necessary?)
 */
UNISYS.BeforePause = async () => {
  await Execute('PREPAUSE');
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: do the Shutdown lifecycle
    NOTE ASYNC ARROW FUNCTION (necessary?)
 */
UNISYS.Paused = async () => {
  await Execute('PAUSE');
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: do the Shutdown lifecycle
    NOTE ASYNC ARROW FUNCTION (necessary?)
 */

UNISYS.PostPause = async () => {
  await Execute('POSTPAUSE');
  resolve();
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: do the Shutdown lifecycle
    NOTE ASYNC ARROW FUNCTION (necessary?)
 */
UNISYS.CleanupRun = async () => {
  await Execute('STOP');
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: application offline
    NOTE ASYNC ARROW FUNCTION (necessary?)
 */
UNISYS.ServerDisconnect = async () => {
  await Execute('DISCONNECT');
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** API: application shutdown
    NOTE ASYNC ARROW FUNCTION (necessary?)
 */
UNISYS.ExitApp = async () => {
  await Execute('UNLOADASSETS');
  await Execute('SHUTDOWN');
};

/// NETWORK INFORMATION ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return the current connected Socket Address (e.g. UADDR_12)
 */

UNISYS.SocketUADDR = () => {
  return SocketUADDR();
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
UNISYS.IsStandaloneMode = () => {
  return IsStandaloneMode();
};

/// DATA LOGGING //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** send a logging message
 */
UNISYS.Log = (event, ...items) => {
  if (typeof event !== 'string') {
    console.error("UNISYS.Log( 'eventString', value, value, value... )");
  }
  UDATA.NetSignal('SRV_LOG_EVENT', { event, items });
};

/// REACT INTEGRATION /////////////////////////////////////////////////////////
/** return the referene to the UNISYS extension of React.Component
 */
UNISYS.Component = UniComponent;

/// EXPORT MODULE DEFINITION //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default UNISYS;
