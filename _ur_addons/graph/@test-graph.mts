/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  (WIP) GRAPHDATA

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

/* added for pull request #81 so 'npm run lint' test appears clean */
/* eslint-disable no-unused-vars */

/// SYSTEM LIBRARIES //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { stdin as input, stdout as output } from 'node:process';
import readline from 'node:readline';
import { readFileSync } from 'node:fs';
//
import { PR, TEXT } from '@ursys/core';
import GRAPHOLOGY from 'graphology';
import PG_CJS from 'peggy';
const { generate } = PG_CJS;
// @ts-ignore - graphology package does not export .mts-compatible mainfiles
const { Graph } = GRAPHOLOGY;

/// DECLARATIONS //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = PR('Graph', 'TagPurple');

/// METHODS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const GRAMMAR = readFileSync('parser.peg', 'utf8');
const PARSER = generate(GRAMMAR, { trace: false });
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function ParseGraphData(filename) {
  LOG(`Loading ${filename}...`);
  let data = readFileSync(filename, 'utf8');
  data = TEXT.PreprocessDataText(data);
  let result = PARSER.parse(data);
  return result;
}

/// RUNTIME ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Run() {
  const filename = 'test-ncgraphdata.txt';
  const graph = new Graph({ multi: true });
  let out = '';
  const results = ParseGraphData(filename);
  results.forEach(entry => {
    const { node: source, edges: targets } = entry;
    if (source) {
      out += `\nSOURCE ${source} `;
      if (!graph.hasNode(source)) graph.addNode(source, { type: 'message' });
    }
    if (targets)
      targets.forEach(target => {
        out += ` -> ${target}`;
        if (!graph.hasNode(target)) graph.addNode(target, { type: 'consumer' });
        graph.addEdge(source, target);
      });
  });
  LOG(`Parsed ${results.length} entries from ${filename}`);
  let padding = 0;
  results.forEach(entry => {
    if (entry?.node?.length > padding) padding = entry.node.length;
  });
  results.forEach(entry => {
    const { node, edges } = entry;
    if (node === undefined) return;
    const msg = node.padEnd(padding + 2, ' ');
    LOG.info(`${msg} -> ${edges}`);
  });
}

/// EXPORT MODULE /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Run();
