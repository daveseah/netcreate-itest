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

/*/ Template collections generally manage a set of props. These would be
    managed by collection-specific managers
/*/
type TemplateType = 'comments' | 'criteria'; // app-specific templates
interface TemplateData<T> extends Identity {
  type: TemplateType; // which type of template this is
  props: Map<string, T>; // map of properties
}

/// SPECIFIC TEMPLATES ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/ Criteria are the "prompts" used for a project 
    TODO: "sentence starters" exist for each criteria; there are multiple
    sentence starters for each criteria
/*/
type CriteriaDict = TemplateData<Criterion>;
interface Criterion extends Identity {
  prompt: string;
  example?: string;
  help?: string;
  default?: string;
}

/*/ Settings are for each type of app-specific context /*/
type SettingDict = TemplateData<Setting>;
interface Setting extends Identity {
  type: string;
  nullable: boolean;
  example?: string;
  help?: string;
  default?: string;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const NAMED_IDS = new Set<UIDString>();
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_CheckID(id: UIDString) {
  const fn = 'CheckNamedID:';
  if (!id) console.error(fn, 'missing id');
  if (NAMED_IDS.has(id)) {
    console.error(fn, `duplicate id: ${id}`);
    return undefined;
  }
  NAMED_IDS.add(id);
  return id;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** generic template collection manager of type T. Any template collection
 *  id or property within
 */
class TemplateManager<T> {
  id: UIDString;
  usage: string;
  label: string;
  props: Map<UIDString, T>;

  constructor(options: Identity) {
    const { id, usage, label } = options || {};
    this.id = m_CheckID(id);
    this.usage = usage;
    this.label = label;
    this.props = new Map();
  }

  /** set an entry of the collection type <T>
   *  you'll have to provide the entire object;
   *  it will be merged with any existing entry.
   *  should be called only once
   */
  addEntry(propName: UIDString, prop: T) {
    const entry = this.props.get(propName);
    if (entry !== undefined) {
      const newEntry = { ...entry, ...prop };
      this.props.set(propName, newEntry);
      return;
    }
    this.props.set(propName, prop);
  }

  /** return the entry matching the key, which
   *  is an entire object of type <T>
   */
  getEntry(propName: UIDString): T {
    return this.props.get(propName);
  }

  /** parse a json string object. ideally we would
   *  be parsing our own template format that is easier
   *  to read
   */
  parseJSON(json: string) {
    console.log('would parse json', json);
  }

  /** return a json string representation of the
   *  template data
   */
  JSON(): string {
    return JSON.stringify(this.props);
  }
}

/// DECLARE COLLECTIONS ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const CRITERIA = new TemplateManager<CriteriaDict>({
  id: 'crit_project_1',
  usage: 'criteria template',
  label: 'project criteria'
});
const COLORS = new TemplateManager<SettingDict>({
  id: 'set_colors_overrides',
  usage: 'color settings template',
  label: 'color overrides'
});
const PROMPTS = new TemplateManager<SettingDict>({
  id: 'named_prompts',
  usage: 'prompt settings template',
  label: 'named prompts'
});

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  TemplateManager, // generic template manager class
  CRITERIA, // project-wide criteria
  COLORS, // color string defintions
  PROMPTS // prompt string definitions
};
