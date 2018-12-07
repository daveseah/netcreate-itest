/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

    NetCreate

    The basic React Component structure of the app looks like this:

        NetCreate
        +- NodeSelector
        |  +- NodeDetail
        |  +- AutoComplete
        |  |  +- AutoSuggest
        |  +- EdgeEntry
        |     +- *AutoComplete (for Target Node)*
        +- NetGraph
           +- D3SimpleNetGraph
              +- D3

    `NetCreate` is the root element. It is a wrapper for the key app
    elements `NodeSelector` and `NetGraph`.

    It does not do any data or event handling.  Those are handled individually
    by the respective Components.

  * All state is maintained in `nc-logic.js`
  * It handles events from NodeSelector, EdgeEntry, and NetGraph components
      and passes data and upates across them.

    PROPS  ... (none)
    STATE  ... (none)
    EVENTS ... (none)

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

/// UNISYS INITIALIZE REQUIRES for REACT ROOT /////////////////////////////////
const UNISYS       = require('unisys/client');
const SessionShell = require('unisys/component/SessionShell');

/// DEBUG SWITCHES ////////////////////////////////////////////////////////////
var   DBG          = false;
const PROMPTS      = require('system/util/prompts');
const PR           = PROMPTS.Pad('ACD');

/// LIBRARIES /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const React        = require('react');
const { Route }    = require('react-router-dom');
const ReactStrap   = require('reactstrap');
const { TabContent, TabPane, Nav, NavItem, NavLink, Row, Col } = ReactStrap;
const classnames   = require('classnames');
const NetGraph     = require('./components/NetGraph');
const Search       = require('./components/Search');
const NodeSelector = require('./components/NodeSelector');
const Help         = require('./components/Help');
const NodeTable    = require('./components/NodeTable');
const EdgeTable    = require('./components/EdgeTable');
const NCLOGIC      = require('./nc-logic'); // require to bootstrap data loading


/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/
/*/ class NetCreate extends UNISYS.Component {
      constructor () {
        super();
        UNISYS.ForceReloadOnNavigation();
        this.OnDOMReady(()=>{
          if (DBG) console.log(PR,'OnDOMReady');
        });
        this.OnReset(()=>{
          if (DBG) console.log(PR,'OnReset');
        });
        this.OnStart(()=>{
          if (DBG) console.log(PR,'OnStart');
        });
        this.OnAppReady(()=>{
          if (DBG) console.log(PR,'OnAppReady');
        });
        this.OnRun(()=>{
          if (DBG) console.log(PR,'OnRun');
        });
        
        this.toggle = this.toggle.bind(this);
        
        this.state = {
          activeTab: '1'
        }
      }
  
      toggle (tab) {
        if (this.state.activeTab !== tab) {
          this.setState({ activeTab: tab });
        }
      }

  /// REACT LIFECYCLE METHODS ///////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /*/ This is the root component, so this fires after all subcomponents have
      been fully rendered by render().
  /*/ componentDidMount () {
      }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /*/ Define the component structure of the web application
  /*/ render() {
        return (
          <div>
            <div style={{display:'flex', flexFlow:'row nowrap',
                width:'100%', height:'100vh',overflow:'hidden'}}>
              <div id="left" style={{backgroundColor:'#EEE',flex:'1 1 25%',maxWidth:'400px',padding:'10px',overflow:'scroll',marginTop:'56px'}}>
                <div style={{display:'flex',flexFlow:'column nowrap'}}>
                  <Route path='/edit/:token' exact={true} component={SessionShell}/>
                  <Route path='/edit' exact={true} component={SessionShell}/>
                  <Route path='/' exact={true} component={SessionShell}/>
                  <Search/>
                  <NodeSelector/>
                </div>
              </div>
              <div id="middle" style={{backgroundColor:'#fcfcfc', flex:'3 0 60%', padding:'10px',marginTop:'56px'}}>

                <Nav tabs>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: this.state.activeTab === '1' })}
                      onClick={() => { this.toggle('1'); }}
                    >
                      Graph
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: this.state.activeTab === '2' })}
                      onClick={() => { this.toggle('2'); }}
                    >
                      Nodes Table
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: this.state.activeTab === '3' })}
                      onClick={() => { this.toggle('3'); }}
                    >
                      Edges Table
                    </NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink
                      className={classnames({ active: this.state.activeTab === '4' })}
                      onClick={() => { this.toggle('4'); }}
                    >
                      Help
                    </NavLink>
                  </NavItem>
                </Nav>
                <TabContent activeTab={this.state.activeTab}>
                  <TabPane tabId="1">
                  </TabPane>
                  <TabPane tabId="2">
                    <Row>
                      <Col sm="12">
                        <h4>Tab 1 Contents</h4>
                        <NodeTable />
                      </Col>
                    </Row>
                  </TabPane>
                  <TabPane tabId="3">
                    <Row>
                      <Col sm="12">
                        <EdgeTable />
                      </Col>
                    </Row>
                  </TabPane>
                  <TabPane tabId="4">
                    <Row>
                      <Col sm="12">
                        <Help />
                      </Col>
                    </Row>
                  </TabPane>
                </TabContent>

                <NetGraph/>
                <div style={{fontSize:'10px',position:'absolute',left:'0px',bottom:'0px',zIndex:'1500',color:'#aaa',backgroundColor:'#eee',padding:'5px 10px'}}>Please contact Professor
                Kalani Craig, Institute for Digital Arts & Humanities at
                (812) 856-5721 (BH) or
                craigkl@indiana.edu with questions or concerns and/or to
                request information contained on this website in an accessible
                format.</div>
              </div>
            </div>
          </div>
        ); // end return
      } // end render()
    } // end class NetCreate

/// EXPORT UNISYS SIGNATURE ///////////////////////////////////////////////////
/// used in init.jsx to set module scope early
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
NetCreate.UMOD = module.id;

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NetCreate
