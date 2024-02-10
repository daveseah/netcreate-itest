# Comment Addon

## Data Modules
* ac-comemnt.ts -- Appcore comments handle visual object data for UI state rendering.
* dc-comment.tx -- Datacore comments handle the raw comment data.

### ac-comments Data Structures

* A `COMENTCOLLECTION` is the main data source for the CommentBtn.
  It primarily shows summary information for the three states of the button:
  * has no comments
  * has unread comments
  * has read comments
  It passes on the collection_ref to the CommentThread components.

* `COMMENTVOBJS` are a flat array of data sources for CommentThread ojects.
  It handles the UI view state of the each comment in the thread.


### dc-comments Data Structures

* `COMMENTS` are a flat array of the raw comment data.
  Used by the Comment component to render the text in each comment.

* `READBY` keeps track of which user id has "read" which comment id.
  This can get rather long over time.


## Components
* NCCommentBtn
* NCCommentThread
* NCComment


## Functionality


### Read Status
      
#### Comment Button Read Status
The comment button provides a summary of  has three state indicators:
* No comments yet (`hasUnreadComments: false`, `hasReadComments: false`)
* There are unread comments (`hasUnreadComments: true`)
* There are read comments (`hasReadComments: true`)

#### Comment Read Status
Comments are marked as "read" when the comment is closed.

      