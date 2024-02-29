/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  All declare modules are dependency-free so can be imported by anyone

  This is a set of names that could be used to define types of
  operational states and the actions that change it.
  These are more general ideas than in declare-actions.js (maybe)

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// KINDS OF OPERATION STATES /////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const OPSTATE_CHANGES = {
  command: ['API'],
  set: {
    invocation: ['sync, async'],
    affect: ['opstate', 'control', 'input', 'output']
  },
  query: ['state', 'input', 'output', 'workdata'],
  subscribe: ['opstate', 'hook', 'input', 'output'],
  execute: ['opstate']
};

/// KINDS OF OPERATIONAL ELEMENTS /////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const OPSTATE_ELEMENTS = {
  API: 'the public interface shared with other modules in the system',
  set: 'setting a value that may take time to execute',
  opstate: 'the internal named state of the module',
  control: 'a variable controls operations, varying over time',
  input: 'data source (and protocol)',
  output: 'processed data output (and protocol)',
  workdata: 'working data (intermediate transformation)',
  hook: 'a specialized hook that exposes internal operations (advanced)',
  system: 'other modules that have shared dependencies with this module',
  engine: 'the type of execution model used by this module'
};
