/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Universal ID Test Module

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { expect, test } from 'vitest';
import * as UID from './lib-uid';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const LOG = console.log;

/// RUNTIME ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const STRINGS = {
  'pr-1234': ['', 'pr', '1234'], // good
  'meme:pr-1234': ['meme', 'pr', '1234'], // good
  ':pr-1234': false, // illegal :
  '1234': false, // missing prefix
  'pr1234': false, // missing delimiter
  'pr-1234-': false, // extra delimiter
  'pr-1234:meme': false, // out of order
  'meme:pr:1234': false, // wrong delimiter
  'MEME:pr-2345': false, // uppercase schema
  'meme:pr-1abc': false // non-numeric id
};

let ii = 0;
for (const id of Object.keys(STRINGS)) {
  const e = STRINGS[id];
  const r = UID.DecodeID(id);
  const [s, p, i] = r;
  if (DBG) console.log(`expect ${id}:`, e, 'vs', r);
  test(`DecodeID: ${id}`, () => {
    if (e === false) expect(r.length).toBe(0);
    else {
      expect(s).toBe(e[0]);
      expect(p).toBe(e[1]);
      expect(i).toBe(e[2]);
    }
  });
  if (DBG) {
    const label = `${String(++ii).padStart(2)} ID: "${id}"`.padEnd(25);
    if (r.length === 0) LOG(`${label} pass:false`);
    else LOG(`${label} pass:${r.length > 0} s:${s}, p:${p}, i:${i}`);
  }
}
