# Comment Addon

A generalized implementation of a comment system using an UR Addon that can be
used across a variety of applications (e.g. Net.Create and MEME).

## Nomenclature

`referent` -- the object the comment is referring to.  e.g. for Net.Create, the referrent might be a node id or edge id.  The `collection_ref` is the id that refers to the `referent`.  Historically called `source`, but deprecated because of conflation with edge source/target.

This can be a little counter-intuitive.
All top level comments are considered roots.
* A second comment is NOT a reply to the first comment.
* However, the second comment is still sequenced after the first.
* Because it's not reply, the second comment can be deleted without having to worry about leaving a placeholder (marked deleted)

* `root` is a top level comment.  Each root is an independent comment -- you cannot reply to a root, removing the root will automatically move the next root up in the list.
* `reply root` is the first comment in a child comment reply thread
* `reply` refers to ANY reply in a comment reply thread


`root`              "First Comment"
`reply/reply_root`    "First Comment Reply 1"   -+
`reply`               "First Comment Reply 2"    | `thread/replies/reply thread`
`reply`               "First Comment Reply 3"   -+
`root`              "Second Comment"


* `root`
* `thread` / `reply`


## Initialization

The comment addon module should be inited by the main application.

e.g. in Net.Create, `NetCreate.jsx` constructor calls `URADD.COMMENT.Init()`

This inits the data modules.

Data is loaded from the DB as a secondary step.


## API

Comments rely on an external `comment-mgr.js` module to be the interface between the URSYS AddOn and the application.  e.g. for Net.Create, there is a `comment-mgr.js` module that handles Net.Create-specific comment handling.

#### URSYS AddOn Calls
// Cross-Comment Component Calls
* `LOAD_COMMENT_DATACORE`
* `COMMENTS_UPDATE`
* `COMMENT_UPDATE`
* `READBY_UPDATE`
// Internal Calls -- calls from commment-mgr to NCComment* component
* `COMMENT_UPDATE_PERMISSIONS`

#### comment-mgr API
The `comment-mgr` module needs to implement a number of required calls.
Particularly import:
* `CMTMGR.LockComment` -- when a comment is being edited, `comment-mgr` needs to lock the comment on the server and broadcast permission updates from the server.  These are then passed on via a local comment-oriented broadcast of `COMMENT_UPDATE_PERMISSIONS`.



## Data Modules
* `ac-comemnt.ts` -- Appcore comments handle visual object data for UI state rendering.
* `dc-comment.ts` -- Datacore comments handle the raw comment data.

Currently there are NO database calls in this module.  Any database loading/updating should be handled by application-specific managers.  e.g. for Net.Create, this is `comment-mgr.js`.

### ac-comments Data Structures

* `COMENTCOLLECTION` is the main data source for the CommentBtn.
  It primarily shows summary information for the three states of the button:
  * has no comments
  * has unread comments
  * has read comments
  It passes on the collection_ref to the CommentThread components.

* `COMMENTVOBJS` are a flat array of data sources for CommentThread ojects.
  It handles the UI view state of the each comment in the thread.


### dc-comments Data Structures

* `USERS` is placeholder pending the development of the full user authentication system.  Currently it just uses any existing session tokens.

* `COMMENTTYPES` is a placeholder pending development of a new template authoring system.  Currently this is hard coded into `dc-comments.ts`.

* `COMMENTS` are a flat array of the raw comment data.
  Used by the Comment component to render the text in each comment.

* `READBY` keeps track of which user id has "read" which comment id.
  This can get rather long over time.
  

---


# Net.Create Implementation 

## Interface to Net.Create
* `comment-mgr.js`

## Interim Database

Pending full implementation of a standalone UR comment module, database calls are handled in Net.Create's `comment-mgr.js`


## React Components
* NCCommentBtn
* NCCommentThread
* NCComment


## Functionality

### Collection Reference

Comment collections are identified by a unique `collection_ref` id.  This provides the bridge between the comment system and the host application.  For example with Net.Create, the collection reference can be a node or edge id.  For MEME, the collection reference can be an entity or outcome.


### Read Status

The system keeps track of which user has read which comment.  
Comments are marked as "read" when the comment is closed.
      
#### Comment Button Read Status
The comment button provides a summary of  has three state indicators:
* No comments yet (`hasUnreadComments: false`, `hasReadComments: false`)
* There are unread comments (`hasUnreadComments: true`)
* There are read comments (`hasReadComments: true`)


      