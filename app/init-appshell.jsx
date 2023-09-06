/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

    init-appshell.jsx
    application shell loaded and rendered in init.jsx

    These are the top-level React components ("view").

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

/// REACT LIBRARIES ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import React from 'react';
import { Collapse } from 'reactstrap';
import { Navbar, NavbarToggler } from 'reactstrap';
import { NavbarBrand, Nav, NavItem, NavLink } from 'reactstrap';
import { UncontrolledDropdown, DropdownToggle } from 'reactstrap';
import { DropdownMenu, DropdownItem } from 'reactstrap';
//
import { Component } from 'unisys/client';

/// 1. MAIN VIEWS /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
import { GetRouteInfoFromURL, IsLocalHost } from 'settings';
import NetCreate from 'view/netcreate/NetCreate';
// const AppDefault = require('view/default/AppDefault');
// const HTMLFrame = require('view/html-frame/HTMLFrame');

/// APPLICATION NAVBAR + ROUTER VIEW //////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** The application shell consists of a navbar implemented with Reactstrap
 *  components.
 */
class AppShell extends Component {
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  constructor(props) {
    super(props);
    this.toggle = this.toggle.bind(this);
    this.state = {
      isOpen: false
    };
    // bind handler
    this.redirect = this.redirect.bind(this);
    // add UNISYS message for redirects
    this.HandleMessage('SHELL_REDIRECT', this.redirect);
  }
  /** Handle changes in state of his toggle switch */
  toggle() {
    this.setState({
      isOpen: !this.state.isOpen
    });
  }
  /** Called by SHELL_REDIRECT unisys message */
  redirect(data) {
    let { redirect } = data;
    this.props.history.push(redirect);
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Draw top navbar w/ menus and the <NetCreate> view
   */
  render(props) {
    const { route, routeProps } = GetRouteInfoFromURL(window.location.href);
    const isLocalHost = IsLocalHost();
    return (
      <div
        style={{
          display: 'flex',
          flexFlow: 'column nowrap',
          width: '100%',
          height: '100vh'
        }}
      >
        <Navbar
          fixed="top"
          light
          expand="md"
          style={{ backgroundColor: '#f0f0f0', padding: '4px 10px' }}
        >
          <NavbarBrand href="#" style={{ padding: '0' }}>
            <img src="images/netcreate-logo.svg" height="26px" />
          </NavbarBrand>
          <NavbarToggler onClick={this.toggle} />
          <Collapse isOpen={this.state.isOpen} navbar>
            {/*/ (1) add navigation links here /*/}
            <Nav className="ml-auto" navbar hidden={!isLocalHost}>
              {/* extra menu items
                  <NavItem>
                    <NavLink to="/d3forcedemo" tag={RRNavLink} replace>D3 ForceDemo</NavLink>
                  </NavItem>
                  <UncontrolledDropdown direction="right" nav size="sm">
                    <DropdownToggle>
                      Extras
                    </DropdownToggle>
                    <DropdownMenu>
                      <DropdownItem>
                        <NavLink to="/dev-react" tag={RRNavLink} replace>dev-react</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink to="/dev-unisys" tag={RRNavLink} replace>dev-unisys</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink to="/dev-db" tag={RRNavLink} replace>dev-db</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink to="/dev-session" tag={RRNavLink} replace>dev-session</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink to="/simple" tag={RRNavLink} replace>SimpleHTML Example</NavLink>
                      </DropdownItem>
                      <DropdownItem>
                        <NavLink to="/vocabulary" tag={RRNavLink} replace>Network Vocabulary</NavLink>
                      </DropdownItem>
                    </DropdownMenu>
                  </UncontrolledDropdown>
              */}
            </Nav>
          </Collapse>
        </Navbar>
        <div style={{ height: '3.5em' }}>
          {/*/ add space underneath the fixed navbar /*/}
        </div>
        <NetCreate />
      </div>
    );
  } // render()
} // AppShell()

/// EXPORT REACT CLASS ////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default AppShell;
