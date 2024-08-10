/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Comment Test Framework
  
  To run this:
    cd _ur
    ur comment@test-comment

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import * as UR from '@ursys/core';
import ACCOMMENTS from './ac-comment.ts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const { PR } = UR;
const LOG = PR('comment', 'TagRed');

/// FAKE DATABASE CALLS ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// "Load" database data, which are simple arrays

let DB_Users;
let DB_CommentTypes;
let DB_Comments;

DB_Users = [
  { id: 'Ben32', name: 'BenL' },
  { id: 'Sri64', name: 'SriS' },
  { id: 'Joshua11', name: 'JoshuaD' }
];

DB_CommentTypes = [
  {
    id: 'cmt',
    label: 'COMMENT', // comment type label
    prompts: [
      {
        prompt: 'COMMENT', // prompt label
        help: '',
        feedback: ''
      }
    ]
  },
  {
    id: 'questionresponse',
    label: 'Question or response', // comment type label
    prompts: [
      {
        prompt: 'Question or response', // prompt label
        help: '',
        feedback: ''
      }
    ]
  },
  {
    id: 'consistent',
    label: 'Consistent', // comment type label
    prompts: [
      {
        prompt: 'Consistent', // prompt label
        help: '',
        feedback: ''
      }
    ]
  },
  {
    id: 'understandable',
    label: 'Understandable', // comment type label
    prompts: [
      {
        prompt: 'Understandable', // prompt label
        help: '',
        feedback: ''
      }
    ]
  },
  {
    id: 'understandable',
    label: 'Supported by evidence', // comment type label
    prompts: [
      {
        prompt: 'Supported by evidence', // prompt label
        help: `It is important for a scientific model to be supported by evidence.

Does the evidence we have show that the model works this way?
Is there any contradictory evidence that says the model doesn't work this way?
`,
        feedback: 'Consider pointing out relevant evidence by typing evidence #'
      }
    ]
  },
  {
    id: 'changereason',
    label: 'Change + Reason', // comment type label
    prompts: [
      {
        prompt: 'Change',
        help: 'What change do you want to make?',
        feedback: ''
      },
      {
        prompt: 'Reason',
        help: 'Why do you want to make that change',
        feedback: ''
      }
    ]
  },
  {
    id: 'three',
    label: 'Three Points', // comment type label
    prompts: [
      {
        prompt: 'Point 1',
        help: 'What change do you want to make?',
        feedback: ''
      },
      {
        prompt: 'Point 2',
        help: 'Why do you want to make that change',
        feedback: ''
      },
      {
        prompt: 'Point 3',
        help: 'Why do you want to make that change',
        feedback: ''
      }
    ]
  }
];

DB_Comments = [
  {
    collection_ref: 'n1',
    comment_id: '1', // thread
    comment_id_parent: '',
    comment_id_previous: '',
    comment_type: 'cmt', // no prompts
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Ben32',
    commenter_text: ["You're missing a citation."]
  },
  {
    collection_ref: 'n1',
    comment_id: '2', // reply 1
    comment_id_parent: '1',
    comment_id_previous: '',
    comment_type: 'changereason',
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Joshua11',
    commenter_text: [
      'I switched this to be fish die',
      "Because that's what the graph shows, thanks!"
    ]
  },
  {
    collection_ref: 'n1',
    comment_id: '3', // reply 2
    comment_id_parent: '1',
    comment_id_previous: '2',
    comment_type: 'understandable', // no prompts
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Ben32',
    commenter_text: ['OK nvm.']
  },
  {
    collection_ref: 'n1',
    comment_id: '4', // thread
    comment_id_parent: '',
    comment_id_previous: '1',
    comment_type: 'cmt', // no prompts
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Sri64',
    commenter_text: ["I don't think that's a good reason."]
  },
  {
    collection_ref: 'n1',
    comment_id: '5', // reply 1
    comment_id_parent: '4',
    comment_id_previous: '',
    comment_type: 'three',
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Ben32',
    commenter_text: [
      'I switched this to be fish die',
      "Because that's what the graph shows, thanks!",
      ''
    ]
  },
  {
    collection_ref: 'n1',
    comment_id: '6', // thread
    comment_id_parent: '',
    comment_id_previous: '4',
    comment_type: 'cmt', // no prompts
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Ben32',
    commenter_text: ['The last word.']
  },
  {
    collection_ref: 'n2',
    comment_id: '7', // thread
    comment_id_parent: '',
    comment_id_previous: '',
    comment_type: 'cmt', // no prompts
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Joshua11',
    commenter_text: ['A different object.']
  },
  {
    collection_ref: 'e1',
    comment_id: '8', // thread
    comment_id_parent: '',
    comment_id_previous: '',
    comment_type: 'cmt', // no prompts
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'BenL',
    commenter_text: ['An edge comment.']
  }
];

/// HELPER FUNCTIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
ACCOMMENTS.Init();

/// RUNTIME TESTS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
LOG('test-comments loaded');
LOG.warn('test-comments warning');
LOG.info('test-comments info');
LOG.error('test-comments error');

/// Non-logged in users
/// -- view comments (node, edge, node table, edge table)

/// Mutlple Users
/// -- open comment -> network update on same collection should keep it open
/// -- open comment -> network update on diff collection should keep not close it
