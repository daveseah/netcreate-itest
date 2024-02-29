/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URSYS State Manager Class
  ported from GEMSTEP circa 2021

  For use by modular application core features that require a centralized
  state object that can be shared between modules. It manages named groups
  of flattened state (react compatible) that are not allowed to have
  overlapping property names across any group. This is to prevent lazy
  reuse of property names in different parts of the app.

  In general, methods that begin with _ are the tricky ones that are used
  internally by an "appcore" module that is the single source of initialization
  and truth. 

  DATA STRUCTURES

  * vmStateEvent is an object with event-specific properties. When sent
    to subscribers, it contains a groupName property matching the name of
    the StateManager instance (e.g. LOCALE). This is not required (or even
    settable) when using SendState( vmStateEvent )
  * The difference between vmStateEvent and vmState is that the latter is
    the complete state object, whereas the event has the same shape but
    only includes the changed properties

  SIMPLE EXAMPLE

  // in managing appcore module
  const STORE = new StateMgr('ScriptWizard');
  STORE._initializeState({
    prop1: 'value1',
    prop2: 'value2'
  });
  const { prop1, prop2 } = STORE.State();

  // in read-only module
  const OTHER = StatMgr.GetStateManager('ScriptWizard');
  const { prop1, prop2 } = OTHER.State();
  
  API REFERENCE

  State: groupName => TStateObj;
  SendState: TStateObj => void;
  subscribeState: TStateChangeFunc => void;
  unsubscribeState: TStateChangeFunc => void;
  queueEffect: TEffectFunc => void;

  INTERNAL API for APPCORE MANAGERS ONLY

  _initializeState: TStateObj => void;
  _setState: TStateObj => void;
  _insertStateEvent: (TStateObj, TEffectFunc) => void;
  _interceptState: TTapFunc => void;
  _isValidState: TStateObj => boolean;
  _mergeState: TStateObj => TStateObj;
  _notifySubs: TStateObj => void;
  _enqueue: TQueuedAction => void;
  _dequeue: void => void;
  _doEffect: void => void;

  STATIC API
  
  GetStateManager: groupName => StateMgr;
  GetStateData: groupName => TStateObj;
  GetInstance: groupName => StateMgr;

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// TYPE DECLARATIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type TStateObj = { [key: string]: any };
type TGroupName = string; // must be uppercase
type TPropName = string; // must be lowercase
type TGroupMap = Map<TGroupName, StateMgr>; // group name --> class instance
type TUsedProps = Map<TPropName, TGroupName>; // unique prop --> owning group
type TStateChangeFunc = (newState: TStateObj, curState: TStateObj) => void;
type TEffectFunc = () => void;
type TTapFunc = (state: TStateObj) => void;
type TQueuedAction = { stateEvent: TStateObj; callback: Function };
interface IStateMgr {
  State: (key: string) => TStateObj;
  SendState: (vmStateEvent: TStateObj, callback: Function) => void;
  subscribeState: (subFunc: TStateChangeFunc) => void;
  unsubscribeState: (subFunc: TStateChangeFunc) => void;
  queueEffect: (effectFunc: TEffectFunc) => void;
  _initializeState: (stateObj: TStateObj) => void;
  _setState: (vmState: TStateObj) => void;
  _interceptState: (tapFunc: TTapFunc) => void;
  _insertStateEvent: (stateEvent: TStateObj, callback: TEffectFunc) => void;
  _isValidState: (stateObj: TStateObj) => boolean;
  _mergeState: (stateObj: TStateObj) => TStateObj;
  _notifySubs: (stateObj: TStateObj) => void;
  _enqueue: (action: TQueuedAction) => void;
  _dequeue: () => void;
  _doEffect: () => void;
}

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const VM_STATE: TStateObj = {}; // global viewstate
const GROUPS: TGroupMap = new Map(); // lookup table of state managers
const USED_PROPS: TUsedProps = new Map(); // owner of registered properties

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class StateMgr {
  name: string; // the name of this state group
  init: boolean; // true if _initializeState has been called
  subs: Set<TStateChangeFunc>;
  queue: any[]; // queued state changes
  taps: TTapFunc[]; // queued state interceptor hooks
  effects: TEffectFunc[]; // queued side effects

  /// CONSTRUCTOR /////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  constructor(groupName: TGroupName) {
    if (typeof groupName !== 'string') throw Error('groupName must be a string');
    groupName = groupName.trim().toUpperCase();
    // return an existing instance if it exists
    if (GROUPS.has(groupName)) {
      console.warn(
        `(not an error) '${groupName}' construction duplicate, returning existing instance`
      );
      return GROUPS.get(groupName);
    }
    // otherwise create a new instance and save it
    this.name = groupName;
    this.init = false;
    this.subs = new Set();
    this.queue = [];
    this.taps = [];
    this.effects = [];
    VM_STATE[this.name] = {};
    // bind 'this' for use with async code
    // if you don't do this, events will probably not have instance context
    this.state = this.state.bind(this);
    this.sendState = this.sendState.bind(this);
    this.subscribeState = this.subscribeState.bind(this);
    this.unsubscribeState = this.unsubscribeState.bind(this);
    this.queueEffect = this.queueEffect.bind(this);
    this._initializeState = this._initializeState.bind(this);
    this._setState = this._setState.bind(this);
    this._insertStateEvent = this._insertStateEvent.bind(this);
    this._interceptState = this._interceptState.bind(this);
    this._isValidState = this._isValidState.bind(this);
    this._mergeState = this._mergeState.bind(this);
    this._notifySubs = this._notifySubs.bind(this);
    this._enqueue = this._enqueue.bind(this);
    this._dequeue = this._dequeue.bind(this);
    this._doEffect = this._doEffect.bind(this);
    // save the instance
    GROUPS.set(this.name, this);
  }

  /// MAIN CLASS METHODS //////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Return a COPY of the current clonedEvent */
  state(key: string): TStateObj {
    // const state = { ...VM_STATE[this.name] };
    const state = this._derefProps({ ...VM_STATE[this.name] });
    if (typeof key === 'string' && key.length > 0) return state[key];
    return state;
  }

  /** Handle a clonedEvent update from a subscribing module. The incoming
   *  vmstateEvent is checked against the master state object to ensure it
   *  contains valid keys. Any filter functions are allowed to mutate a copy of
   *  the incoming state event.
   *  @param {object} vmStateEvent - object with group-specific props
   */
  sendState(vmStateEvent: TStateObj, callback: Function) {
    if (this._isValidState(vmStateEvent)) {
      const clonedEvent = this._cloneStateObject(vmStateEvent);
      this.taps.forEach(tap => tap(clonedEvent));
      // queue the action for processing
      const action = { stateEvent: clonedEvent, callback };
      this._enqueue(action);
    } else throw Error('SendState: invalid vmState update received, got:');
  }

  /** Subscribe to state. The subscriber function looks like:
   *  ( vmStateEvent, currentState ) => void
   */
  subscribeState(subFunc: TStateChangeFunc) {
    if (typeof subFunc !== 'function') throw Error('subscriber must be function');
    if (this.subs.has(subFunc)) console.warn('duplicate subscriber function');
    this.subs.add(subFunc);
  }

  /** Unsubscribe state */
  unsubscribeState(subFunc: TStateChangeFunc) {
    if (!this.subs.delete(subFunc))
      console.warn('function not subscribed for', this.name);
  }

  /** When executing a side effect from a component, use this method to
   *  hold it until after all state updates have completed, so the DOM
   *  is stable
   */
  queueEffect(effectFunc: TEffectFunc) {
    if (typeof effectFunc !== 'function') throw Error('effect must be a function');
    this.effects.push(effectFunc);
    this._doEffect();
  }

  /// CLASS HELPER METHODS ////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Set the state object directly. used to initialize the state from within
   *  an appcore module. skips state validation because the VM_STATE entry
   *  is an empty object
   */
  _initializeState(stateObj: TStateObj) {
    // only allow this once per instance
    if (this.init)
      throw Error(`_initializeState: store '${this.name}' already initialized`);
    // validate stateObj
    Object.keys(stateObj).forEach(k => {
      // must be all lowercase
      if (k.toLowerCase() !== k)
        throw Error(`_initializeState: props must be lowercase, not '${k}'`);
      // must not contain undefined keys
      if (stateObj[k] === undefined)
        throw Error(
          `_initializeState: prop '${k}' value can't be undefined (use null instead)`
        );
    });
    // check that VM_STATE entry is valid (should be created by constructor)
    if (VM_STATE[this.name]) {
      Object.keys(stateObj).forEach(k => {
        // skip the viewStateEvent key
        if (k === '_group') return;
        // check for duplicate keys. they must be unique across ALL state groups
        const assTo = USED_PROPS.get(k);
        if (assTo !== undefined) throw Error(`${k} already assigned to ${assTo}`);
        // register the property name so it can't be used by another manager
        USED_PROPS.set(k, this.name);
      });
      VM_STATE[this.name] = stateObj; // initialize!
      this.init = true;
    } else throw Error(`${this.name} does't exist in VM_STATE`);
  }

  /** In some cases, we want to update state but not trigger subscribers
   *  related to it. Alias for _mergeState()
   */
  _setState(vmState: TStateObj) {
    this._mergeState(vmState);
  }

  /** When SendState() is invoked, give the instance manager a change to
   *  inspect the incoming state and do a side-effect and/or a filter.
   *  They will run in order of interceptor registration
   *  @param {function} tapFunc - receive stateEvent to mutate or act-on
   */
  _interceptState(tapFunc: TTapFunc) {
    if (typeof tapFunc !== 'function') throw Error(`'${tapFunc}' is not a function`);
    this.taps.push(tapFunc);
  }

  /** Allow synthesis of a state event by adding to queue without
   *  immediately executing it. For use by _interceptState only.
   *  Creates an action { stateObj, callback }
   */
  _insertStateEvent(stateEvent: TStateObj, callback: TEffectFunc) {
    this._enqueue({ stateEvent, callback });
  }

  /** Return true if the event object conforms to expectations (see below) */
  _isValidState(stateObj: TStateObj) {
    // test 1 - is this event handled this manager instance?
    // const grp = stateObj._group.trim().toUpperCase();
    // if (grp !== this.name) return false;

    // test 2 - any keys must already be defined in the store to
    // avoid typo-based errors and other such crapiness
    const curState = VM_STATE[this.name];
    let keysOk = true;
    Object.keys(stateObj).forEach(k => {
      const keyTest = keysOk && curState[k] !== undefined;
      if (keyTest === false) console.warn(`isValidState: '${k}' not a valid key`);
      keysOk = keysOk && keyTest;
    });
    return keysOk;
  }

  /** Scan the object properties for arrays, and mutate with a new array.
   *  In the case of an array containing references, the references will still
   *  be the same but the array itself will be different
   */
  _derefProps(stateObj: TStateObj) {
    Object.keys(stateObj).forEach(k => {
      if (Array.isArray(stateObj[k])) stateObj[k] = [...stateObj[k]];
    });
    return stateObj;
  }

  /** Utility method to clone state event. It handles array cloning as well but
   *  is otherwise a shallow clone
   */
  _cloneStateObject(stateObj: TStateObj) {
    const clone = this._derefProps({ ...stateObj });
    return clone;
  }

  /** Take a clonedEvent event object and update the VM_STATE entry with
   *  its property values. This creates an entirely new state object
   */
  _mergeState(stateObj: TStateObj) {
    if (!this._isValidState(stateObj)) return undefined;
    // first make a new state object with copies of arrays
    const newState = this._derefProps({
      ...VM_STATE[this.name],
      ...stateObj
    });
    // set the state
    VM_STATE[this.name] = newState;
    // also return the new state object
    return newState;
  }

  /** Forward the event to everyone. The vmStateEvent object contains
   *  properties that changed only, appending a 'stateGroup' identifier
   *  that tells you who sent it. Sends a read-only copy.
   */
  _notifySubs(stateObj: TStateObj) {
    // fire notification in the next event cycle to make sure
    // that prior unsubscribes took effect
    setTimeout(() => {
      const subs = [...this.subs.values()];
      stateObj.stateGroup = this.name; // mixed-case names reserved by system
      // also include the total state
      const currentState = this._derefProps({ ...VM_STATE[this.name] });
      subs.forEach(sub => sub(stateObj, currentState));
    });
  }

  /** Placeholder queueing system that doesn't do much now.
   *  An action is { vmStateEvent, callback }
   */
  _enqueue(action: TQueuedAction) {
    const { stateEvent, callback } = action;
    if (!this._isValidState(stateEvent)) {
      console.warn('bad vmStateEvent', stateEvent);
      return;
    }
    if (callback && typeof callback !== 'function') {
      console.warn('call must be function, not', typeof callback, callback);
      return;
    }
    this.queue.push(action);
    // placeholder processes immediately
    this._dequeue();
  }

  /** Placeholder dequeing system that doesn't do much now.
   *  An action is { vmStateEvent, callback }
   */
  _dequeue() {
    const callbacks = [];
    // iterate over all actions in queue
    let action = this.queue.shift();
    while (action !== undefined) {
      const { vmStateEvent, callback } = action;
      this._mergeState(vmStateEvent); // merge partial state into state
      this._notifySubs(vmStateEvent); // send partial state to subs
      if (typeof callback === 'function') callbacks.push(callback);
      // get next action in queue
      action = this.queue.shift();
    }
    // issues callbacks after ALL actions have completed
    callbacks.forEach(f => f());
    this._doEffect();
  }

  /** execute effect functions that have been queued, generally if there
   *  are no pending state changes
   */
  _doEffect() {
    if (this.queue.length > 0) return;
    setTimeout(() => {
      let effect = this.effects.shift();
      while (effect !== undefined) {
        effect();
        effect = this.effects.shift();
      }
    });
  }

  /// STATIC METHODS //////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Return a state manager instance if it exists, undefined if not. Throws
   *  errors if there are issues with the name */
  static GetStateManager(groupName: string): StateMgr {
    if (typeof groupName !== 'string') throw Error(`${groupName} is not a string`);
    const bucket = groupName.trim().toUpperCase();
    if (bucket !== groupName)
      throw Error(`groupNames should be all uppercase, not ${bucket}`);
    return GROUPS[bucket];
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** return a locked copy of the state of a particular named state group.
   *  Unlike GetStateManager, this returns just the data object.
   */
  static GetStateData(groupName: string) {
    if (typeof groupName !== 'string') throw Error(`${groupName} is not a string`);
    const bucket = groupName.trim().toUpperCase();
    if (bucket !== groupName)
      throw Error(`groupNames should be all uppercase, not ${bucket}`);
    const state = VM_STATE[bucket];
    if (!state) throw Error(`stateGroup ${bucket} is not defined`);

    // create a read-only copy of state and set all its properties to
    // unwriteable
    const readOnlyState = { ...state };
    for (const prop of Object.keys(readOnlyState)) {
      Object.defineProperty(readOnlyState, prop, {
        writable: false
      });
    }
    return readOnlyState;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** return a Stage Manager instance. This just hides the new operator that
   *  purposefully always returns an instance of an existing group if it
   *  already exists
   */
  static GetInstance(groupName: string) {
    return new StateMgr(groupName);
  }
}

/// STATIC METHODS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** return a READ-ONLY object containing state for a particular group */

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default StateMgr;
export type { TStateObj, TGroupName, TStateChangeFunc, TEffectFunc };
export type { IStateMgr };
