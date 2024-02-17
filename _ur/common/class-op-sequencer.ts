/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Operation Sequencer

  A simple sequencer that is initialized with TOpNode objects:
  { name, data? } one after the other with addNode(). 

  The sequencer can be started, stopped, and moved forward and backward, 
  and can notify subscribers when the current operation changes.

  usage:

  const sequencer = new OpSequencer('MY SEQUENCER'); // unique UC name
  sequencer.addNode({ name: 'op1', data: { ... } });
  sequencer.addNode({ name: 'op2', data: { ... } });
  sequencer.subscribe('op1', (newOp, oldOp) => { ... });
  const firstOp = sequencer.start();
  while (let seqOp = sequencer.next()) { ... }
  sequencer.dispose();

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// TYPES /////////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type TOpSeqMap = Map<string, OpSequencer>;
type TOpChangeFunc = (newOp: TOpNode, oldOp: TOpNode) => void;
type TOpNode = {
  name: string;
  data?: { [key: string]: any };
  _index?: number;
  _seqName?: string;
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
    OPSEQS.set(seqName, this);
  }

  /* --- add nodes --- */

  addNode(node: TOpNode): TOpNode {
    const fn = 'addNode';
    const { name } = node;
    m_ValidateNodeName(name);
    if (this.opIndex !== -1) throw Error(`${fn}: sequencer already started`);
    if (this.hasNode(name)) throw Error(`${fn}: node '${name}' already exists`);
    const index = this.ops.length;
    if (node._index !== undefined) throw Error(`${fn}: node ${name} reused`);
    node._index = index;
    this.opsMap.set(name, index); // lookup index by name
    this.ops.push(node);
    return node;
  }

  deleteNode(name: string): void {
    const fn = 'deleteNode';
    console.error(`${fn}: not implemented by design`);
  }

  /* --- node operations --- */

  start(): TOpNode {
    const fn = 'start';
    if (this.opIndex !== -1) throw Error(`${fn}: sequencer already started`);
    if (this.ops.length === 0) throw Error(`${fn}: no operations to run`);
    this.opIndex = 0;
    this._update();
    this._notifyChange();
    return this.ops[this.opIndex];
  }

  current(): TOpNode {
    const fn = 'current';
    if (this.opIndex === -1) throw Error(`${fn}: sequencer not started`);
    this._update();
    this._notifyChange();
    return this.ops[this.opIndex];
  }

  stop(): TOpNode {
    this.opIndex = -1;
    this._update();
    this._notifyChange();
    return this.ops[this.opIndex];
  }

  next(): TOpNode {
    const fn = 'next';
    if (this.opIndex === -1) throw Error(`${fn}: sequencer not started`);
    if (this.opIndex === this.ops.length - 1) throw Error(`${fn}: already at end`);
    this._update();
    this._notifyChange();
    return this.ops[++this.opIndex];
  }

  previous(): TOpNode {
    const fn = 'previous';
    if (this.opIndex === -1) throw Error(`${fn}: sequencer not started`);
    if (this.opIndex === 0) throw Error(`${fn}: already at start`);
    this._update();
    this._notifyChange();
    return this.ops[--this.opIndex];
  }

  /* --- node events --- */

  subscribe(name: string, subf: TOpChangeFunc): void {
    const fn = 'onEnter';
    m_ValidateNodeName(name);
    if (!this.hasNode(name)) throw Error(`${fn}: node '${name}' does not exist`);
    if (!this.subs.has(name)) this.subs.set(name, new Set());
    this.subs.get(name).add(subf);
  }

  unsubscribe(name: string, subf: TOpChangeFunc): void {
    const fn = 'onEnter';
    m_ValidateNodeName(name);
    if (!this.hasNode(name)) throw Error(`${fn}: node '${name}' does not exist`);
    const subs = this.subs.get(name);
    if (subs.has(subf)) subs.delete(subf);
  }

  _update() {
    const fn = '_update';
    this.lastOp = this.currentOp;
    this.currentOp = this.ops[this.opIndex];
  }

  _notifyChange(): void {
    const fn = '_notifyChange';
    const subs = this.subs.get(this.currentOp.name);
    if (subs) subs.forEach(subf => subf(this.currentOp, this.lastOp));
  }

  /* --- node utilities --- */

  hasNode(opName: string): boolean {
    m_ValidateNodeName(opName);
    return this.ops.some(op => op.name === opName);
  }

  isNode(opName: string): boolean {
    const fn = 'isNode';
    m_ValidateNodeName(opName);
    if (!this.hasNode(opName)) throw Error(`${fn}: node '${opName}' does not exist`);
    return opName === this.ops[this.opIndex].name;
  }

  dispose(): void {
    this.opsMap.clear();
    this.subs.forEach(subs => subs.clear());
    OPSEQS.delete(this.seqName);
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
    OPSEQS.delete(seqName);
  }
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default OpSequencer;
export type { TOpNode, TOpChangeFunc };
