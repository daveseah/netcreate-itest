if (window.NC_DBG) console.log(`inc ${module.id}`);
/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Placeholder Root View

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import React from 'react';
import { Component } from 'react';

/// DEFAULT APPLICATION COMPONENT /////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class AppDefault extends Component {
  constructor() {
    super();
  }
  render() {
    return (
      <div
        style={{
          display: 'flex',
          flexFlow: 'row nowrap',
          width: '100%',
          height: '100%'
        }}
      >
        <div id="left" style={{ flex: '1 0 auto' }}></div>
        <div id="middle" style={{ flex: '3 0 auto' }}>
          <p>AppDefault.jsx</p>
          <h4>NetCreate welcomes you</h4>
          <p>This is a work in progress.</p>
        </div>
        <div id="right" style={{ flex: '1 0 auto' }}></div>
      </div>
    );
  }
  componentDidMount() {
    console.log('AppDefault mounted');
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default AppDefault;
