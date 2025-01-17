/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Prototype Simple NetCreate Search Field

  Built for Version 2.0 ITEST.

  Provides a:
  * Search Field
  * "Add New Node" button
  * Autosuggest highlighter

  USAGE

    <NCSearch />

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const UNISYS = require('unisys/client');
const NCAutoSuggest = require('./NCAutoSuggest');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'NCSearch';
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let UDATA;

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// export a class object for consumption by brunch/require
class NCSearch extends UNISYS.Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoggedIn: false,
      uIsLockedByComment: false,
      value: ''
    }; // initialized on componentDidMount and clearSelection

    this.UpdateSession = this.UpdateSession.bind(this);
    this.SetPermissions = this.SetPermissions.bind(this);
    this.UIOnChange = this.UIOnChange.bind(this);
    this.UIOnSelect = this.UIOnSelect.bind(this);
    this.UINewNode = this.UINewNode.bind(this);

    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /// REGISTER LISTENERS
    UDATA.OnAppStateChange('SESSION', this.UpdateSession);
    UDATA.HandleMessage('EDIT_PERMISSIONS_UPDATE', this.SetPermissions);
  }

  componentWillUnmount() {
    UDATA.AppStateChangeOff('SESSION', this.UpdateSession);
    UDATA.UnhandleMessage('EDIT_PERMISSIONS_UPDATE', this.SetPermissions);
  }

  /**
   * Handle change in SESSION data
   * SESSION is called by SessionShell when the ID changes
   * set system-wide. data: { classId, projId, hashedId, groupId, isValid }
   * Called both by componentWillMount() and AppStateChange handler.
   * The 'SESSION' state change is triggered in two places in SessionShell during
   * its handleChange() when active typing is occuring, and also during
   * SessionShell.componentWillMount()
   */
  UpdateSession(decoded) {
    this.setState({ isLoggedIn: decoded.isValid });
  }

  SetPermissions(data) {
    UDATA.NetCall('SRV_GET_EDIT_STATUS').then(data => {
      this.setState({
        uIsLockedByComment: data.commentBeingEditedByMe
      });
    });
  }
  /**
   * The callback function (cb) is used to restore the selection point
   * otherwise the `value` state update will leave the cursor at the end of the field.
   */
  UIOnChange(key, value, cb) {
    // Pass the input value (node label search string) to UDATA
    // which will in turn pass the searchLabel back to the SEARCH
    // state handler in the constructor, which will in turn set the state
    // of the input value to be passed on to AutoSuggest
    this.AppCall('SOURCE_SEARCH', { searchString: value });
    // Update current input value and restore the cursor position
    this.setState({ value }, () => {
      if (typeof cb === 'function') cb();
    });
  }

  UIOnSelect(key, value, id) {
    const { isLoggedIn } = this.state;
    // match existing vs create new
    this.setState({ value }, () => {
      if (id) {
        // open existing node
        UDATA.LocalCall('D3_SELECT_NODE', { nodeIDs: [id] });
      } else if (isLoggedIn) {
        // create a new node
        this.UINewNode();
      }
    }); // Enter will create a new node
  }

  UINewNode() {
    const { value } = this.state;
    const data = {};
    data.label = value;
    UDATA.LocalCall('NODE_CREATE', data).then(node => {
      UDATA.LocalCall('D3_SELECT_NODE', { nodeIDs: [node.id] }).then(() => {
        UDATA.LocalCall('NODE_EDIT', { nodeID: node.id });
      });
    });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// MAIN RENDER
  ///
  render() {
    const { value, isLoggedIn, uIsLockedByComment } = this.state;
    const newNodeBtnHidden = !isLoggedIn || uIsLockedByComment;
    const newNodeBtnDisabled = value === '';
    const key = 'search'; // used for search/source/target, placeholder for search
    return (
      <div className="--NCSearch ncsearch">
        <NCAutoSuggest
          parentKey={key}
          value={value}
          onChange={this.UIOnChange}
          onSelect={this.UIOnSelect}
        />
        <button
          hidden={newNodeBtnHidden}
          disabled={newNodeBtnDisabled}
          onClick={this.UINewNode}
        >
          New Node
        </button>
      </div>
    );
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCSearch;
