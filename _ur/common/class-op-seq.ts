/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Operation Sequencer

  A simple sequencer that is initialized with TOpNode objects:
  { name, data? } one after the other with addOp(). 

  The sequencer can be started, stopped, and moved forward and backward, 
  and can notify subscribers when the current operation changes.

  usage:

  const sequencer = new OpSequencer('MY SEQUENCER'); // unique UC name
  sequencer.addOp('op1', { ... });
  sequencer.addOp('op2', { ... });
  sequencer.subscribe('op1', (newOp, oldOp) => { ... });
  const op = sequencer.start();
  while (op) op = sequencer.next();
  sequencer.dispose();

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// TYPES /////////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type TOpSeqMap = Map<string, OpSequencer>;
type TOpChangeFunc = (newOp: TOpNode, oldOp: TOpNode, ops?: OpSequencer) => void;
type TDataObj = { [key: string]: any };
type TOpNode = {
  data: TDataObj;
  _seqName?: string;
  _opName?: string;
  _opIndex?: number;
};
type TNodeOptions = {
  mutable?: boolean; // data is frozen by default
};

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const OPSEQS: TOpSeqMap = new Map(); // lookup table of operation sequencers

/// HELPER FUNCTIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_ValidateSeqName(sn: string) {
  const fn = 'm_ValidateSeqName';
  const pcErr = 'name must be PascalCase string';
  if (sn === '') throw Error(`${fn}: ${pcErr}`);
  if (sn === undefined) throw Error(`${fn}: ${pcErr}`);
  if (typeof sn !== 'string') throw Error(`${fn}: ${pcErr}`);
  if (sn !== sn[0].toUpperCase() + sn.slice(1)) throw Error(`${fn}: ${pcErr}`);
  if (sn.trim() !== sn)
    throw Error(`${fn}: name must not have leading/trailing spaces`);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_ValidateActiveSeq(seq: OpSequencer) {
  if (seq instanceof OpSequencer) {
    if (seq._disposed) throw Error(`sequencer ${seq.seqName} is disposed`);
    else return;
  }
  throw Error('not a sequence instance or undefined');
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_ValidateNodeName(nn: string) {
  const fn = 'm_ValidateNodeName';
  if (nn === '') throw Error(`${fn}: name must be lc string`);
  if (nn === undefined) throw Error(`${fn}: name must be lc string`);
  if (typeof nn !== 'string') throw Error(`${fn}: name must be lc string`);
  if (nn !== nn.toLowerCase()) throw Error(`${fn}: name must be lc`);
  if (nn.trim() !== nn)
    throw Error(`${fn}: name must not have leading/trailing spaces`);
}

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class OpSequencer {
  ops: TOpNode[]; // array of operations
  seqName: string; // sequencer name
  lastOp: TOpNode; // last operation
  currentOp: TOpNode; // current operation
  opIndex: number; // current operation index
  opsMap: Map<string, number>; // map opname to index in ops array
  subs: Map<string, Set<TOpChangeFunc>>; // map opname to set of subscribers
  _disposed: boolean; // true if disposed

  constructor(seqName: string) {
    m_ValidateSeqName(seqName);
    seqName = seqName.trim().toUpperCase();
    // return an existing instance if it exists
    if (OPSEQS.has(seqName)) {
      console.warn(
        `(not an error) '${seqName}' construction duplicate, returning existing instance`
      );
      return OPSEQS.get(seqName);
    }
    // otherwise, create a new instance and save it
    this.seqName = seqName;
    this.ops = [];
    this.opsMap = new Map();
    this.opIndex = -1;
    this.currentOp = null;
    this.lastOp = null;
    this.subs = new Map();
    this._disposed = false;
    OPSEQS.set(seqName, this);
  }

  /* --- add nodes --- */

  /** given nodeName and a source TOpNode, add a clone of the source node to the sequencer */
  addOp(name: string, data: TDataObj, opt?: TNodeOptions): TOpNode {
    const fn = 'addOp';
    //
    if (data === undefined) throw Error(`${fn}: arg2 must be TOpNode`);
    if (typeof name !== 'string') throw Error(`${fn}: arg1 must be name:string`);
    if (typeof data._name === 'string') throw Error(`${fn}: node ${name} reused`);
    if (data._index !== undefined) throw Error(`${fn}: node ${name} reused`);
    //
    m_ValidateActiveSeq(this);
    m_ValidateNodeName(name);
    //
    if (this.opIndex !== -1) throw Error(`${fn}: sequencer already started`);
    if (this.hasOp(name)) throw Error(`${fn}: node '${name}' already exists`);
    //
    const index = this.ops.length;
    this.opsMap.set(name, index); // save lookup index by name
    const newData = { ...data }; // copy of user data
    if (opt?.mutable) Object.freeze(newData); // default is frozen
    const newNode: TOpNode = {
      _opIndex: index,
      _seqName: this.seqName,
      _opName: name,
      data: newData
    };
    this.ops.push(newNode);
    return newNode;
  }

  deleteOp(name: string): void {
    const fn = 'deleteOp';
    console.error(`${fn}: not implemented by design`);
  }

  /* --- access operations --- */

  data(key?: string): TDataObj {
    m_ValidateActiveSeq(this);
    if (typeof key === 'string') return this.currentOp.data[key];
    return this.currentOp.data;
  }

  length(): number {
    m_ValidateActiveSeq(this);
    return this.ops.length;
  }

  /* --- sequencer operations --- */

  start(): TOpNode {
    const fn = 'start';
    m_ValidateActiveSeq(this);
    if (this.opIndex !== -1) throw Error(`${fn}: sequencer already started`);
    if (this.ops.length === 0) throw Error(`${fn}: no operations to run`);
    this.opIndex = 0;
    this._update();
    this._notifyChange();
    return this.ops[this.opIndex];
  }

  current(): TOpNode {
    const fn = 'current';
    m_ValidateActiveSeq(this);
    if (this.opIndex === -1) throw Error(`${fn}: sequencer not started`);
    this._update();
    this._notifyChange();
    return this.ops[this.opIndex];
  }

  stop(): TOpNode {
    const fn = 'stop';
    m_ValidateActiveSeq(this);
    if (this.opIndex === -1) throw Error('stop: sequencer not started');
    this.opIndex = -1;
    this._update();
    this._notifyChange();
    return this.ops[this.opIndex];
  }

  next(): TOpNode {
    const fn = 'next';
    if (this.opIndex === -1) return this.start();
    m_ValidateActiveSeq(this);
    if (this.opIndex === this.ops.length - 1) return undefined;
    ++this.opIndex;
    this._update();
    this._notifyChange();
    return this.ops[this.opIndex];
  }

  previous(): TOpNode {
    const fn = 'previous';
    m_ValidateActiveSeq(this);
    if (this.opIndex === -1) throw Error(`${fn}: sequencer not started`);
    if (this.opIndex === 0) return undefined;
    --this.opIndex;
    this._update();
    this._notifyChange();
    return this.ops[this.opIndex];
  }

  /* --- node events --- */

  subscribe(opName: string, subf: TOpChangeFunc): void {
    const fn = 'onEnter';
    m_ValidateActiveSeq(this);
    m_ValidateNodeName(opName);
    if (!this.hasOp(opName)) throw Error(`${fn}: node '${opName}' does not exist`);
    if (!this.subs.has(opName)) this.subs.set(opName, new Set());
    this.subs.get(opName).add(subf);
  }

  unsubscribe(name: string, subf: TOpChangeFunc): void {
    const fn = 'onEnter';
    m_ValidateActiveSeq(this);
    m_ValidateNodeName(name);
    if (!this.hasOp(name)) throw Error(`${fn}: node '${name}' does not exist`);
    const subs = this.subs.get(name);
    if (subs.has(subf)) subs.delete(subf);
  }

  _update() {
    const fn = '_update';
    m_ValidateActiveSeq(this);
    this.lastOp = this.currentOp;
    this.currentOp = this.ops[this.opIndex];
  }

  _notifyChange(): void {
    const fn = '_notifyChange';
    m_ValidateActiveSeq(this);
    const subs = this.subs.get(this.currentOp._opName);
    if (subs) subs.forEach(subf => subf(this.currentOp, this.lastOp, this));
  }

  /* --- node utilities --- */

  hasOp(opName: string): boolean {
    m_ValidateActiveSeq(this);
    m_ValidateNodeName(opName);
    return this.ops.some(op => op._opName === opName);
  }

  matchOp(opName: string): boolean {
    const fn = 'matchOp';
    m_ValidateActiveSeq(this);
    m_ValidateNodeName(opName);
    if (!this.hasOp(opName)) throw Error(`${fn}: node '${opName}' does not exist`);
    return opName === this.ops[this.opIndex]._opName;
  }

  /** remove all nodes and subscribers */
  dispose(): void {
    OpSequencer.DeleteSequencer(this.seqName);
  }

  /* --- static utilities --- */

  static GetSequencer(seqName: string): OpSequencer {
    m_ValidateSeqName(seqName);
    return OPSEQS.get(seqName);
  }

  static DeleteSequencer(seqName: string): void {
    const seq = OpSequencer.GetSequencer(seqName);
    seq.opsMap.clear();
    seq.subs.forEach(subs => subs.clear());
    seq.ops.length = 0;
    seq._disposed = true;
    OPSEQS.delete(seqName);
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default OpSequencer;
export type { TOpNode, TOpChangeFunc };
