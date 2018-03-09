/// LIBRARIES /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const React = require('react');
const ReactStrap = require('reactstrap');
const { InputGroup, InputGroupAddon, InputGroupText, Input } = ReactStrap;
const { Col, Button, Form, FormGroup, Label, FormText } = ReactStrap;

/// OTHER COMPONENTS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const NodeEntry = require('./components/NodeEntry');


/** REACT COMPONENT **********************************************************\
	Used by render()'s <Switch> to load a React component (what we call a
	'view' in the NetCreate app). The component should return its elements
	wrapped in a div with the suggested flexbox pr

	index.html           | body          min-height: 100%
	index.html           | div#app
	init-appshell        |   div         display:flex, flex-flow:column nowrap,
	                                     width:100%, height:100vh
	init-appshell        |     Navbar    position:fixed
	--- COMPONENT BELOW ---
	<RequiredComponent>  |     div       this is a child of a flexbox
\* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */
class Prototype extends React.Component {
	render() {
		return (
		<div style={{display:'flex', flexFlow:'row nowrap',
		     width:'100%', height:'100%'}}>
			<div id="left" style={{backgroundColor:'#E0ffff', flex:'1 0 auto', padding:'10px'}}>
			</div>
			<div id="middle" style={{backgroundColor:'#ffE0ff', flex:'3 0 auto'}}>
				<NodeEntry/>
			</div>
			<div id="right" style={{backgroundColor:'#ffffE0', flex:'1 0 auto'}}>
				right-side
			</div>
		</div>
		);
	}
	componentDidMount () {
		console.log('Prototype mounted');
	}
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = Prototype;
