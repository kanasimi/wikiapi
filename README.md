[![npm version](https://badge.fury.io/js/wikiapi.svg)](https://www.npmjs.com/package/wikiapi)
[![npm downloads](https://img.shields.io/npm/dm/wikiapi.svg)](https://www.npmjs.com/package/wikiapi)
[![GitHub Actions workflow build status](https://github.com/kanasimi/wikiapi/actions/workflows/npm-test.yml/badge.svg)](https://github.com/kanasimi/wikiapi/actions)
[![codecov](https://codecov.io/gh/kanasimi/wikiapi/branch/master/graph/badge.svg)](https://codecov.io/gh/kanasimi/wikiapi)

[![Known Vulnerabilities](https://snyk.io/test/github/kanasimi/wikiapi/badge.svg?targetFile=package.json)](https://snyk.io/test/github/kanasimi/wikiapi?targetFile=package.json)
[![codebeat badge](https://codebeat.co/badges/47d3b442-fd49-4142-a69b-05171bf8fe36)](https://codebeat.co/projects/github-com-kanasimi-wikiapi-master)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/02aa4b9cc9df4fa9b10389abbb139ebf)](https://app.codacy.com/app/kanasimi/wikiapi?utm_source=github.com&utm_medium=referral&utm_content=kanasimi/wikiapi&utm_campaign=Badge_Grade_Dashboard)
[![DeepScan grade](https://deepscan.io/api/teams/4788/projects/6757/branches/58325/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=4788&pid=6757&bid=58325)

# JavaScript MediaWiki API
A simple way to access MediaWiki API via JavaScript with [wikitext parser](https://kanasimi.github.io/CeJS/_test%20suite/wikitext_parser.html).
This is basically a modern syntax version of [CeJS MediaWiki module](https://github.com/kanasimi/CeJS/blob/master/application/net/wiki). For example, using [async functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function).

## Features
*   Read / edit pages.
*   Get list of categorymembers, pages transclude specified template, and more...
*   Auto-limited editing rate.
*   Parse wikitext / pages. You may modify parts of the wikitext, then regenerate the page just using .toString(). See [wikitext parser examples](https://kanasimi.github.io/CeJS/_test%20suite/wikitext_parser.html).

## Installation
This is a nodejs module. Please install [node.js](https://nodejs.org/) first.

```bash
npm install wikiapi
```

## Usage
Here lists some examples of this module.
* [Login to wiki site](https://kanasimi.github.io/wikiapi/Wikiapi.html#login)
	* [Login to wiki site #1](https://kanasimi.github.io/wikiapi/Wikiapi.html#example__Login%20to%20wiki%20site%201)
	* [Login to wiki site #2](https://kanasimi.github.io/wikiapi/Wikiapi.html#example__Login%20to%20wiki%20site%202)
* [Get page data and parse the wikitext](https://kanasimi.github.io/wikiapi/Wikiapi.html#page)
* [Listen to page modification](https://kanasimi.github.io/wikiapi/Wikiapi.html#listen)
* [Edit page](https://kanasimi.github.io/wikiapi/Wikiapi.html#edit)
* [Edit multiple pages](https://kanasimi.github.io/wikiapi/Wikiapi.html#for_each_page)
* [Get category tree](https://kanasimi.github.io/wikiapi/Wikiapi.html#category_tree)
* [Get wikidata](https://kanasimi.github.io/wikiapi/Wikiapi.html#data)
* [Upload file / media](https://kanasimi.github.io/wikiapi/Wikiapi.html#upload)
	* [Upload file / media](https://kanasimi.github.io/wikiapi/Wikiapi.html#example__upload%20file%20/%20media)
* [Move page](https://kanasimi.github.io/wikiapi/Wikiapi.html#move_page)

### As node.js module
```javascript
// Load Wikiapi module 
const Wikiapi = require('wikiapi');

// OPEN ASYNC DOMAIN:
(async () => {

// LOGIN IN: In any wiki, any language
	const wiki = new Wikiapi('zh');		// or new Wikiapi('https://zh.wikipedia.org/w/api.php')
	await wiki.login('user', 'password');		// get your own account and password on your target wiki.

        
/* ***************************************************** */
/* READ ONLY ******************************************* */
// load page
	let page_data = await wiki.page('Universe', { });
	console.log('page_data: ',page_data);
	console.log('page_data.text: ',page_data.wikitext);

// Get multi revisions (ex: 2)
	let page_data = await wiki.page('Universe', { revisions: 2 });
	console.log('page_data: ',page_data);
	console.log('page_data.text: ',page_data.wikitext);

/* ***************************************************** */
/* EDITING ********************************************* */
/* Note: .page() then .edit() ************************** */
// Edit page: append content, as bot.
	let page_data = await wiki.page('Universe'),
		newContent = page_data.wikitext + '\nTest edit using wikiapi.';
	await enwiki.edit(
		function(page_data) { return newContent; },		// new content
		{bot: 1, summary: 'Test edit.'}			// options
	);

// Edit page: replace content, with more options.
	let page_data = await wiki.page('Universe'),
	newContent = page_data.wikitext.replace(/Test edit using wikiapi/g,'Test: replace content was successful!');
	await enwiki.edit(
		function(page_data) { return newContent; },  // new content
		{bot: 1, minor: 1, nocreate: 1, summary: 'Test: replace content.'} // more options
	);

// Edit page: wipe clean, replace by string
	let page_data = await wiki.page('Universe');
	await wiki.edit(
		'{{Speedy|reason=Vandalism}}', 
		{bot: 1, minor: 0, nocreate: 1, summary: 'Test: wipe clean, please delete.'}
	);

/* edit_page(): a more direct method ******************* */
// Edit page: 
	await wiki.edit_page('Wikipedia:Sandbox', function(page_data) {
		return page_data.wikitext+'\nTest edit using {{GitHub|kanasimi/wikiapi}}.';
	}, {bot: 1, nocreate: 1, minor: 1, summary: 'Test: edit page via .edit_page().'});


/* ***************************************************** */
/* PROVIDE MANY **************************************** */
// List of hand-picked target pages
	let list = ['Wikipedia:Sandbox', 'Wikipedia:Sandbox2', 'Wikipedia:Sandbox/wikiapi' ];
// List pages in [[Category:Chemical_elements]]
	let listMembers = await wiki.categorymembers('Chemical elements');  // array of titles
// List intra-wiki links in [[ABC]]
	let listLinks = await wiki.redirects_here('ABC');  // array of titles
// List of transcluded pages {{w:en:Periodic table}}
	let listTranscluded = await wiki.embeddedin('Template:Periodic table');
// List of searched pages with expression in its title name
	let listSearch = await wiki.search(' dragon');  // array of titles

/* ***************************************************** */
/* MULTI-read/edit ************************************* */
// Multi edit, members of category
	await wiki.for_each_page(
		listMembers, 
		page_data => { return `{{stub}}\n`+page_data.wikitext; }, 
		{ summary: 'Test: multi-edits', minor: 1 }
	);

// Multi read, following intra-wiki links
	await wiki.for_each_page(
		listLinks,			// array of targets
		page_data => { 
		console.log(page_data.title);		// print page title
		return Wikiapi.skip_edit;		// skip edit, just read, return nothing to edit with.
	}, // no edit therefore no options
	);


/* ***************************************************** */
/* MOVE PAGE (RENAME) ********************************** */
// Move page once.
	result = await wiki.move_page('Wikipedia:Sanbox/Wikiapi', 'Wikipedia:Sanbox/NewWikiapi', 
		{ reason: 'Test: move page (1).', noredirect: true, movetalk: true }
	);
// Reverse move
	result = await wiki.move_page('Wikipedia:Sanbox/NewWikiapi', 'Wikipedia:Sanbox/Wikiapi',
		{ reason: 'Test: move page (2).', noredirect: true, movetalk: true }
	);


/* ***************************************************** */
/* PARSE *********************************************** */
/* .parse() allows to ................ ***************** */	// <------------------- what is that parse for ?
/* See all type in wiki_toString @ github.com/kanasimi/CeJS/tree/master/application/net/wiki/parser.js	*/
// Read Infobox templates, convert to JSON.
	const page_data = await wiki.page('JavaScript');
	const parsed = page_data.parse();
	let infobox;
	parsed.each('template', template_token => {
		if (template_token.name.startsWith('Infobox')) {
			infobox = template_token.parameters;
			return parsed.each.exit;
		}
	});
	for (const [key, value] of Object.entries(infobox)){
		infobox[key] = value.toString();
	};
	console.log(infobox);  // print json of the infobox

// Edit page and parse
	const parsed = await wiki.page('Wikipedia:Sandbox').parse(); 
	parsed.each('template', template_token => {/* modify token */});
	await wiki.edit(parsed.toString(), {bot: 1, minor: 1, nocreate: 1});

	let page_data = await wiki.page('Universe');
	page_data.parse().each('template',
		token => console.log(token.name));
//  ^--- I really don't get those two. What do they do ? ----^  //

/* ***************************************************** */
/* MONITORING ****************************************** */
// Listen to new edits, check every 2 minutes
	wiki.listen(function for_each_row() { ... }, {
		delay: '2m',
		filter: function filter_row() { ... },
		// get diff
		with_diff: { LCS: true, line: true },
		namespace: '0|talk',			// <------------------- what is that
	});

/* ***************************************************** */
/* FILES *********************************************** */
// Set upload parameters, maily for licensing reasons.
// Note: parameter `text`, filled with the right wikicode `{{description|}}`, can replace most parameters.
	let options = {
		description: 'Photo of Osaka',
		date: new Date() || '2021-01-01',
		source_url: 'https://github.com/kanasimi/wikiapi',
		author: '[[User:user]]',
		permission: '{{cc-by-sa-2.5}}',
		other_versions: '',
		other_fields: '',
		license: ['{{cc-by-sa-2.5}}'],
		categories: ['[[Category:test images]]'],
		bot: 1,
		tags:"tag1|tag2",
	};

// Upload file from URL
	let result = await wiki.upload({
		file_path: '/local/file/path',
		filename: 'New_Osaka_Photograph.jpg',  // default : keep filename
		comment: '',
		ignorewarnings: 1,  // overwrite
		...options
	});

// Upload file from URL
	result = await wiki.upload({ 
		media_url: 'https://media.url/Thunder-Dragon.ogg',
		text: "Her eis wikicode to replave the page's content instead of various other parameters.",
		comment:'Thunder Dragon audio from vacation in Philipines. Page uses custom template.'
		ignorewarnings: 1,  // overwrite
		...options 
	});


/* ***************************************************** */
/* WIKIDATA, WIKIBASES ********************************* */
// Read Qid Q1 (Universe), print Chinese label
	const wiki = new Wikiapi('https://wikidata.org/w/api.php')
	let page_data = await wiki.data('Q1');
	console.log(page_data.labels.zh)		// '宇宙'

// Read, access by title (English), access property P1419
	let data = await wiki.data('Universe', 'P1419');
	console.assert(data.includes('shape of the universe'));  // data = ???

// update wikidata
	// Get https://test.wikidata.org/wiki/Q7
	let entity = await wiki.data('Q7');
	// search [ language, label ]
	//entity = await wiki.data(['en', 'Earth']);

	// Update claim
	await entity.modify({ claims: [{ P17: 'Q213280' }] });
	// Update claim: set country (P17) to 'Test Country 1' (Q213280) ([language, label] as entity)
	await entity.modify({ claims: [ { language: 'en', country: [, 'Test Country 1'] } ] });
	// Remove country (P17) : 'Test Country 1' (Q213280)
	await entity.modify({ claims: [ { language: 'en', country: [, 'Test Country 1'], remove: true } ] });

	// Update label
	await entity.modify({ labels: [ { language: 'zh-tw', value: '地球' } ] });

// CLOSE ASYNC DOMAIN:
})();
```

More examples: Please see [test.js](https://github.com/kanasimi/wikiapi/blob/master/_test%20suite/test.js).

## OS support
| Platform    | support |
| ----------- | ------- |
| Windows     | ✔️       |
| macOS       | ✔️       |
| UNIX, Linux | ✔️       |

## See also
For old style JavaScript, or general environment usage, please see [wikibot](https://github.com/kanasimi/wikibot).

## Contact
Contact us at [GitHub](https://github.com/kanasimi/wikiapi/issues).

[![logo](https://raw.githubusercontent.com/kanasimi/CeJS/master/_test%20suite/misc/logo.jpg)](http://lyrics.meicho.com.tw/)
