/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  THINKING WIP
  
  Playing around with type declarations for the template system
  these probably would be used by a wrapper

  The template system defines a dictionary of props. There's a default set
  of settings for each application which defines several collections. In
  general there are three levels:
  - app default definitions
  - activity-specific overrides
  - class-specific overrides

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// TEMPLATE SYSTEM ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** AppType is a hardcoded list of apps in our app ecosphere. Each app type has
 *  its own set of templatizeable collections
 */
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type AppType = 'netcreate.1' | 'meme.1'; // set context for TemplateType
type TemplateType = 'comments' | 'criteria'; // app-specific templates
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Template collections generally manage a set of props. These would be
 *  managed by collection-specific managers
 */
type TemplateDef<T> = {
  usage: string;
  label: string;
  props: Map<string, T>;
};
type TemplateDict<T> = Map<TemplateType, TemplateDef<T>>;

/// CRITERIA ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Criteria are the "prompts" used for a project */
type Criterion = {
  usage: string;
  label: string;
  prompt: string;
  example?: string;
  help?: string;
  default?: string;
};
type CriteriaDict = TemplateDict<Criterion>;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Settings are for eah type of app-specific context */
type Setting = {
  usage: string;
  label: string;
  type: string;
  nullable: boolean;
  example?: string;
  help?: string;
  default?: string;
};
type SettingDict = TemplateDict<Setting>;

/// DECLARE COLLECTIONS ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const CRITERIA: CriteriaDict = new Map();
const COLORS: SettingDict = new Map();
const PROMPTS: SettingDict = new Map();

/*** INSERT CLASS DECLARATION HERE ***/

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  CRITERIA, // project-wide criteria
  COLORS, // color string defintions
  PROMPTS // prompt string definitions
};
