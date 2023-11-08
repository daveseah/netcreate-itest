/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  THINKING OUT LOUD

  Comments attach to a named subsystem like the Project definition area,
  a specific node

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type AppType = 'netcreate.1' | 'meme.1'; // set context for TemplateType
type TemplateType = 'comments' | 'criteria'; // app-specific templates
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type SubSystemId = 'project' | 'node' | 'edge' | 'evidence';
type GroupId = string;
type CommentId = `${SubSystemId}-${'number'})`;
type DateTimeString = string;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type CommentThread = {
  system: SubSystemId;
  comments: Map<CommentId, Comment>;
  criteria: TemplateType;
};
type Comment = {
  id: CommentId;
  parent_id: CommentId;
  comment_createtime: DateTimeString;
  comment_modifytime: DateTimeString;
  commentor_group: GroupId;
  commentor_name: string;
  commentor_text: string;
};
type CommentsDict = Map<SubSystemId, CommentThread>;

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
