/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  CommentPrompt

  In edit mode, displays input widgets for entering prompts.
  In view mode, displays static comment prompt.
  A comment can contain one or more comment prompts.
  Each prompt can use a different prompt format.

  PROMPT FORMATS:
    - text
    - dropdown
    - checkbox
    - likert
    - radio
    - discrete-slider

  Prompt formats use exact `text` matching to determine the selected item,
  not an index.  So if you change the label on the prompt type, you will
  have to update the selection as well.  The rationale for this is that
  we want the comment database data to be as human-readable as possible.
  Otherwise comment data would mostly be a series of indices that you
  would have to back-match:
    - dropdown
    - likert
    - radio
  The exceptions are:
    - checkbox -- matches `text` within a \n-delimited string
    - discrete-slider -- matches based on the selected index value
                         In this case, using the value makes sense
                         because the saved data is a number.

  USE:

    <NCCommentPrompt
      commentType={comment_type} // currently selected comment type, not stored comment.comment_type
      comment={comment}
      cvobj={cvobj}
      viewMode={uViewMode}
      onChange={this.UIOnInputUpdate}
    />

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const NCUI = require('../nc-ui');
const CMTMGR = require('../comment-mgr');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'NCCommentPrompt';

const CHECKBOX_DELIMITER = /\n/;

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NCCommentPrompt extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    // DATA PROCESSORS
    this.SplitCheckboxCommentText = this.SplitCheckboxCommentText.bind(this);
    this.SelectedIndex2CommentText = this.SelectedIndex2CommentText.bind(this);

    // RENDERERS
    this.RenderEditMode = this.RenderEditMode.bind(this);
    this.RenderViewMode = this.RenderViewMode.bind(this);

    // UI HANDLERS
    this.UIOnCheck = this.UIOnCheck.bind(this);
  }

  /**
   * Converts "Apple Pie\nApple Fritter" into ["Apple Pie", "Apple Fritter"]
   * @param {string} commenterTextString newline delimited string, e.g. "Apple Pie\nApple Fritter"
   * @returns {string[]}
   */
  SplitCheckboxCommentText(commenterTextString) {
    if (!commenterTextString) return [];
    return commenterTextString.split(CHECKBOX_DELIMITER);
  }

  /**
   * Converts a selection index into a stacked discrete slider string
   * to save as comment text, e.g. 2 becomes `★★★`
   * Each option can have a different value
   * @param {number} index the selected item index (0-based)
   * @param {string[]} options e.g.  ['💙', '💚', '💛', '🧡', '🩷']
   * @returns {string} e.g. 2 returns '💙💚💛'
   */
  SelectedIndex2CommentText(index, options) {
    return options.map((o, i) => (i <= index ? o : '')).join('');
  }

  /**
   * Triggers onChange handler with derived data
   * Combines all checkbox items into a single newline-delimited string
   * e.g. "Apple\nBanana"
   * @param {*} promptIndex
   * @param {*} optionIndex
   * @param {*} options
   * @param {*} event
   */
  UIOnCheck(promptIndex, optionIndex, options, event) {
    const { comment, onChange } = this.props;
    // e.g. selectedCheckboxes =  ["Apple Pie", "Apple Fritter"]
    const selectedCheckboxes = this.SplitCheckboxCommentText(
      comment.commenter_text[promptIndex]
    );
    let items = [];
    options.forEach((o, index) => {
      if (optionIndex === index) {
        // handle the current selection
        if (event.target.checked) items[index] = o;
        else items[index] = '';
      } else {
        // handle previous selections
        if (selectedCheckboxes.includes(o)) items[index] = o;
        else items[index] = '';
      }
    });
    event.target.value = items.join('\n');
    onChange(promptIndex, event);
  }

  RenderEditMode() {
    const { commentType, comment, cvobj, viewMode, onChange } = this.props;
    const commentTypes = CMTMGR.GetCommentTypes();
    const commenterText = comment.commenter_text;
    const comment_error = 'placeholder';

    let promptsJSX = [];
    commentTypes.get(commentType).prompts.map((prompt, promptIndex) => {
      let inputJSX;
      switch (prompt.format) {
        case 'text':
          inputJSX = (
            <textarea
              autoFocus
              onChange={event => onChange(promptIndex, event)}
              value={commenterText[promptIndex]}
            />
          );
          break;
        case 'dropdown':
          inputJSX = (
            <select
              value={commenterText[promptIndex]}
              onChange={event => onChange(promptIndex, event)}
            >
              {prompt.options.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );
          break;
        case 'checkbox': {
          // converts commment text into ["Apple", "Banana"]
          const selectedCheckboxes = this.SplitCheckboxCommentText(
            commenterText[promptIndex]
          );
          inputJSX = (
            <div className="prompt">
              {prompt.options.map((option, optionIndex) => {
                return (
                  <label key={optionIndex}>
                    <input
                      type="checkbox"
                      value={option}
                      onChange={event =>
                        this.UIOnCheck(
                          promptIndex,
                          optionIndex,
                          prompt.options,
                          event
                        )
                      }
                      checked={selectedCheckboxes.includes(option)}
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          );
          break;
        }
        case 'radio':
          inputJSX = (
            <div>
              {prompt.options.map((option, index) => (
                <label key={index}>
                  <input
                    type="radio"
                    value={option}
                    onChange={event => onChange(promptIndex, event)}
                    checked={commenterText[promptIndex] === option}
                  />
                  {option}
                </label>
              ))}
            </div>
          );
          break;
        case 'likert':
          inputJSX = (
            <div className="prompt">
              {prompt.options.map((option, optionIndex) => (
                <button
                  key={optionIndex}
                  value={option}
                  className={
                    commenterText[promptIndex] === option ? 'selected' : 'notselected'
                  }
                  onClick={event => onChange(promptIndex, event)}
                >
                  {option}
                </button>
              ))}
            </div>
          );
          break;
        case 'discrete-slider':
          inputJSX = (
            <div className="prompt">
              {prompt.options.map((option, index) => (
                <button
                  key={index}
                  value={[
                    index,
                    this.SelectedIndex2CommentText(index, prompt.options)
                  ]}
                  className={
                    String(index) <= commenterText[promptIndex]
                      ? 'selected'
                      : 'notselected'
                  }
                  onClick={event => onChange(promptIndex, event)}
                >
                  {option}
                </button>
              ))}
            </div>
          );
          break;
      }
      let promptJSX = (
        <div key={promptIndex}>
          <div className="label">{prompt.prompt}</div>
          <div className="help">{prompt.help}</div>
          {inputJSX}
          <div className="feedback">{prompt.feedback}</div>
          <div className="error">{comment_error}</div>
          <hr />
        </div>
      );
      promptsJSX.push(promptJSX);
    });
    return promptsJSX;
  }

  RenderViewMode() {
    const { commentType, comment, cvobj, viewMode, onChange } = this.props;
    const commentTypes = CMTMGR.GetCommentTypes();
    const commenterText = comment.commenter_text;

    const comment_error = 'placeholder';
    const NOTHING_SELECTED = <span className="help">(nothing selected)</span>;

    let promptsJSX = [];
    commentTypes.get(commentType).prompts.map((prompt, promptIndex) => {
      let displayJSX;
      switch (prompt.format) {
        case 'text':
        case 'dropdown':
        case 'radio':
          displayJSX = (
            <div className="commenttext">
              {!comment.comment_isMarkedDeleted && commenterText[promptIndex]}
              {commenterText[promptIndex] === undefined && NOTHING_SELECTED}
            </div>
          );
          break;
        case 'checkbox': {
          // converts commment text into ["Apple", "Banana"]
          const selectedCheckboxes = this.SplitCheckboxCommentText(
            commenterText[promptIndex]
          );
          displayJSX = (
            <div className="prompt">
              {prompt.options.map((option, optionIndex) => (
                <label key={optionIndex}>
                  <input
                    type="checkbox"
                    value={option}
                    checked={selectedCheckboxes.includes(option)}
                    readOnly // React will emit warning if there isn't an onChange handler
                    className={'readonly'} // css: class is necessary for styling
                    // css: `input[type='checkbox']:read-only` doesn't work -- it matches non-`readOnly` too
                    // css: `disabled` grays out the checkbox too much, use the css class to style
                  />
                  {option}
                </label>
              ))}
            </div>
          );
          break;
        }
        case 'likert':
          displayJSX = (
            <div className="prompt">
              {prompt.options.map((option, index) => (
                <button
                  key={index}
                  value={option}
                  className={
                    commenterText[promptIndex] === option ? 'selected' : 'notselected'
                  }
                  disabled
                >
                  {option}
                </button>
              ))}
            </div>
          );
          break;
        case 'discrete-slider':
          displayJSX = (
            <div className="prompt">
              {prompt.options.map((option, index) => (
                <button
                  key={index}
                  value={option}
                  className={
                    String(index) <= commenterText[promptIndex]
                      ? 'selected'
                      : 'notselected'
                  }
                  disabled
                >
                  {option}
                </button>
              ))}
            </div>
          );
          break;
      }

      let promptJSX = (
        <div key={promptIndex} className="comment-item">
          <div className="label">
            <div className="comment-icon-inline">
              {!cvobj.isMarkedRead &&
                !comment.comment_isMarkedDeleted &&
                CMTMGR.COMMENTICON}
            </div>
            {prompt.prompt}
          </div>
          <div className="help">{prompt.help}</div>
          {displayJSX}
          <div className="feedback">{prompt.feedback}</div>
          <div className="error">{comment_error}</div>
          <hr />
        </div>
      );
      promptsJSX.push(promptJSX);
    });
    return promptsJSX;
  }

  render() {
    if (this.props.viewMode === NCUI.VIEWMODE.EDIT) {
      return this.RenderEditMode();
    } else {
      return this.RenderViewMode();
    }
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCCommentPrompt;
