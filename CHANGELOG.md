# CHANGELOG


[Unreleased](#unreleased)
[1.5.1](#1.5.1) -- 2024 Jan 8 -- [tag](https://github.com/netcreateorg/netcreate-itest/releases/tag/1.5.1)
[1.5.0](#1.5.0) -- 2023 Dec 23 -- [tag](https://github.com/netcreateorg/netcreate-itest/releases/tag/1.5.0)
[1.4.0](#1.4.0) -- 2022 Apr 11 -- [tag](https://github.com/netcreateorg/netcreate-itest/releases/tag/1.4.0)
[1.3.1](#1.3.1) -- 2020 Sep 21 -- [tag](https://github.com/netcreateorg/netcreate-itest/releases/tag/1.3.1)
[1.3.0](#1.3.0) -- 2020 Aug 26 -- [tag](https://github.com/netcreateorg/netcreate-itest/releases/tag/1.3.0)
[1.2.1](#1.2.1) -- 2020 Jun 5 -- [tag](https://github.com/netcreateorg/netcreate-itest/releases/tag/1.2.1)
[1.2.0](#1.2.0) -- 2019 May 2 -- [tag](https://github.com/netcreateorg/netcreate-itest/releases/tag/1.2.0)
[1.1.0](#1.1.0) -- 2019 Feb 12 -- [tag](https://github.com/netcreateorg/netcreate-itest/releases/tag/1.1.0)
[1.0.1](#1.0.1) -- 2018 Oct 2 -- [tag](https://github.com/netcreateorg/netcreate-itest/releases/tag/1.0.1)
[1.0.0](#1.0.0) -- 2018 Sep 30 -- [tag](https://github.com/netcreateorg/netcreate-itest/releases/tag/1.0.0)
[0.1.0](#0.1.0) -- 2018 Aug 28 -- [tag](https://github.com/netcreateorg/netcreate-itest/releases/tag/0.1.0)

---
# [Unreleased] <a name="unreleased"></a>

Candidate version 1.6.0 "Commenting"
To be released April 2024

v1.6.0 introduces "commenting".  Database/file data format has changed significantly with 1.5.x so pre-1.4.x data (*.loki) and template (*.json) files are no longer compatible.

### Breaking Changes
- Pre-Version 1.5.x project files are no longer compatible.
  - Comments have been added to the database #133
  - `created`, `updated`, `revision` meta fields are now consistently used #129

### Significant Features
- Add Comment System  #133 -- including support for:
	- floating draggable comment windows
	- displays of comment counts
	- two levels of comment replies
	- comment templates
	- displaying "read" status on a per-user basis
	- editing, deletion
	- confirmation dialog when canceling or editing an unsaved comment
	- working with comments directly in tables
- Module Infrastructure -- #132 #134 #138

### Changes (Minor)
- AutoSuggest now has a placeholder text and scrolls #123
- `Provenance` is now displayed in Node and Edge Tables #129

### Fixed
- The focus filter for Edge Tables are now properly refreshed after switching to an Edge Table view #129
- `Provenance` fields can be edited again #129
- Importing exported csv files into Windows Excel no longer chokes on blank lines #137

### Developer Improvements
- Adds support for `addons` for the core URSYS library #132
- Adds a testing framework and V2 state manager #134
- Rewrite URNET messaging system for the following communication interfaces: Unix Domain Sockets, WebSocketServer, and Browser WebSockets. #138

### Added
### Fixed
### Changed
### Deprecated
### Removed
### Security

----
# [1.5.1] -- January 2024 Data Collection<a name="1.5.1"></a>
Released 2024 Jan 8 -- *for January 11, 2024 Data Collection*
### Added
* Numeric input fields default to 0 rather than blank

----
# [1.5.0] -- January 2024 Data Collection<a name="1.5.0"></a>
Released 2023 Dec 23 -- *for January 11, 2024 Data Collection*

### Significant Features

v1.5.0 introduces a two new significant features:
* A **new UI** for **Node** and **Edge** editing that splits out "ATTRIBUTES", "EDGES", and "PROVENANCE" into separate tabs. #39
* Custom Node and Edge fields can now be added via templates (prior to this you could only rename an existing field). #39

### Minor Features
* A "Focus" filter can highlight a selected node and a customizable range of connected nodes. [#275](https://github.com/netcreateorg/netcreate-2018/pull/275)
* Filters will now show statistics of how many nodes and edges are currently being filtered. #95
* Filters now support using `&&` and `||` in search strings. #105
* Edges now have a `weight` property that determines the width of the edge. [#285](https://github.com/netcreateorg/netcreate-2018/pull/285)
* Markdown now supports images (with scaling) and emoticons for Nodes, Edges, and tables. #91
* Research logs now follow a consistent column format so that exports can be more easily compared. #112

### Developer Improvements
* Required node version updated to `v18.18.2` (was v18.16.0 and v10.22.0) #89, #2, #1
* `npm` version detection now shows errors and instructions for handling Apple Silicon (ARM) processors #1
* Prettier linting is now fixed and enabled, so code format consistency is maintained. #7
* Various Visual Studio Code quality of life improvements. #6, #71

And many other infrastructure and minor fixes.

### Caveats
* **Template Editor not fully functional** -- With the introduction of custom attribute fields, the JSON-Editor functionality is broken. You can still use the Template Editor to change templates for projects that use the default fields, but any project that has custom fields (e.g. fields that have **NOT** been defined in `template-schema.js`) will corrupt your template.  See #115.

---
# [1.4.0]<a name="1.4.0"></a>
Released 2022 Apr 18

Version 1.4.0 release focuses on improvements in filtering, data import and export.

The Net.Create database/file data format has changed significantly with 1.4.0 so pre-1.4.0  data (`*.loki`) and template (`*.json`) files are no longer compatible.

### Key Features
See the [wiki](../../wiki) and pull requests for details:

* #169 Filters
* #179 Export Data
* #217 Import Data
* #198 Flattened Data Format
* #194 TOML Template Editor
* Misc Changes

#### Filters
A new "Filters" panel allows you to:

* "Highlight" nodes and edges -- will show nodes and edges that match the criteria and "fade" nodes and edges that do not match the criteria, retaining the original shape of the graph.
* "Filter" niodes and edges  -- will show nodes and edges that match the criteria and "hide" nodes and edges that do not match the criteria, redrawing the graph so that hidden nodes and edges do not change the shape of the graph.


#### Export Data
Currently visible nodes and edges can be exported to a comma-delimited `.csv` file.  Nodes and edges are exported to separate files. 

See [Export Data](../../wiki/Export-Data) for more information.


#### Import Data
Nodes and edges can be imported into the currently open graph via comma-delimited `.csv` files.  

See [Import Data](../../wiki/Import-Data) for more information.


#### Flattened Data Format
The original Net.Create data format was based on the Google Fusion export format that encapsulated arbitrary fields in an `attributes` object. When reading and writing data, we converted back and forth between an internal representation which used a flat set of variables (e.g. `node.type`) to the encapsulated format (e.g. `node.attributes.NodeType`). This added unnecessary complexity to data handling, especially with regards to exporting, importing data and template streamlining.

With the implementation of exporting, importing, and template improvements, this seemed a natural time to also update the data format. It would simplify the implementation of those features.

Opening a pre-1.4.0 project should automatically convert it to the 1.4.0 format.

See [Database Versions](../../wiki/Database-Versions) for more information.


#### TOML Template Editor
Prior to Version 1.4.0, project templates were stored as `*.json` files.  While json files are convenient for early prototyping, they are difficult for novices to edit.  With 1.4.0, we have converted the template files to a TOML format, which is easier to read and edit, AND, we have added a JSON editor.

Opening a pre-1.4.0 project and project template should automatically convert them to the 1.4.0 format.

See [Using Templates](../../wiki/Using-Templates) for more information.


#### Misc Changes
See also commits by JDanish dated between Oct and Dec 2020 for miscellaneous changes.

---
# [1.3.1]<a name="1.3.1"></a>
Released 2020 Sep 17

Version 1.3.1 release focuses on performance optimizations, especially around network  #129

#### Network Reliability Reporting
To improve the use of Net.Create on low-quality networks:

* Extend the wait time for heartbeats. Both the server and the client will wait for 10 seconds before declaring a disconnect. Heartbeats should be generated by the server every 5 seconds, so this gives us a large window.

* Show a specific "Client Disconnect" or "Server Disconnect" with a timestamp error for users.

    "Client Disconnected" -- Client did not receive a "ping" heartbeat from the server within the time allowed. Usually this is a result of the client losing the internet connection.

    "Server Disconnected" -- Either the server shut down, or the server did not receive a "pong" response from the client within the time allowed. Usually this is a result of the server initiating the disconnect as it shuts down.

* Log the missing "pong" message to the server logs along with the UADDR so you can identify the machine thats down. e.g.
11:30:39 tacitus SRV-NET - UADDR_02 pong not received before time ran out -- CLIENT CONNECTION DEAD!

* Add GZIP compression for all files. In some cases resulting in an 80% reduction in data that has to be sent over the wires.
This isn't a perfect solution but perhaps it'll give us a little more information about what's going on.

* Bugfix: Wrap standalone calls in a promise to prevent LOADASSETS lifecycle errors.  Addresses #132 and #136.

* Replace font-awesome (?) badge with a css badge.  This reduces load time by about 2 seconds. #136.

* Delay blocking javascript loads so that main app page will load and display. #135, #136.

* Display a "Loading Net.Create..." message so user knows the page is loading.  #135, #136.

* Add minification with `terser`.

#### NodeTable / EdgeTable Improvements

* NodeTable and EdgeTable are now only loaded when their respective tab is visible.  This saves about 2 seconds during page processing time. #136.
* Markdown rendering has been optimized. #139 
* NodeTables and EdgeTables no longer disappear when a node is selected. #137, #138 
* Degrees are now displayed again.  6fc35cc6770eb2ad93235d93a865ff4510608ead
* Properly unmount NodeTable and EdgeTable db864d645515e632a196f07a37750493b5ffd9df


---
# [1.3.0]<a name="1.3.0"></a>
Released 2020 Aug 25

Version 1.3.0 introduces two main sets of features:
* Support for running multiple instances of NetCreate on a single server
* Filtering

### New Features

#### Support for running multiple NetCreate instances

In order to support running multiple NetCreate instances on a single serve, we need to be able to specify the ip address, ip port, websocket port, and dataset to be used with each instance.

* The ip address used to access the application can now be set via `nc.js`.  This is necessary to enable multiple instances of NetCreate to run on the same server.  f1aaadb883b18393367496ce87372709b610f187

* The ip port used to access the application can now be set via `nc.js`.  This is necessary to enable multiple instances of NetCreate to run on the same server.  abdf0e65f9123b823ebf0becc35ac535c552aca8

* The websocket port used to access the application can now be set via `nc.js`.  This is necessary to enable multiple instances of NetCreate to run on the same server.  5047a6cca55fac7ca3315090f5fc619c2af1aacc

* The currently selected dataset is now shown in the browser title field.  0f26ee55bac23913a60f957f44417e1d08f254d6

* The currently selected dataset is now included with logs.  ec402e6d56eb38ad0475dee647fd49905d76f8e6


#### Filtering #113

A new filters panel allows users to show or hide nodes and edges based on specific search criteria.

* Nodes and edges are filtered separately. 38057f3ec45a6c2cf4ad03faf3d986bb243df784

* Available filters are determined via template settings. ca7b888a2aede5286aa53bbe2acf39f61833185b

* All filters can be cleared with a "Clear Filters" button.  1fbb7ba659c0fd462d4747c426dda466045e640c

* A summary of active filters is displayed when the Filters panel is closed. 
 997e69d025b2583b4cb9e09973c5e38f603c1c5d

* Filtered objects are hidden (not removed).  bdb4ab74053a908e8586512f54050f29f4967352

* General improvements to the InfoPanel.  fc5d375ed818a04d2863f34c77b8646571bf9f39 b391b2659b2cc01eadc3b1d08f4a4c9df3e07359 cfc9e4e576202f3d82e4d884ae43e09e610ca138 f649cb4cb5fd391dcdc4730715496ed4cb6917d2

#### Token Improvements
* A dataset can be hidden by default, requiring users to provide a token in order to view. #98  The option is set via the template.  79ea683adcce73b99c07654839353a8329707c35

* Tokens are now dataset-specific.  #72.  A token generated for one dataset cannot be used with different datsaet. c4aa0ef34abb07793c45b8218356d18bd96375b6

#### Network Support

* Internet connection disruptions are now detected.  #106.  #107.  A "Server Disconnected" message is shown.   Users are allowed to manipulate the graph, but not edit it. 8648e3d10e6f6f0600c46c06221a4ad58a4c1776 f6696999d12c719f871445c57dd40e2610a05ed7

* Both clients and servers now monitor their connections to each other and can detect a loss of internet as well as the server shutting down.  #126.

### Improvements

#### General

* Optimized EdgeEditor display to improve rendering times. d3c2f4255add2045d47acbf4be29c55072092b5a

* Log file fields now all use tab delimiters.  b0a71300b72017e7f53451b7db9abbfef7ba1ee2


#### Improve vertical space for smaller screens. #97

* The login field is now in the navbar. bcf5ec29a4a61a539ed5b79a48c464053013eb09

* Tightened layout of navbar.  566c9299412a3839dd610c25fd6c2713971d8303

* Tightened layout of Search field and labels.  423d25b388af4152536728d24b8d2706a3b5fbf8 2f74dad0fe0808bf823eb83449920d2b59da20a9

* Hyphenate form labels to prevent labels from overwriting the entry fields. 19e6b2b76b24ec2a4d80b971bc076c18bf792471 6a0f3be8e2b79d038273ff169099e70d8ac4abfa 24edcd7785decc10ce5ad6aeee4278b4d86b4283

* The "Extras" button visible on localhost and used mostly for dev work is now hidden.  d3b4ec2af174c05f42b4e9479017c84bf66a974b

#### Storybook

* Introduced the Storybook framework for designing and testing components.  8cfaf61b9d0a42d87f93319d642bc36a947d7856 0d02cde3ae637310a81b3b56b6074ae452bbc1e5


### Bug Fixes
* Nodes and edges locked by a client are now released when the client loses their internet connection.  #126.

* Canceling Edge Edit on a new edge now properly clears unsaved edge and restores the UI state.  #94, #96, #101, eeedac15350c1a32bc95b1c0ef483d0fb8a31706

* Deleting a node no longer causes data corruption if a user adds a new edge with the deleted node. 62294cd91247edf1820a17fa8563a95dcbadd8c8

* The "Copyright" footer no longer displays in the wrong position on Android and iOS tablets.  2285eb40670ec17b934f76e960531f2ea9030261

* Fixed "Each child in a list should have a unique "key" property" error introduced with toolTipAnchor.  142a46a2b55c87ae703a8328af87a08c9cfc4ef9

* AutoComplete field is now properly re-enabled after enabling edit mode.  57ce99c0d3b3331a64c275ad9d5de00963c2a35d

* Misc bug fixes.

---
# [1.2.1]<a name="1.2.1"></a>
Released 2020 May 27

Tagged prior to NetCreate extension work for version 1.3.0.

* #75 -- A number of features including
  * tool tips based on the help text in the template fill
  * fixes the googlea flag so that it works, and 
  * changes package to allow multiple data sets to run from one set of html

* #85 -- A number of additions required for our Spring data collection including:

  *  Addition of a field (categories)
  *  Performance optimizations.
  *  Tooltips for the various nodes, edges, and key.
  *  Updates to the template file to support those.
  *  A new "cite" button for nodes and edges.
  *  Tables now sort both directions.
  *  Tooltips on the nodes themselves for a quick view.
  *  Myriad Library updates

* #88 -- Two minor tweaks:

  *  added tooltips to the graph title in the main graph area
  *  moved tooltip css out of the index file to a separate tooltip,css

---
# [1.2.0]<a name="1.2.0"></a>
Released 2019 May 2
(changes were implemented 3/12/2019)

Released prior to transfer of repository to `netcreateorg`.

### New Features

* Console script to select database + template -- #67 -- You can now select a database file, a corresponding template file, and start the server with one command: `./nc.js --dataset=projectname`.  (This addresses issue #65).

* Add color key / legend -- #69 -- This implements a simple legend display across the bottom of the graph.


### Fixes / Bugs

* Allow edit target when source and target share the same parent node. -- #71 -- When the source and target nodes both point to the parent node, they could not be edited.  The fix was to allow editing only of the target node.  This addresses issues #68  and #70.

---
# [1.1.0] -- Tacitus Study<a name="1.1.0"></a>
Released 2019 Feb 3 -- *for the February 4, 2019 study with Tacitus*

### New Features:

* Offline Netgraph Viewing -- #41, #46 -- Added the ability to archive the current model to publish as a read-only web site.
* Group ID and SubGroupID -- #42 -- Added the ability to log in by subgroup, e.g. `MOD-BUGULE-LME-ID02`.  Added a "Login" button to acccomodate subgroup logins-- #48.
* Zoom Buttons -- #43 -- Added zoom buttons.
* Duplicate Node Title warning -- #43 
* Node Table improvements
  * Show degrees -- #43 
  * Table buttons and header row are now fixed and do not scroll -- #43 
  * Table heights can now be resized -- #43 
* Delete Node button -- #43 -- Nodes can be deleted.  Any edges can be remapped to a separate node.  This feature is only available on the server (localhost) machine.
* Graph is now more centered -- #43 
* Node Edit Lock -- #50 -- Any node that is being edited now locks the db to prevent other users from editing the node.  Other users will be notified that the node is locked if they try to edit it.
* Edge Edit Lock -- #60 -- Network db locking of edges.
* Vocabulary panel -- #57 
* Google Analytics -- #61 
* New templates -- #61 
* DB Unlock web console commands -- #63 -- Network db locking of nodes and edges can sometimes inadvertently leave nodes and edges in a locked state.  Added a web console command to unlock all, or nodes and edges separately.


### Fixes / Bugs

* Node and Edge IDs now better enforce integer type IDs. -- #51
* Many errors, weird conditions, and bugs stemming from network edit activity -- #46, #58, #62

---
# [1.0.1] -- Oct 2018 Study Day 2: Alexander<a name="1.0.1"></a>
Released 2018 Oct 2 -- *for the second day (Oct 3) of the October 1, 2018 study with Ptolemy's Alexander the Great*

### New Features:

* **Improved Template system** -- The template system can now define five aspects of the node and edge forms:

1. The form field *label*, e.g. "Notes" or "Signifcance"
2. The `type` *options* for both nodes and edges, e.g. "Person", 'Group", etc.
3. The *color* of the node type, e.g. red for "Person"
4. Whether the field should be shown or *hidden* on both the Node Panel and the Node Table and Edge Table views.
5. The *order* of the options fields are defined by the order they appear in the template.

* **Modified Fields** -- 
  * "Notes" has been renamed "Significance"
  * "Info" has been removed.
  * "Citation" has been moved ahead of "Significance"

### Bug Fixes:

* Group ID information has now been restored in the research logs.

---
# [1.0.0] -- Oct 2018 Study: Alexander<a name="1.0.0"></a>
Released 2018 Sep 30 -- *for the October 1, 2018 study with Ptolemy's Alexander the Great.*

### New Features:

* **Template system** -- Define and load node types and edge types and colors via a template `.json` file.

* **Swap Source and Target** -- Added a "Swap Source and Target" button to Edge Editor.

* **Change Source/Change Target** -- Added buttons to change the existing source or target nodes for Edge Editor.

* **Edge Weight** -- Edge line weight is now determined by the number of links between nodes.

* **Sessions** -- Administrators can now define group login tokens.  Research data logging is tagged by group id.  Graphs are read-only until you log in.

* **Deep State** -- Data is now stored in a centralized database on the server.  Network IDs are now unique.

### Future Features:

* **Node Edit Locking** -- Nodes are not yet locked out when someone is editing them.  If two people edit a node at the same time, their changes will clobber each other.

---
# [0.1.0] -- Proof of Concept Prototype<a name="0.1.0"></a>
Released 2018 Sep 30.
First major release of the tool for internal testing.

### Main Features:

* **Network Graph View** -- Network graph view rendered via D3 that supports zooming and panning.  Nodes may be selected directly by clicking.  Nodes may also be dragged to view relationships.

* **Search Field** -- Search for existing nodes by typing in a search field that will provide auto-complete suggestions.

* **Node Viewer** -- View and edit a single node's parameters along with all of the edges attached to the node.

* **Edge Viewer** -- View and edit edge data.  Edge views are collapsible to make it easier to see all of the edges attached to a node.

* **Node and Edge Tables** -- View all of the nodes and edges in the graph in a table list.  Nodes and edges can be selected for viewing and editing directly from the table.

* **Help** -- Rudimentary help button that shows simple help text.
