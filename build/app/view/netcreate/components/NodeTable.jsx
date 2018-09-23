/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  ## OVERVIEW

    NodeTable is used to to display a table of nodes for review.


  ## TO USE

    NodeTable is self contained and relies on global D3DATA to load.

      <NodeTable/>



\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

var DBG = false;

/// LIBRARIES /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const React        = require('react');
const ReactStrap   = require('reactstrap');
const { Button, Table }    = ReactStrap;

const UNISYS   = require('unisys/client');
var   UDATA    = null;

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// export a class object for consumption by brunch/require
class NodeTable extends UNISYS.Component {
    constructor (props) {
      super(props);

      this.state = {
        nodes:      [],
        isExpanded: false,
        sortkey:    'label'
      };

      this.onButtonClick            = this.onButtonClick.bind(this);
      this.onToggleExpanded         = this.onToggleExpanded.bind(this);
      this.setSortKey               = this.setSortKey.bind(this);


      /// Initialize UNISYS DATA LINK for REACT
      UDATA = UNISYS.NewDataLink(this);

      // Always make sure class methods are bind()'d before using them
      // as a handler, otherwise object context is lost
      this.OnAppStateChange('D3DATA',(data) => {
        this.handleDataUpdate(data);
      });
    } // constructor



/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/ Handle updated SELECTION
/*/ handleDataUpdate ( data ) {
      this.setState({nodes: data.nodes});
      this.sortTable();
    }


/// UTILITIES /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/
/*/ sortByID (nodes) {
      if (nodes) {
        return nodes.sort( (a,b) => {
          let akey = a.id,
              bkey = b.id;
          if (akey<bkey) return -1;
          if (akey>bkey) return 1;
          return 0;
        });
      }
    }
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/
/*/ sortByLabel (nodes) {
      if (nodes) {
        return nodes.sort( (a,b) => {
          let akey = a.label,
              bkey = b.label;
          if (akey<bkey) return -1;
          if (akey>bkey) return 1;
          return 0;
        });
      }
    }
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/
/*/ sortByAttribute (nodes, key) {
      if (nodes) {
        return nodes.sort( (a,b) => {
          let akey = a.attributes[key],
              bkey = b.attributes[key];
          if (akey<bkey) return -1;
          if (akey>bkey) return 1;
          return 0;
        });
      }
    }
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/ If no `sortkey` is passed, the sort will use the existing state.sortkey
/*/ sortTable ( sortkey=this.state.sortkey) {
      let nodes = this.state.nodes;
      switch (sortkey) {
        case 'id':
          this.sortByID(nodes);
          break;
        case 'type':
          this.sortByAttribute(nodes, 'Node_Type');
          break;
        case 'notes':
          this.sortByAttribute(nodes, 'Notes');
          break;
        case 'info':
          this.sortByAttribute(nodes, 'Extra Info');
          break;
        case 'label':
        default:
          this.sortByLabel(nodes);
          break;
      }
      this.setState({nodes: nodes});
    }

/// UI EVENT HANDLERS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/
/*/ onButtonClick (event) {
      event.preventDefault();

      // REVIEW: For some reason React converts the integer IDs into string
      // values when returned in event.target.value.  So we have to convert
      // it here.
      let nodeID = parseInt( event.target.value );
      UDATA.LocalCall('SOURCE_SELECT',{ nodeIDs: [nodeID] });

    }
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/
/*/ onToggleExpanded (event) {
      this.setState({
        isExpanded: !this.state.isExpanded
      })
    }
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/
/*/ setSortKey (key) {
      this.setState({sortkey: key});
      this.sortTable(key);
    }
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/
/*/ selectNode (id, event) {
      event.preventDefault();

      // REVIEW: For some reason React converts the integer IDs into string
      // values when returned in event.target.value.  So we have to convert
      // it here.
      // Load Source
      UDATA.LocalCall('SOURCE_SELECT',{ nodeIDs: [parseInt(id)] });
    }



/// REACT LIFECYCLE METHODS ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/ This is not yet implemented as of React 16.2.  It's implemented in 16.3.
    getDerivedStateFromProps (props, state) {
      console.error('getDerivedStateFromProps!!!');
    }
/*/
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/
/*/ render () {
      return (
        <div style={{maxHeight:'50vh',overflow:'scroll',backgroundColor:'#eafcff'}}>
          <Button size="sm" outline
            onClick={this.onToggleExpanded}
          >{this.state.isExpanded ? "Hide Node Table" : "Show Node Table"}</Button>
          <Table hidden={!this.state.isExpanded} hover size="sm"
                 responsive striped
          >
            <thead>
              <tr>
                <th><Button size="sm"
                      disabled={this.state.sortkey==="id"}
                      onClick={()=>this.setSortKey("id")}
                    >ID</Button></th>
                <th></th>
                <th><Button size="sm"
                      disabled={this.state.sortkey==="label"}
                      onClick={()=>this.setSortKey("label")}
                    >Label</Button></th>
                <th><Button size="sm"
                      disabled={this.state.sortkey==="type"}
                      onClick={()=>this.setSortKey("type")}
                    >Type</Button></th>
                <th><Button size="sm"
                      disabled={this.state.sortkey==="info"}
                      onClick={()=>this.setSortKey("info")}
                    >Geocode/Date</Button></th>
                <th><Button size="sm"
                      disabled={this.state.sortkey==="notes"}
                      onClick={()=>this.setSortKey("notes")}
                    >Notes</Button></th>
              </tr>
            </thead>
            <tbody>
            {this.state.nodes.map( (node,i) =>
              <tr key={i}>
                <td>{node.id}</td>
                <td><Button size="sm" outline
                      value={node.id}
                      onClick={this.onButtonClick}
                    >Edit</Button>
                </td>
                <td><a href="#" onClick={(e)=>this.selectNode(node.id,e)}
                    >{node.label}</a></td>
                <td>{node.attributes["Node_Type"]}</td>
                <td style={{}}>{node.attributes["Extra Info"]}</td>
                <td>{node.attributes["Notes"]}</td>
              </tr>
            )}
            </tbody>
          </Table>
        </div>
      );
    }
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/
/*/ componentDidMount () {
      if (DBG) console.log('NodeTable.componentDidMount!');
    }
} // class NodeTable


/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NodeTable;
