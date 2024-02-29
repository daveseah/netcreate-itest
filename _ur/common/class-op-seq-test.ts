/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Unit Tests for OpSequencer

  API REFERENCE (dupe from class-op-sequencer.ts)

  constructor: seqName => OpSequencer;
  addNode: (opName, TOpNode) => TOpNode;
  start: () => TOpNode;
  current: () => TOpNode;
  next: () => TOpNode;
  previous: () => TOpNode;
  subscribe: (name, TOpChangeFunc) => void;
  unsubscribe: (name, TOpChangeFunc) => void;
  hasNode: opName => boolean;
  isNode: opName => boolean;
  
  INTERNAL API

  _update: () => void; // update currentOp and lastOp
  _notifyChange: () => void; // notify subscribers of currentOp change
  
  STATIC API
  
  GetSequencer: seqName => OpSequencer;
  DisposeSequencer: seqName => void;

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { expect, test } from 'vitest';
import OpSequencer, { TOpNode, TOpChangeFunc } from './class-op-seq.ts';

/// TESTS /////////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

test('OpSeq initializes', () => {
  const seq = new OpSequencer('Test1');
  expect(seq).toBeDefined();
});

test('OpSeq adds nodes', () => {
  const seq = new OpSequencer('Test2');
  seq.addOp('node1', {});
  expect(seq.hasOp('node1')).toBe(true);
});
