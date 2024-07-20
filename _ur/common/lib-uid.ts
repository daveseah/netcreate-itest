/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Universal ID Module

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// TYPE DECLARATIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type Schema = `${string}:`;
type EntityPrefix = `${string}-`;
type EntityID = `${number}`;
type UniversalID = `${Schema}${EntityPrefix}${EntityID}`;
type ShortUID = `${EntityPrefix}${EntityID}`;

/// TYPE ENUMERATIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const SCHEMAS = {
  'meme': {
    'n': 'node',
    'e': 'edge',
    'p': 'project'
  }
};
let DEFAULT_SCHEMA = '';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const LOG = console.log;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let ID_COUNTER = 0;

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Given a string, return the elements of the ID. The schema is optional
 *  and if it isn't present, the schema is an empty string.
 *  The return value is an array of strings: [schema, prefix, id]
 *  If the ID is not in a valid format, an empty array is returned.
 */
function DecodeID(uid: string): string[] {
  if (!IsValidFormat(uid)) return [];
  let bits = uid.split(':');
  if (bits.length < 1 || bits.length > 2) return [];
  if (bits.length === 1) bits.unshift(''); // empty schema is ok
  const [schema, prefix] = bits;
  bits = prefix.split('-');
  if (bits.length !== 2) return [];
  // return schema, entity prefix code, entity
  return [schema, ...bits];
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Create a new Short Universal ID string */
function NewID(prefix: string, int?: number): ShortUID {
  const fn = 'ShortID:';
  if (int !== undefined) {
    if (typeof int !== 'number') throw new Error(`${fn} invalid id ${int}`);
    if (int < 0) throw new Error(`${fn} negative id ${int}`);
    if (int % 1 !== 0) throw new Error(`${fn} non-integer id ${int}`);
  } else {
    int = ID_COUNTER++;
  }
  const uid: ShortUID = `${prefix}-${int}`;
  return uid;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Create a new Full Universal ID string */
function NewFullID(schema: string, prefix: string, int?: number): UniversalID {
  const fn = 'EncodeID:';
  const shortUID = NewID(prefix, int);
  if (!IsValidSchema(schema)) throw new Error(`${fn} unknown schema ${schema}`);
  if (!IsValidPrefix(`${schema}:${prefix}`))
    throw new Error(`${fn} unknown prefix ${prefix}`);
  const uid: UniversalID = `${schema}:${prefix}-${int}`;
  return uid;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** given a valid short ID, return a derivative ID with a different prefix */
function PrefixShortID(uid: string, prefix: string): ShortUID {
  const [_, id] = DecodeID(uid);
  return NewID(prefix, parseInt(id));
}

/// VALIDATION ////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Return true if the ID is in a valid format.
 *  - full form:  [schema]:[entity_code]-[entity_id]
 *  - short form: [entity_code]-[entity_id]`
 *  must be all lowercase
 */
function IsValidFormat(uid: string): boolean {
  const isLowerCase = uid === uid.toLowerCase();
  const isFullForm = /^[\w]+:[\w]+-[\d]+$/.test(uid);
  const isShortForm = /^[\w]+-[\d]+$/.test(uid);
  return isLowerCase && (isFullForm || isShortForm);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Return true if the schema is found in the Schema table. All schemas
 *  are lowercase */
function IsValidSchema(schema: string): boolean {
  return Object.keys(SCHEMAS).includes(schema);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Return true if the entitty prefix is found in the Schema table, optionally
 *  with a schema match string. All prefixes are lowercase */
function IsValidPrefix(sch_pre: string): boolean {
  const fn = 'IsValidPrefix:';
  const bits = sch_pre.split(':');
  if (bits.length > 2) throw new Error(`${fn} Invalid schema prefix ${sch_pre}`);
  if (bits.length === 1) bits.unshift('');
  const [schema, prefix] = bits;
  const isValidSchema = IsValidSchema(schema);
  const isValidPrefix = Object.keys(SCHEMAS[schema]).includes(prefix);
  return isValidSchema && isValidPrefix;
}

/// CONFIGURATION /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** set the default schema that will be returned by DecodeID if this is
 *  desirable for some reason */
function SetDefaultSchema(schema: string): void {
  const fn = 'SetDefaultSchema:';
  if (!IsValidSchema(schema)) throw new Error(`${fn} Invalid schema ${schema}`);
  DEFAULT_SCHEMA = schema;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** get the default schema, which is manually set by SetDefaultSchema */
function GetDefaultSchema(): string {
  return DEFAULT_SCHEMA;
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  // create and decode
  NewID, // [prefix, id] => id
  NewFullID, // [schema, prefix, id] => id
  PrefixShortID, // [id, prefix] => id
  DecodeID, // id => [schema, prefix, id] or []
  // validation
  IsValidFormat, // id => boolean
  IsValidSchema, // schema => boolean
  IsValidPrefix, // schema:prefix  => boolean
  // config
  SetDefaultSchema, // schema => void
  GetDefaultSchema // () => schema
};
