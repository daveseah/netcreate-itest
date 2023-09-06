/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  GRAPHDATA

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

/// SYSTEM LIBRARIES //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { stdin as input, stdout as output } from 'node:process';
import readline from 'node:readline';
import { readFileSync } from 'node:fs';
//
import Graph from 'graphology';
import { generate } from 'peggy';
import { PreprocessDataText } from '../_sys/text';
import { makeTerminalOut } from '../_sys/prompts';

/// DECLARATIONS //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = makeTerminalOut(' GRAPH', 'TagPurple');

/// METHODS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const GRAMMAR = readFileSync('parser.peg', 'utf8');
const PARSER = generate(GRAMMAR, { trace: false });
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function ParseGraphData(filename) {
  let data = readFileSync(filename, 'utf8');
  data = PreprocessDataText(data);
  let result = PARSER.parse(data);
  return result;
}

/// RUNTIME ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Run() {
  const filename = 'test-ncgraphdata.txt';
  LOG(`.. loading ${filename}...`);
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
  LOG(`.. parsed ${results.length} entries from ${filename}`);
}

/// DATAEX CONTROL LOGIC //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** run control logic test **/
process.on('message', controlMsg => {
  const { dataex, data } = controlMsg;
  LOG('received DATAEX:', controlMsg);
  if (dataex === '_CONFIG_REQ') {
    process.send({ dataex: '_CONFIG_ACK', data: { name: 'graph/@init' } });
    Run();
  }
});

/// EXPORT MODULE /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
