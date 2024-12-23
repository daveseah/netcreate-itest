/* eslint-disable no-alert */
/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  NC Template Editor View
  (replaces `Template.jsx`)

  Displays a variety of tools to edit templates:
  * Edit Node Types
  * Edit Edge Types
  * Download Current Template
  * Create New Template
  * Import Template from File

  This is displayed on the More.jsx component/panel but can be moved
  anywhere.

  Templates can only be edited if:
  * There are no nodes or edges being edited
  * No one is trying to import data
  * There are no other templates being edited

  Conversely, if a Template is being edited, Import, Node and Edge editing
  will be disabled.

  ## BACKGROUND

    Template data is loaded by `server-database` DB.InitializeDatabase call.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const UNISYS = require('unisys/client');
const { EDITORTYPE } = require('system/util/enum');
const TEMPLATE_MGR = require('../templateEditor-mgr');
const SCHEMA = require('../template-schema');
const DATASTORE = require('system/datastore');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let UDATA = null;

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NCTemplate extends UNISYS.Component {
  constructor(props) {
    super(props);
    this.state = {
      disableEdit: false,
      isBeingEdited: false,
      editScope: undefined, // Determines whether the user is tring to edit the
      // template's root (everything in the template),
      // or just focused on a subsection: nodeTypeOptions,
      // edgeTypeOptions
      tomlfile: undefined,
      tomlfileStatus: '',
      tomlfileErrors: undefined,
      tomlfilename: 'loading...'
    };
    this.updateEditState = this.updateEditState.bind(this);
    this.disableOrigLabelFields = this.disableOrigLabelFields.bind(this);
    this.releaseOpenEditor = this.releaseOpenEditor.bind(this);
    this.onNewTemplate = this.onNewTemplate.bind(this);
    this.onCurrentTemplateLoad = this.onCurrentTemplateLoad.bind(this);
    this.onEditNodeTypes = this.onEditNodeTypes.bind(this);
    this.onEditEdgeTypes = this.onEditEdgeTypes.bind(this);
    this.onTOMLfileSelect = this.onTOMLfileSelect.bind(this);
    this.onDownloadTemplate = this.onDownloadTemplate.bind(this);
    this.onSaveChanges = this.onSaveChanges.bind(this);
    this.onCancelEdit = this.onCancelEdit.bind(this);

    UDATA = UNISYS.NewDataLink(this);
    UDATA.HandleMessage('EDIT_PERMISSIONS_UPDATE', this.updateEditState);
  } // constructor

  componentDidMount() {
    this.updateEditState();
    DATASTORE.GetTemplateTOMLFileName().then(result => {
      this.setState({ tomlfilename: result.filename });
    });
  }

  componentWillUnmount() {
    this.releaseOpenEditor();
    UDATA.UnhandleMessage('EDIT_PERMISSIONS_UPDATE', this.updateEditState);
  }

  /// UI EVENT HANDLERS /////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  updateEditState() {
    // disable edit if someone else is editing a template, node, or edge
    let disableEdit = false;
    UDATA.NetCall('SRV_GET_EDIT_STATUS').then(data => {
      // someone else might be editing a template or importing or editing node or edge
      disableEdit =
        data.templateBeingEdited || data.importActive || data.nodeOrEdgeBeingEdited;
      this.setState({ disableEdit });
    });
  }

  // When editing Node or Edge Type Options, the original label field should be
  // disabled so they can't be edited
  // ClassName added in template-schema.GetTypeEditorSchema()
  disableOrigLabelFields() {
    const origLabelFields = document.getElementsByClassName('disabledField');
    // origLabelFields is a HTMLCollection, not an array
    // FISHY FIX...is the use of arrow function here correct? The arrow function
    // arg 'f' is shadowing the 'const f' in the for...of...
    for (const f of origLabelFields) f => f.setAttribute('disabled', 'disabled');
  }

  releaseOpenEditor() {
    UDATA.NetCall('SRV_RELEASE_EDIT_LOCK', { editor: EDITORTYPE.TEMPLATE });
  }

  onNewTemplate() {
    this.setState({ editScope: 'root', isBeingEdited: true });
    this.loadEditor(); // new blank template with default schema
  }

  onCurrentTemplateLoad(e) {
    UDATA.LocalCall('EDIT_CURRENT_TEMPLATE') // nc-logic
      .then(result => {
        this.setState({ editScope: 'root', isBeingEdited: true });
        this.loadEditor({ startval: result.template });
      });
  }

  onEditNodeTypes() {
    UDATA.LocalCall('EDIT_CURRENT_TEMPLATE') // nc-logic
      .then(result => {
        const schemaNodeTypeOptions = SCHEMA.NODETYPEOPTIONS;
        // Wrap options in custom Schema to show Delete management UI
        const nodeTypeEditorSchema =
          SCHEMA.GetTypeEditorSchema(schemaNodeTypeOptions);
        const startval = { options: result.template.nodeDefs.type.options };
        this.setState({ editScope: 'nodeTypeOptions', isBeingEdited: true });
        this.loadEditor(
          {
            schema: nodeTypeEditorSchema,
            startval
          },
          () => {
            this.disableOrigLabelFields();
            // HACK: After a row is added, we need to also disable the newly added
            // "Label" field -- the new label should be added in the "Change To" field
            EDITOR.on('addRow', editor => {
              this.disableOrigLabelFields();
            });
          }
        );
      });
  }

  onEditEdgeTypes() {
    UDATA.LocalCall('EDIT_CURRENT_TEMPLATE') // nc-logic
      .then(result => {
        const schemaEdgeTypeOptions = SCHEMA.EDGETYPEOPTIONS;
        // Wrap options in custom Schema to show Delete management UI
        const edgeTypeEditorSchema =
          SCHEMA.GetTypeEditorSchema(schemaEdgeTypeOptions);
        const startval = { options: result.template.edgeDefs.type.options };
        this.setState({ editScope: 'edgeTypeOptions', isBeingEdited: true });
        this.loadEditor(
          {
            schema: edgeTypeEditorSchema,
            startval
          },
          () => {
            this.disableOrigLabelFields();
            // HACK: After a row is added, we need to also disable the newly added
            // "Label" field -- the new label should be added in the "Change To" field
            EDITOR.on('addRow', editor => {
              this.disableOrigLabelFields();
            });
          }
        );
      });
  }

  onTOMLfileSelect(e) {
    // import
    const tomlfile = e.target.files[0];
    TEMPLATE_MGR.ValidateTOMLFile({ tomlfile }).then(result => {
      if (result.isValid) {
        console.log('got template', result.templateJSON);
        this.onSaveChanges(result.templateJSON);
      } else {
        const errorMsg = result.error;
        this.setState({
          tomlfile: undefined,
          tomlfileStatus: 'Invalid template file!!!',
          tomlfileErrors: errorMsg
        });
      }
    });
  }

  onDownloadTemplate() {
    TEMPLATE_MGR.DownloadTemplate();
  }

  onSaveChanges(templateJSON) {
    TEMPLATE_MGR.SaveTemplateToFile(templateJSON).then(result => {
      console.error('onSaveChanges', result, templateJSON);
      if (!result.OK) {
        alert(result.info);
      } else {
        alert(`Template Saved: ${templateJSON.name}`);
        this.setState({ isBeingEdited: false });
      }
    });
    this.releaseOpenEditor();
  }

  onCancelEdit() {
    this.setState({ isBeingEdited: false });
    this.releaseOpenEditor();
  }

  /// REACT LIFECYCLE METHODS ///////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  render() {
    const {
      disableEdit,
      isBeingEdited,
      tomlfile,
      tomlfileStatus,
      tomlfileErrors,
      tomlfilename
    } = this.state;
    let editorjsx;

    if (disableEdit && !isBeingEdited) {
      // Node or Edge is being edited, show disabled message
      editorjsx = (
        <div>
          <p>
            <i>
              Templates cannot be edited while someone is editing a node, edge, or
              template, or importing data.
            </i>
          </p>
          <p>
            <i>Please finish editing and try again.</i>
          </p>
        </div>
      );
    } else {
      // OK to Edit, show edit buttons
      editorjsx = (
        <div hidden={isBeingEdited}>
          <p>
            <b>PROCEED WITH CAUTION!</b>: Editing templates will modify the data in
            your dataset and may leave your dataset in an unusable state. Only{' '}
            <b>expert users</b> who know how the data is set up should do this.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              columnGap: '10px',
              rowGap: '5px'
            }}
          >
            <i className="small text-muted">Edit Current Template Options</i>
            <br />
            <button size="sm" onClick={this.onEditNodeTypes}>
              Edit Node Types
            </button>
            <button size="sm" onClick={this.onEditEdgeTypes}>
              Edit Edge Types
            </button>
            <p></p>
            <p></p>
            <hr />
            <hr />
            <p>ADVANCED USERS ONLY</p>
            <p></p>
            <div>
              <i className="small text-muted">
                Import TOML template (replace existing template)
              </i>
              <br />
              <label>
                <input
                  type="file"
                  accept="text/toml"
                  id="tomlfileInput"
                  onChange={this.onTOMLfileSelect}
                />
                &nbsp;<i>{tomlfileStatus}</i>
                <br />
                {tomlfileErrors && (
                  <span style={{ color: 'red' }}>{tomlfileErrors}</span>
                )}
              </label>
            </div>
            <p></p>
            <i className="small text-muted">Current Template</i>
            <br />
            <button size="sm" onClick={this.onDownloadTemplate}>
              Download Current Template
            </button>
            <p></p>
            <i className="small text-muted">Create New Template</i>
            <br />
            <button size="sm" onClick={this.onNewTemplate}>
              New Template
            </button>
            <p></p>
          </div>
          <hr />
        </div>
      );
    }
    return (
      <div
        style={{
          backgroundColor: '#0003',
          padding: '10px 20px'
        }}
      >
        <h4>Template Editor</h4>
        <p>
          <label>Current Template File Name:</label> <code>{tomlfilename}</code>
        </p>
        {editorjsx}
        <div hidden={!isBeingEdited}>
          <button onClick={this.onCancelEdit} size="sm">
            Cancel
          </button>
          &nbsp;
          <button onClick={this.onSaveChanges} size="sm" color="primary">
            Save Changes
          </button>
          <hr />
        </div>
        <div id="editor" hidden={!isBeingEdited}></div>
      </div>
    );
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCTemplate;
