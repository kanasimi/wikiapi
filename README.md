[![npm version](https://badge.fury.io/js/wikiapi.svg)](https://www.npmjs.com/package/wikiapi)
[![npm downloads](https://img.shields.io/npm/dm/wikiapi.svg)](https://www.npmjs.com/package/wikiapi)
[![Known Vulnerabilities](https://snyk.io/test/github/kanasimi/wikiapi/badge.svg?targetFile=package.json)](https://snyk.io/test/github/kanasimi/wikiapi?targetFile=package.json)
[![codebeat badge](https://codebeat.co/badges/e1f640e9-afec-482b-83b0-5c684958ba05)](https://codebeat.co/projects/github-com-kanasimi-wikiapi-master)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/2d3464182d23463bb851f99cf06eaa28)](https://app.codacy.com/app/kanasimi/wikiapi?utm_source=github.com&utm_medium=referral&utm_content=kanasimi/wikiapi&utm_campaign=Badge_Grade_Settings)

# JavaScript MidiaWiki API
Simple way to assess MidiaWiki API via JavaScript with simple wikitext parser.

## usage 運行方式
Here lists the usage of this tool.

### As node.js module
``` JavaScript
const wikiapi = require('wikiapi');

(async () => {
	let wiki = new wikiapi;
	let page = await wiki.page('ABC');
	console.log(page.wikitext);
	
	let wiki = new wikiapi;
	await enwiki.login('user', 'password', 'en');
	page = await enwiki.page('ABC');
	page.parsed.each('template',
		token => console.log(token.title));
	
	await enwiki.page('WP:SB').edit(function(page_data) {
		return page_data.wikitext + 'Test edit using {{GitHub|kanasimi/wikiapi}}.';
	});
})();

```

## OS support
| Platform | support |
| --- | --- |
| Windows | ✔️ |
| macOS | ✔️ |
| UNIX, Linux | ✔️ |

## Contact 聯絡我們
Contact us at [GitHub](https://github.com/kanasimi/wikiapi/issues).

[![logo](https://raw.githubusercontent.com/kanasimi/CeJS/master/_test%20suite/misc/logo.jpg)](http://lyrics.meicho.com.tw/)
