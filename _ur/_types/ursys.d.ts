/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URSYS library types

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/* added for pull request #81 so 'npm run lint' test appears clean */
/* eslint-disable no-unused-vars */

/// MAIN SERVER LIBRARY ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** used for runtime initialization of the server-side URSYS library */
type UR_InitOptions = {
  rootDir: string;
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** general result type returned from API methods. If there is an error,
 *  the 'err' property is set. Otherwise, object will contain keys that
 *  are specific to the method called. Some keys may be undefined if they
 *  don't exist
 */
type UR_ResObj = {
  err?: string;
  [key?: string]: any;
};
