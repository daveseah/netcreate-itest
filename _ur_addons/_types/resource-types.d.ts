/* eslint-disable no-unused-vars */
/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  special identifiers used for appliction resourcee types

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// APPLICATION IDENTIFIERS ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/ AppType is a hardcoded list of apps in our app ecosphere. Each app type has
    its own set of templatizeable collections
/*/
type AppType = 'netcreate.1' | 'meme.1'; // set context for TemplateType

/// TEMPLATE SYSTEM ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type UObjectID = `${string}-${number}`; // prefix-number
type UIDString = `${string}_${string}`; // must have underscore

/*/ Identity is the base type for any uniquely identifiable collection or
    resource in the system. Templates maintain a set of UIDStrings to ensure
    there are no duplicate names for collections. The entries in each
    Template Collection also use Identity to ensure uniqueness
/*/
interface Identity {
  id: UIDString; // slugified name
  usage: string; // note on what this is used for
  label: string; // display label for this template
}
