[![npm version](https://badge.fury.io/js/wikiapi.svg)](https://www.npmjs.com/package/wikiapi)
[![npm downloads](https://img.shields.io/npm/dm/wikiapi.svg)](https://www.npmjs.com/package/wikiapi)
[![Build Status](https://travis-ci.org/kanasimi/wikiapi.svg?branch=master)](https://travis-ci.org/kanasimi/wikiapi)
[![codecov](https://codecov.io/gh/kanasimi/wikiapi/branch/master/graph/badge.svg)](https://codecov.io/gh/kanasimi/wikiapi)

[![Known Vulnerabilities](https://snyk.io/test/github/kanasimi/wikiapi/badge.svg?targetFile=package.json)](https://snyk.io/test/github/kanasimi/wikiapi?targetFile=package.json)
[![codebeat badge](https://codebeat.co/badges/47d3b442-fd49-4142-a69b-05171bf8fe36)](https://codebeat.co/projects/github-com-kanasimi-wikiapi-master)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/02aa4b9cc9df4fa9b10389abbb139ebf)](https://app.codacy.com/app/kanasimi/wikiapi?utm_source=github.com&utm_medium=referral&utm_content=kanasimi/wikiapi&utm_campaign=Badge_Grade_Dashboard)
[![DeepScan grade](https://deepscan.io/api/teams/4788/projects/6757/branches/58325/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=4788&pid=6757&bid=58325)

# JavaScript MediaWiki API
Simple way to access MediaWiki API via JavaScript with simple wikitext parser.

## Features 特點
*   read / edit pages
*   get list of categorymembers, pages transclude specified template, and more...
*   Auto-limited editing rate.

## Installation 安裝
Install [node.js](https://nodejs.org/) first.

``` sh
npm install wikiapi
```

## usage 運行方式
Here lists some examples of this module.

### As node.js module
``` JavaScript
// load module
const Wikiapi = require('wikiapi');

// load page
(async () => {
	let wiki = new Wikiapi;
	let page_data = await wiki.page('ABC');
	console.log(page_data.wikitext);
})();

// edit page
(async () => {
	let enwiki = new Wikiapi;
	await enwiki.login('bot name', 'password', 'en');
	let page_data = await enwiki.page('Wikipedia:Sandbox');
	await enwiki.edit(function(page_data) {
		return page_data.wikitext
			+ '\nTest edit using {{GitHub|kanasimi/wikiapi}}.';
	}, {bot: 1});
	console.log('Done.');
})();

// parse page (The parser is more powerful than the example. Try yourself!)
(async () => {
	let zhwiki = new Wikiapi('zh');
	await zhwiki.login('user', 'password');
	let page_data = await zhwiki.page('ABC');
	page_data.parse().each('template',
		token => console.log(token.name));
})();

// read wikidata
(async () => {
	let wiki = new Wikiapi;
	let page_data = await wiki.data('Q1');
	console.assert(CeL.wiki.data.value_of(page_data.labels.zh) === '宇宙');
})();

// read wikidata
(async () => {
	let wiki = new Wikiapi;
	let data = await wiki.data('Universe', 'P1419');
	console.assert(data.includes('shape of the universe'));
})();

// get list of [[w:en:Category:Chemical_elements]]
(async () => {
	let wiki = new Wikiapi;
	let list = await wiki.categorymembers('Chemical elements');
	console.log(list);
})();

// get pages transclude {{w:en:Periodic table}}
(async () => {
	let wiki = new Wikiapi;
	let list = await wiki.embeddedin('Template:Periodic table');
	console.log(list);
})();

```

More examples: Please see [test.js](https://github.com/kanasimi/wikiapi/blob/master/_test%20suite/test.js).

## OS support 作業系統支援
| Platform    | support |
| ----------- | ------- |
| Windows     | ✔️      |
| macOS       | ✔️      |
| UNIX, Linux | ✔️      |

## See also
[wikibot](https://github.com/kanasimi/wikibot)

## Contact 聯絡我們
Contact us at [GitHub](https://github.com/kanasimi/wikiapi/issues).

[![logo](https://raw.githubusercontent.com/kanasimi/CeJS/master/_test%20suite/misc/logo.jpg)](http://lyrics.meicho.com.tw/)
