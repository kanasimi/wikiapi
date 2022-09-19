﻿/**
 * @name Wikiapi.js
 * 
 * @fileoverview Main codes of module wikiapi (class Wikiapi)
 */

'use strict';

/**
 * @description CeJS controller
 * 
 * @type Function
 * @inner
 * 
 * @see https://github.com/kanasimi/CeJS
 */
let CeL;

try {
	// Load CeJS library.
	CeL = require('cejs');
	if (typeof CeL.then === 'function' && typeof window === "object" && window.CeL) {
		// assert: @Snowpack
		CeL = window.CeL;
	}

} catch (e) /* istanbul ignore next: Only for debugging locally */ {
	// https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md
	// const Wikiapi = require('./wikiapi.js');
	require('./_CeL.loader.nodejs.js');
	CeL = globalThis.CeL;
}
// assert: typeof CeL === 'function'

// Load modules.
// @see `wiki loader.js`:
// https://github.com/kanasimi/wikibot/blob/master/wiki%20loader.js
CeL.run(['interact.DOM', 'application.debug',
	// 載入不同地區語言的功能 for wiki.work()。
	'application.locale',
	// 載入操作維基百科的主要功能。
	'application.net.wiki',
	// Optional 可選功能
	'application.net.wiki.data', 'application.net.wiki.admin',
	// Add color to console messages. 添加主控端報告的顏色。
	'interact.console',
	// for 'application.platform.nodejs': CeL.env.arg_hash, wiki_API.cache(),
	// CeL.fs_mkdir(), wiki_API.read_dump()
	'application.storage']);

// --------------------------------------------------------

/**
 * @description syntactic sugar for CeJS MediaWiki module. CeL.net.wiki === CeL.wiki
 * 
 * @inner
 */
const wiki_API = CeL.net.wiki;
/**
 * key to get {@link wiki_API} operator when using {@link wiki_API}.
 * 
 * @type Symbol
 * 
 * @inner
 */
const KEY_SESSION = wiki_API.KEY_SESSION;

// Set default language. 改變預設之語言。
wiki_API.set_language('en');

/**
 * @description key to get {@link wiki_API} operator inside {@link Wikiapi}.
 * <code>this[KEY_wiki_session]</code> inside module code will get {@link wiki_API} operator.
 * 
 * @type Symbol
 * 
 * @inner
 */
const KEY_wiki_session = Symbol('wiki_API session');
// for debug
// Wikiapi.KEY_wiki_session = KEY_wiki_session;

/**
 * @description main Wikiapi operator 操作子.
 * 
 * @param {String|Object} [API_URL]	- language code or service endpoint of MediaWiki project.<br />
 *            Input {Object} will be treat as options.
 * 
 * @class
 */
function Wikiapi(API_URL) {
	const wiki_session = new wiki_API(null, null, API_URL);
	// this[KEY_wiki_session] = new wiki_API(null, null, API_URL);
	setup_wiki_session.call(this, wiki_session);
}

// --------------------------------------------------------

/**
 * @description Bind {@link wiki_API} instance to {@link Wikiapi} instance
 * 
 * @param {wiki_API} wiki_session	- wiki_API session
 * 
 * @inner
 */
function setup_wiki_session(wiki_session) {
	Object.defineProperty(this, KEY_wiki_session, {
		value: wiki_session,
		writable: true,
	});
}

/**
 * @alias login
 * @description login into the target MediaWiki API using the provided username and password.
 * For bots, see [[Special:BotPasswords]] on your wiki.
 * 
 * @param {String} user_name	- Account username.
 * @param {String} password		- Account's password.
 * @param {String} [API_URL]	- API URL of target wiki site.
 *
 * @returns {Promise} Promise object represents {String} login_name
 *
 * @example <caption><span id="example__Login to wiki site 1">Login to wiki site method 1.</span></caption>
// <code>
const wiki = new Wikiapi;
const login_options = {
	user_name: '', password: '', API_URL: 'en',
	// Ror lingualibre only. @see https://github.com/kanasimi/wikibot/blob/master/wiki%20configuration.sample.js
	//data_API_URL: 'https://lingualibre.org/api.php',
	//SPARQL_API_URL: 'https://lingualibre.org/bigdata/namespace/wdq/sparql',
	// Calling in another domain
	origin: '*'
};
await wiki.login(login_options);
// </code>
 *
 * @example <caption><span id="example__Login to wiki site 2">Login to wiki site method 2.</span></caption>
// <code>
const wiki = new Wikiapi;
await wiki.login('user_name', 'password', 'en');
// </code>
 *
 * @memberof Wikiapi.prototype
 */
function Wikiapi_login(user_name, password, API_URL) {
	let options;
	if (!password && !API_URL && CeL.is_Object(user_name)) {
		options = user_name;
	} else if (CeL.is_Object(API_URL)) {
		options = { ...API_URL, user_name, password };
	} else {
		options = { user_name, password, API_URL };
	}

	function Wikiapi_login_executor(resolve, reject) {
		const wiki_session = wiki_API.login({
			preserve_password: true,
			...options,

			API_URL: options.API_URL || this[KEY_wiki_session].API_URL,
			callback(login_name, error) {
				if (error) {
					reject(error);
				} else {
					resolve(login_name);
				}
			},
			// task_configuration_page: 'page title',
		});
		setup_wiki_session.call(this, wiki_session);
	}

	return new Promise(Wikiapi_login_executor.bind(this));
}

// --------------------------------------------------------

/**
 * @description attributes of {Object} page_data, will setup by {@link set_page_data_attributes}.
 * 
 * @type Object
 * 
 * @inner
 */
const page_data_attributes = {
	/**
	 * @description get {String}page content, maybe undefined.
	 * 條目/頁面內容 = wiki_API.revision_content(revision)
	 *
	 * @type String
	 */
	wikitext: {
		get() {
			// console.trace(this);
			// console.log(wiki_API.content_of(this, 0));
			return wiki_API.content_of(this, 0);
		}
	},
	/**
	 * @description get {Object}revisions
	 *
	 * @type Object
	 */
	revision: {
		value: function revision(revision_NO) {
			return wiki_API.content_of(this, revision_NO);
		}
	},
	/**
	 * @description get {Attay} parsed data of page_data
	 *
	 * @type Array
	 */
	parse: {
		value: function parse(options) {
			// this === page_data

			// options = { ...options, [KEY_SESSION]: this[KEY_wiki_session] };
			options = Wikiapi.prototype.append_session_to_options.call(this, options);

			// using function parse_page(options) @ wiki_API
			return wiki_API.parser(this, options).parse();
			// return {Array}parsed
		}
	},
};

/**
 * @description Bind {@link page_data_attributes} to <code>page_data</code>
 * 
 * @param {Object} page_data	- page data
 * @param {wiki_API} wiki		- wiki_API session
 * 
 * @returns {Promise} Promise object represents {Object} page's data
 * 
 * @inner
 */
function set_page_data_attributes(page_data, wiki) {
	// `page_data` maybe non-object when error occurres.
	if (page_data) {
		page_data[KEY_wiki_session] = wiki;
		Object.defineProperties(page_data, page_data_attributes);
	}
	return page_data;
}

/**
 * @alias page
 * @description given a title, returns the page's data.
 * 
 * @param {String} title		- page title
 * @param {Object} [options]	- options to run this function
 *
 * @returns {Promise} Promise object represents {Object} page's data
 *
 * @example <caption>load page</caption>
// <code>
// on Wikipedia...
const wiki = new Wikiapi('en');
// ...or other MediaWiki websites
//const wiki = new Wikiapi('https://awoiaf.westeros.org/api.php');
let page_data = await wiki.page('Universe', {
	// You may also set rvprop.
	//rvprop: 'ids|content|timestamp|user',
});
console.log(page_data.wikitext);
// </code>
 *
 * @example <caption>Get multi revisions</caption>
// <code>
const wiki = new Wikiapi;
let page_data = await wiki.page('Universe', {
	// Get multi revisions
	revisions: 2
});
console.log(page_data.wikitext);
// </code>
 *
 * @example <caption>parse wiki page (The parser is more powerful than the example. Please refer to link of wikitext parser examples showing in "Features" section of README.md.)</caption>
// <code>
// Usage with other language
const zhwiki = new Wikiapi('zh');
await zhwiki.login('user', 'password');
let page_data = await zhwiki.page('Universe');

// `page_data.parse(options)` will startup the parser process, create page_data.parsed. After .parse(), we can use parsed.each().
const parsed = page_data.parse();

// See all type in wiki_toString @ https://github.com/kanasimi/CeJS/tree/master/application/net/wiki/parser/wikitext.js
// List all template name.
parsed.each('template', token => console.log(token.name));
// List all [[Template:Tl]] token.
parsed.each('Template:Tl', token => console.log(token));
// </code>
 *
 * @example <caption>Get information from Infobox template</caption>
// <code>
const wiki = new Wikiapi('en');
const page_data = await wiki.page('JavaScript');
const parsed = page_data.parse();
let infobox;
// Read Infobox templates, convert to JSON.
parsed.each('template', template_token => {
	if (template_token.name.startsWith('Infobox')) {
		infobox = template_token.parameters;
		return parsed.each.exit;
	}
});
for (const [key, value] of Object.entries(infobox))
	infobox[key] = value.toString();
// print json of the infobox
console.log(infobox);
// </code>
 *
 * @memberof Wikiapi.prototype
 */
function Wikiapi_page(title, options) {
	function Wikiapi_page_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		wiki.page(title, (page_data, error) => {
			if (error) {
				reject(error);
			} else {
				resolve(set_page_data_attributes(page_data, wiki));
			}
		}, {
			// node.js v12.22.7: Cannot use "?."
			rvlimit: options && options.revisions,
			...options
		});
	}

	return new Promise(Wikiapi_page_executor.bind(this));
}

// --------------------------------------------------------

/**
 * @alias tracking_revisions
 * @description tracking revisions to lookup what revision had added / removed <code>to_search</code>.
 * 
 * @param {String} title		- page title
 * @param {String} to_search	- filter / text to search. to_search(diff, revision, old_revision): `diff` 為從舊的版本 `old_revision` 改成 `revision` 時的差異。
 * @param {Object} [options]	- options to run this function
 * 
 * @returns {Promise} Promise object represents {Object} newer_revision,
 *          newer_revision.page: page_data
 * 
 * @memberof Wikiapi.prototype
 */
function Wikiapi_tracking_revisions(title, to_search, options) {
	function Wikiapi_tracking_revisions_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		wiki.tracking_revisions(title, to_search, (revision, page_data, error) => {
			if (error) {
				reject(error);
			} else {
				if (!revision)
					revision = Object.create(null);
				revision.page = page_data;
				resolve(revision);
			}
		}, options);
	}

	return new Promise(Wikiapi_tracking_revisions_executor.bind(this));
}

// --------------------------------------------------------

/**
 * @description Handle the result of MediaWiki API when executing edit operation.
 * 
 * @param {Function} reject	- reject function
 * @param {any} error		- error object / message
 * @param {any} [result]	- result of MediaWiki API
 *
 * @returns {Boolean} Return <code>true</code> if the edit operation failed.
 * 
 * @inner
 */
function reject_edit_error(reject, error, result) {
	// skip_edit is not error
	if (!error
		// @see wiki_API_edit.check_data
		|| Array.isArray(error) && error[0] === Wikiapi.skip_edit[0]) {
		return;
	}

	if (Array.isArray(error) && typeof error[1] === 'string') {
		// console.log('' + reject);
		// console.trace(error);
		error = error[1];
		const error_object = new Error(error);
		error_object.from_string = error;
		error = error_object
		// console.log(error);
	}

	if (result && typeof error === 'object')
		error.result = result;
	reject(error);
	return true;
}

/**
 * @alias edit_page
 * @description edits content of target page.<br />
 * Note: for multiple pages, you should use {@link Wikiapi#for_each_page}.<br />
 * Note: The function will check sections of [[User talk:user name/Stop]] if somebody tells us needed to stop edit. See <a href="https://zh.wikipedia.org/wiki/User:Cewbot/Stop">mechanism to stop operations</a>.
 * 
 * @param {String} title			- page title
 * @param {String|Function} content	- 'wikitext page content' || page_data => 'wikitext'
 * @param {Object} [options]		- options to run this function. e.g., { summary: '', bot: 1, nocreate: 1, minor: 1 }
 * 
 * @returns {Promise} Promise object represents {Object} result of MediaWiki API
 *
 * @example <caption>edit page: method 1: basic operation</caption>
// <code>
const enwiki = new Wikiapi;
await enwiki.login('bot name', 'password', 'en');

const SB_page_data = await enwiki.page('Wikipedia:Sandbox');
// You may do some operations on SB_page_data
const parsed = SB_page_data.parse();
parsed.each('template', template_token => {
	// modify template token
});
// and then edit it. ** You MUST call enwiki.page() before enwiki.edit()! **
await enwiki.edit(parsed.toString(), { bot: 1, minor: 1, nocreate: 1 });

// exmaple 2: append text in the tail of page content
await enwiki.edit(page_data => {
	return page_data.wikitext
		+ '\nTest edit using {{GitHub|kanasimi/wikiapi}}.';
}, { bot: 1 });

// exmaple 3: replace page content
await enwiki.edit('Just replace by this wikitext', { bot: 1, minor: 1, nocreate: 1, summary: 'test edit' });

// exmaple 4: append a new section
await enwiki.edit('section content', {
	section: 'new',
	sectiontitle: 'section title',
	nocreate : 1,
	summary: 'test edit',
});
// </code>
 *
 * @example <caption>edit page: method 2: modufy summary inside function</caption>
// <code>
const enwiki = new Wikiapi;
await enwiki.login('bot name', 'password', 'en');
await enwiki.edit_page('Wikipedia:Sandbox', function (page_data) {
	this.summary += ': You may set additional summary inside the function';
	delete this.minor;
	return page_data.wikitext
		+ '\nTest edit using {{GitHub|kanasimi/wikiapi}}.';
}, { bot: 1, nocreate: 1, minor: 1, redirects: 1, summary: 'test edit' });
// </code>
 *
 * @memberof Wikiapi.prototype
 */
function Wikiapi_edit_page(title, content, options) {
	function Wikiapi_edit_page_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];

		// console.trace([title, content]);
		// console.trace(`Wikiapi_edit_page 1: ${wiki_API.title_link_of(title)}, ${wiki.actions.length} actions, ${wiki.running}/${wiki.thread_count}/${wiki.actions[wiki_API.KEY_waiting_callback_result_relying_on_this]}.`);
		// console.trace(title);
		// CeL.set_debug(6);
		if (title) {
			// console.trace(wiki);
			options = { ...options, error_with_symbol: true };
			// 預防 page 本身是非法的頁面標題。當 session.page() 出錯時，將導致沒有 .last_page。
			if (wiki_API.is_page_data(title))
				options.task_page_data = title;
			// call wiki_API_prototype_method() @ CeL.application.net.wiki.list
			wiki.page(title, (page_data, error) => {
				// console.trace('Set .page_to_edit:');
				// console.log([title, page_data, error]);
				// console.log(wiki.actions[0]);

				// 手動指定要編輯的頁面。避免多執行續打亂 wiki.last_page。
				options.page_to_edit = page_data;
			}, options);
		}
		// console.trace(`Wikiapi_edit_page 2: ${wiki_API.title_link_of(title)}, ${wiki.actions.length} actions, ${wiki.running}/${wiki.thread_count}/${wiki.actions[wiki_API.KEY_waiting_callback_result_relying_on_this]}.`);
		// console.trace(wiki);
		// console.trace(wiki.last_page);

		// wiki.edit(page contents, options, callback)
		wiki.edit(typeof content === 'function' ? function (page_data) {
			return content.call(this, set_page_data_attributes(page_data, wiki));
		} : content, options, (title, error, result) => {
			// console.trace('Wikiapi_edit_page: callbacked');
			// console.log(title);
			// console.log(wiki.running);
			// CeL.set_debug(6);

			if (!reject_edit_error(reject, error, result)) {
				// console.log('Wikiapi_edit_page: resolve');
				resolve(title);
			}
			// console.log('Wikiapi_edit_page: callback() return');
		});

		// console.trace(`Wikiapi_edit_page 3: ${wiki_API.title_link_of(title)}, ${wiki.actions.length} actions, ${wiki.running}/${wiki.thread_count}/${wiki.actions[wiki_API.KEY_waiting_callback_result_relying_on_this]}.`);
	}

	return new Promise(Wikiapi_edit_page_executor.bind(this));
}

// <code>return Wikiapi.skip_edit;</code> as a symbol to skip this edit, do not generate
// warning message.
// 可以利用 ((return [ wiki_API.edit.cancel, 'reason' ];)) 來回傳 reason。
// ((return [ wiki_API.edit.cancel, 'skip' ];)) 來跳過 (skip) 本次編輯動作，不特別顯示或處理。
// 被 skip/pass 的話，連警告都不顯現，當作正常狀況。
/**
 * @description Return <code>Wikiapi.skip_edit</code> when we running edit function, but do not want to edit current page.
 * 
 * @memberof Wikiapi
 */
Wikiapi.skip_edit = [wiki_API.edit.cancel, 'skip'];

// --------------------------------------------------------

/**
 * @alias move_page
 * @description Move page <code>move_from_title</code> to <code>move_to_title</code>.
 *
 * @param {Object|String} move_from_title	- move from title
 * @param {Object|String} move_to_title		- move to title
 * @param {Object} [options]				- options to run this function
 *
 * @returns {Promise} Promise object represents {String} result of MediaWiki API
 *
 * @example <caption>Move <code>move_from_title</code> to <code>move_to_title</code>.</caption>
// <code>
await wiki.move_page(move_from_title, move_to_title, { reason, noredirect: true, movetalk: true });
// </code>
 *
 * @memberof Wikiapi.prototype
 */
function Wikiapi_move_page(move_from_title, move_to_title, options) {
	function Wikiapi_move_page_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		// using wiki_API.prototype.move_page()
		wiki.move_page(move_from_title, move_to_title, options, (data, error) => {
			if (error) {
				/**
				 * <code>

				e.g., { code: 'articleexists', info: 'A page of that name already exists, or the name you have chosen is not valid. Please choose another name.', '*': '...' }
				e.g., { code: 'missingtitle', info: "The page you specified doesn't exist.", '*': '...' }

				</code>
				 */
				reject(error);
			} else {
				/**
				 * <code>

				e.g., { from: 'from', to: 'to', reason: 'move', redirectcreated: '', moveoverredirect: '' }

				</code>
				 */
				resolve(data);
			}
		}, options);
	}

	return new Promise(Wikiapi_move_page_executor.bind(this));

}

/**
 * @alias move_to
 * @description Move to <code>move_to_title</code>. <em>Must call {@link Wikiapi#page} first!</em>
 * 
 * @param {Object|String} move_to_title	- move to title
 * @param {Object} [options]			- options to run this function
 *
 * @returns {Promise} Promise object represents {String} result of MediaWiki API
 *
 * @example <caption>Move <code>move_from_title</code> to <code>move_to_title</code>.</caption>
// <code>
page_data = await wiki.page(move_from_title);
await wiki.move_to(move_to_title, { reason: reason, noredirect: true, movetalk: true });
// </code>
 * 
 * @memberof Wikiapi.prototype
 */
function Wikiapi_move_to(move_to_title, options) {
	function Wikiapi_move_to_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		if (!wiki.last_page) {
			reject(new Error(Wikiapi_move_to.name + ': Must call .page() first! '
				// gettext_config:{"id":"cannot-move-to-$1"}
				+ CeL.gettext('Cannot move to %1', wiki_API.title_link_of(move_to_title))));
			return;
		}

		// using wiki_API.prototype.move_to()
		wiki.move_to(move_to_title, options, (data, error) => {
			if (error) {
				/**
				 * <code>

				e.g., { code: 'articleexists', info: 'A page of that name already exists, or the name you have chosen is not valid. Please choose another name.', '*': '...' }
				e.g., { code: 'missingtitle', info: "The page you specified doesn't exist.", '*': '...' }

				</code>
				 */
				reject(error);
			} else {
				/**
				 * <code>

				e.g., { from: 'from', to: 'to', reason: 'move', redirectcreated: '', moveoverredirect: '' }

				</code>
				 */
				resolve(data);
			}
		}, options);
	}

	return new Promise(Wikiapi_move_to_executor.bind(this));
}


// --------------------------------------------------------

/**
 * @alias query
 * @description query MediaWiki API manually
 * 
 * @param {Object} parameters	- parameters to call MediaWiki API
 * @param {Object} [options]	- options to run this function
 *
 * @returns {Promise} Promise object represents {Object} result of MediaWiki API
 *
 * @example <caption>query flow-parsoid-utils</caption>
// <code>
const wiki = new Wikiapi('mediawiki');
const results = await wiki.query({
	action: "flow-parsoid-utils",
	content: "<b>bold</b> &amp; <i>italic</i>",
	title: "MediaWiki", from: "html", to: "wikitext"
});
// </code>
 * 
 * @memberof Wikiapi.prototype
 */
function Wikiapi_query(parameters, options) {
	function Wikiapi_query_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		wiki.query_API(parameters, (data, error) => {
			if (error) {
				reject(error);
			} else {
				resolve(data);
			}
		}, {
			post_data_only: true,
			...options
		});
	}

	return new Promise(Wikiapi_query_executor.bind(this));
}

// --------------------------------------------------------

/**
 * @alias purge
 * @description Purge the cache for the given title.
 * 
 * @param {Object} title		- page title
 * @param {Object} [options]	- options to run this function
 *
 * @returns {Promise} Promise object represents {Object} page_data
 *
 * @example <caption>query flow-parsoid-utils</caption>
// <code>
const metawiki = new Wikiapi('meta');
let page_data = await metawiki.purge('Project:Sandbox');
// </code>
 * 
 * @memberof Wikiapi.prototype
 */
function Wikiapi_purge(title, options) {
	if (CeL.is_Object(title) && !options) {
		// shift arguments.
		[title, options] = [null, title];
	}

	function Wikiapi_purge_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		if (title) {
			wiki.page(title);
		}
		// using wiki_API.purge
		wiki.purge((data, error) => {
			if (error) {
				reject(error);
			} else {
				resolve(data);
			}
		}, options);
	}

	return new Promise(Wikiapi_purge_executor.bind(this));
}

// --------------------------------------------------------

/**
 * @description Bind properties to {@link wiki_API} data entity.
 * 設定 wikidata entity object，讓我們能直接操作 entity.modify()，並且避免洩露 wiki_API session。
 * 
 * @param {Object} data_entity	- wiki_API data entity
 * 
 * @inner
 */
function setup_data_entity(data_entity) {
	if (!data_entity)
		return;
	// assert: data_entity[KEY_SESSION].host === this
	// console.trace(data_entity[KEY_SESSION].host === this);
	delete data_entity[KEY_SESSION];

	Object.defineProperties(data_entity, {
		[KEY_wiki_session]: { value: this },
		modify: { value: modify_data_entity },
	});
}

/**
 * @description Modify data entity
 * 
 * @param {Object} data_entity	- wiki_API data entity
 * @param {Object} [options]	- options to run this function
 * 
 * @returns {Promise} Promise object represents {Object} result data entity
 * 
 * @inner
 */
function modify_data_entity(data_to_modify, options) {
	function modify_data_entity_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		// console.trace(wiki);

		// using function wikidata_edit() @
		// https://github.com/kanasimi/CeJS/blob/master/application/net/wiki/data.js
		// wiki.edit_data(id, data, options, callback)
		wiki.data(this).edit_data(data_to_modify || this, options, (data_entity, error) => {
			// console.trace([data_entity, error]);
			if (error) {
				reject(error);
			} else {
				setup_data_entity.call(wiki, data_entity);
				resolve(data_entity);
			}
		});
	}

	return new Promise(modify_data_entity_executor.bind(this));
}

/**
 * @alias data
 * @description Get wikidata entity / property
 *
 * @param {Object} data_entity	- wiki_API data entity
 * @param {Object} [options]	- options to run this function
 *
 * @returns {Promise} Promise object represents {Object} wikidata entity / property
 *
 * @example <caption>Get wikidata entity method 1</caption>
// <code>
const wiki = new Wikiapi;
const data_entity = await wiki.data('Q1');
// Work with other language
console.assert(CeL.wiki.data.value_of(data_entity.labels.zh) === '宇宙');
// </code>
 *
 * @example <caption>Get wikidata entity of [[Human]]</caption>
// <code>
const wiki = new Wikiapi;
const page_data = await wiki.page('Human');
const data_entity = await wiki.data(page_data);
console.assert(CeL.wiki.data.value_of(data_entity.labels.zh) === '人類');
// </code>
 *
 * @example <caption>Get wikidata entity method 2: Get P1419 of wikidata entity: 'Universe'</caption>
// <code>
const wiki = new Wikiapi;
// Read, access by title (English), access property P1419
let data = await wiki.data('Universe', 'P1419');
// assert: {Array}data = [ 'shape of the universe', '', ... ]
console.assert(data.includes('shape of the universe'));
// </code>
 *
 * @example <caption>update wikidata</caption>
// <code>
// Just for test
delete CeL.wiki.query.default_maxlag;
const wiki = new Wikiapi;
await wiki.login('user', 'password', 'test');

// Get https://test.wikidata.org/wiki/Q7
let entity = await wiki.data('Q7');
// search [ language, label ]
//entity = await wiki.data(['en', 'Earth']);

// Reset claim
entity = await wiki.data('Q1841');
await entity.modify({ claims: [{ P3: "old.wav", remove: true }] }, { bot: 1, summary: 'test edit: Remove specific value' });
// Warning: If you want to perform multiple operations on the same property, you need to get the entity again!
entity = await wiki.data('Q1841');
await entity.modify({ claims: [{ P3: "new.wav" }] }, { bot: 1, summary: 'test edit: Add value' });

// Update claim
await entity.modify({ claims: [{ P17: 'Q213280' }] }, { bot: 1, summary: 'test edit: Update claim' });

// Update claim: set country (P17) to 'Test Country 1' (Q213280) ([language, label] as entity)
await entity.modify({ claims: [{ language: 'en', country: [, 'Test Country 1'] }] }, { summary: '' });

// Remove country (P17) : 'Test Country 1' (Q213280)
await entity.modify({ claims: [{ language: 'en', country: [, 'Test Country 1'], remove: true }] }, { summary: '' });

// Update label
await entity.modify({ labels: [{ language: 'zh-tw', value: '地球' }] }, { summary: '' });
// </code>
 *
 * @memberof Wikiapi.prototype
 */
function Wikiapi_data(key, property, options) {
	if (CeL.is_Object(property) && !options) {
		// shift arguments.
		[property, options] = [null, property];
	}

	function Wikiapi_data_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		if (false && wiki_API.is_page_data(key)) {
			// get entity (wikidata item) of page_data: key
			// .page(key): 僅僅設定 .last_page，不會真的再獲取一次頁面內容。
			wiki.page(key);
		}
		if (key.title && !key.site) {
			// @see function wikidata_entity() @ CeL.application.net.wiki.data
			// 確保引用到的是本 wiki session，不會引用到其他 site。
			key = { ...key, site: this.site_name() };
		}
		// using wikidata_entity() → wikidata_datavalue()
		wiki.data(key, property, (data_entity, error) => {
			if (error) {
				reject(error);
			} else {
				setup_data_entity.call(wiki, data_entity);
				resolve(data_entity);
			}
		}, options);
	}

	return new Promise(Wikiapi_data_executor.bind(this));
}


/**
 * @alias new_data_entity
 * @description Create new entity or property
 *
 * @param {Object} data_to_modify	- Initial data.
 * @param {Object} [options]		- options to run this function
 *
 * @returns {Promise} Promise object represents {Object} new entity or property.
 *
 * @example <caption>Create new entity</caption>
// <code>
const new_entity = await wiki.new_data_entity({ labels: { en: "Evolution in Mendelian Populations" }, P698: "17246615", P932: "1201091" }, { new: 'item' });
// </code>
 *
 * @memberof Wikiapi.prototype
 */
function Wikiapi_new_data_entity(data_to_modify, options) {
	function Wikiapi_new_data_entity_executor(resolve, reject) {
		options = { new: 'item', ...options };
		const wiki = this[KEY_wiki_session];
		wiki.edit_data({}, options, (data_entity, error) => {
			if (error) {
				reject(error);
			} else if (data_to_modify) {
				delete options.new;
				//console.trace([data_entity, options]);
				wiki.edit_data(data_entity, data_to_modify, options, (result, error) => {
					if (error) {
						reject(error);
					} else if (false && options.retrieve_entity) {
						// reget modified data
						this.data(data_entity.id, options).then(resolve, reject);
					} else {
						//console.trace([data_entity, result]);
						//data_entity.latest_result = result;
						// data_entity: e.g.,
						// {"type":"item","id":"Q123456","labels":{},"descriptions":{},"aliases":{},"claims":{},"sitelinks":{},"lastrevid":123456}
						resolve(data_entity);
					}
				});
			} else {
				setup_data_entity.call(wiki, data_entity);
				resolve(data_entity);
			}
		});
	}

	return new Promise(Wikiapi_new_data_entity_executor.bind(this));
}

// --------------------------------------------------------

/**
 * @alias SPARQL
 * @description Query wikidata via SPARQL
 *
 * @param {Object} SPARQL		- SPARQL to query. Please test it on <a href="https://query.wikidata.org/">Wikidata Query Service</a> first.
 * @param {Object} [options]	- options to run this function
 *
 * @returns {Promise} Promise object represents {Array} query result of `SPARQL`.
 *
 * @example <caption>Get cats</caption>
// <code>
const wikidata_item_list = await wiki.SPARQL(`
SELECT ?item ?itemLabel WHERE {
  ?item wdt:P31 wd:Q146.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
}
`);
// </code>
 *
 * @example <caption>Get specific DOI</caption>
// <code>
// for case-insensitive DOI
const wikidata_item_list = await wiki.search('haswbstatement:' + JSON.stringify('P356=10.1371/journal.pone.0029797'), { namespace: 0 });
//wikidata_item_list.map(item => item.title)

// for case-sensitive DOI
const wikidata_item_list = await wiki.SPARQL(`
SELECT ?doi ?item ?itemLabel WHERE {
	VALUES ?doi { "10.1371/JOURNAL.PONE.0029797" }
	?item wdt:P356 ?doi.
	SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`, {
	// options.API_URL: custom SPARQL endpoint
	API_URL: ''
});
//wikidata_item_list.id_list()
// </code>
 *
 * @memberof Wikiapi.prototype
 */
function Wikiapi_SPARQL(SPARQL, options) {
	function Wikiapi_SPARQL_executor(resolve, reject) {
		wiki_API.SPARQL(SPARQL, (result, error) => {
			if (error) {
				reject(error);
			} else {
				resolve(result);
			}
		}, this.append_session_to_options(options));
	}

	return new Promise(Wikiapi_SPARQL_executor.bind(this));
}


// --------------------------------------------------------

/**
 *
 * @example <caption>get list of [[w:en:Category:Chemical_elements]]</caption>
// <code>
const wiki = new Wikiapi;
let list = await wiki.categorymembers('Chemical elements');
console.log(list);
// Working on multiple pages
await wiki.for_each_page(
	// {Array} title liat / page data list
	list,
	page_data => {
		// ...
	});
// </code>
 *
 * @example <caption>get pages transcluding {{w:en:Periodic table}}</caption>
// <code>
const wiki = new Wikiapi;
let list = await wiki.embeddedin('Template:Periodic table');
console.log(list);
// </code>
 */

// Warning: Won't throw if title is not existed!
// @inner
function Wikiapi_list(list_type, title, options) {
	function Wikiapi_list_executor(resolve, reject) {
		options = CeL.setup_options(options);
		// const wiki = this[KEY_wiki_session];
		wiki_API.list(title, (list/* , target, options */) => {
			// console.trace(list);
			if (list.error) {
				reject(list.error);
			} else {
				resolve(list);
			}
		}, this.append_session_to_options({
			type: list_type,
			// namespace: '0|1',
			...options
		}));

		/**
		 * <code>

		// method 2: 使用循環取得資料版:
		wiki.cache({
			// Do not write cache file to disk.
			cache: false,
			type: list_type,
			list: title
		}, (list, error) => {
			if (error) {
				reject(error);
			} else {
				resolve(list);
			}
		},
			// default options === this
			//{ namespace : '0|1' }
			options);

		// NG: 不應使用單次版
		wiki[list_type](title, (list, error) => {
			if (error) {
				reject(error);
			} else {
				resolve(list);
			}
		}, {
				limit: 'max', ...options
			});

		</code>
		 */
	}

	return new Promise(Wikiapi_list_executor.bind(this));
}

// functions for several kinds of lists
function Wikiapi_for_each(type, title, for_each, options) {
	return Wikiapi_list.call(this, type, title, {
		for_each,
		...options
	});
}

// --------------------------------------------------------

/**
 * @alias category_tree
 * @description Get structural category tree with sub-categories of <code>root_category</code>. This is powerful than categorymembers. Get sub-categories with {@link Wikiapi.KEY_subcategories}.
 *
 * @param {String} root_category	- category name
 * @param {Object} [options]		- options to run this function.
 *
 * @returns {Promise} Promise object represents {Array} category_tree.
 *
 * @example <caption>Checking if [[Category:Countries in North America]] including [[Mexico]].</caption>
// <code>
const enwiki = new Wikiapi('en');
const page_list = await enwiki.category_tree('Countries in North America', 1);
assert(page_list.some(page_data => page_data.title === 'United States'), 'list category tree: [[Category:Countries in North America]] must includes [[United States]]');
assert('Mexico' in page_list[Wikiapi.KEY_subcategories], 'list category tree: [[Category:Mexico]] is a subcategory of [[Category:Countries in North America]]');
// </code>
 *
 * @example <caption>Get all sub-categories of [[Category:Echinodermata]] with depth=2.</caption>
// <code>
const wiki = new Wikiapi('commons');
const all_sub_categories = (await wiki.category_tree('Echinodermata', { depth: 2, cmtype: 'subcat', get_flated_subcategories: true })).flated_subcategories;
// </code>
 *
 * @memberof Wikiapi.prototype
 */
function Wikiapi_category_tree(root_category, options) {
	function Wikiapi_category_tree_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		// using wiki_API.prototype.category_tree
		wiki.category_tree(root_category, (list, error) => {
			if (error) {
				reject(error);
			} else {
				resolve(list);
			}
		}, options);
	}

	return new Promise(Wikiapi_category_tree_executor.bind(this));
}

/**
 * export key for subcategory 子分類 used in {@link Wikiapi#category_tree}
 *
 * @example
// <code>
const KEY_subcategories = Wikiapi.KEY_subcategories;
// </code>
 */
Wikiapi.KEY_subcategories = wiki_API.KEY_subcategories;

// --------------------------------------------------------

/**
 * @alias search
 * @description search pages include <code>key</code>
 *
 * @param {String} key			- key to search
 * @param {Object} [options]	- options to run this function.
 *
 * @returns {Promise} Promise object represents {Array} page_list.
 *
 * @example <caption>search pages include key: 霍金</caption>
// <code>
const zhwikinews = new Wikiapi('zh.wikinews');
const page_list = await zhwikinews.search('"霍金"');
// </code>
 *
 * @memberof Wikiapi.prototype
 */
function Wikiapi_search(key, options) {
	function Wikiapi_search_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		// using wiki_API.search
		wiki.search(key, (list, error) => {
			if (error) {
				reject(error);
			} else {
				resolve(list);
			}
		}, options);
	}

	return new Promise(Wikiapi_search_executor.bind(this));
}

// --------------------------------------------------------

/**
 * @alias redirects_root
 * @description Get redirects target of <code>title</code>.
 * 
 * @param {String} title		- page title
 * @param {Object} [options]	- options to run this function
 *
 * @returns {Promise} Promise object represents {String} page title or {Object} page data
 *
 * @example <caption>Get redirects target of [[WP:SB]]</caption>
// <code>
const redirects_taregt = await enwiki.redirects_root('WP:SB', { get_page_data: true });
// </code>
 * 
 * @memberof Wikiapi.prototype
 */
function Wikiapi_redirects_root(title, options) {
	function Wikiapi_redirects_root_executor(resolve, reject) {
		// const wiki = this[KEY_wiki_session];
		// using wiki_API.redirects_root
		wiki_API.redirects_root(title, (_title, page_data, error) => {
			if (error) {
				reject(error);
			} else if (options && options.get_page_data) {
				page_data.query_title = title;
				resolve(page_data);
			} else {
				resolve(_title);
			}
		}, this.append_session_to_options(options));
	}

	return new Promise(Wikiapi_redirects_root_executor.bind(this));
}

// --------------------------------------------------------

/**
 * @alias redirects_here
 * @description Get all pages redirects to <code>title</code>.
 * 
 * @param {String} title		- page title
 * @param {Object} [options]	- options to run this function
 *
 * @returns {Promise} Promise object represents {Array} redirect_list
 *
 * @example <caption>Get all pages redirects to [[Wikipedia:Sandbox]]</caption>
// <code>
const redirects_list = await enwiki.redirects_here('Wikipedia:Sandbox');
// </code>
 * 
 * @memberof Wikiapi.prototype
 */
function Wikiapi_redirects_here(title, options) {
	function Wikiapi_redirects_here_executor(resolve, reject) {
		// const wiki = this[KEY_wiki_session];
		// using wiki_API.redirects_here
		wiki_API.redirects_here(title, (root_page_data, redirect_list, error) => {
			if (error) {
				reject(error);
			} else {
				//console.trace(root_page_data);
				//console.trace(redirect_list);
				//console.assert(!redirect_list || redirect_list === root_page_data.redirect_list);
				resolve(redirect_list || root_page_data);
			}
		}, this.append_session_to_options({
			// Making .redirect_list[0] the redirect target.
			include_root: true,
			...options
		}));
	}

	return new Promise(Wikiapi_redirects_here_executor.bind(this));
}

// --------------------------------------------------------

/**
 * @alias register_redirects
 * @description register page alias. usually used for templates
 * 
 * @param {Array|String} page_title_list	- list of page titles
 * @param {Object} [options]				- options to run this function.
 *
 * @returns {Promise} Promise object represents the operations are done.
 *
 * @example <caption>Register template redirects and get tokens of the templates.</caption>
// <code>
const wiki_session = new Wikiapi;
// e.g., await wiki_session.register_redirects(['Section link', 'Broken anchors'], { namespace: 'Template' });
await wiki_session.register_redirects([template_name_1, template_name_2, template_name_3], { namespace: 'Template' });

// ...

const page_data = await wiki_session.page(page_title);
// {Array} parsed page content 頁面解析後的結構。
const parsed = page_data.parse();

parsed.each('Template:' + template_name_1, function (token, index, parent) {
	// ...
});

parsed.each('template', function (token, index, parent) {
	if (wiki_session.is_template(template_name_1, token)) {
		// ...
		return;
	}
	if (wiki_session.is_template(template_name_2, token)) {
		// ...
		return;
	}

	// alternative method:
	switch (wiki_session.redirect_target_of(token)) {
		case wiki_session.redirect_target_of(template_name_1):
			break;
		case wiki_session.redirect_target_of(template_name_2):
			break;
		case wiki_session.redirect_target_of(template_name_3):
			break;
	}
});
// </code>
 *
 * @memberof Wikiapi.prototype
 */
function Wikiapi_register_redirects(page_title_list, options) {
	function Wikiapi_register_redirects_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		wiki.register_redirects(page_title_list, (redirect_list, error) => {
			if (error) {
				reject(error);
			} else {
				// console.trace( redirect_list);
				resolve(redirect_list);
			}
		}, options);
	}

	return new Promise(Wikiapi_register_redirects_executor.bind(this));
}

// --------------------------------------------------------

/**
 * @alias upload
 * @description Upload specified local file to the target wiki.
 *
 * @param {Object} file_data	- Upload configurations.<br />
 * Warning: When you are update a file, only the file content will changed. The <code>comment</code> will only show in the file page. The <code>text</code>, ... till <code>categories</code> will <em>all ignored</em>. If you want to update the content of file page, please consider <code>Variable_Map</code> as mentioned in the sample code.<br />
{<br />
<ul>
<li><code>file_path</code>: string - Local path.</li>
<li><code>media_url</code>: string - URL path. Alternative to <code>file_path</code>.</li>
<li><code>comment</code>: string - Upload comment.</li>

<li><code>text</code>: string or {Object} - Either {String}wikitext to fill the file's page,<br />
 or {Object}parameters of <a href="https://commons.wikimedia.org/wiki/Template:Information" target="_blank">{{Information}}</a>:<br />
{<br />
<ul>
<li><code>description</code>: string - File description.</li>
<li><code>date</code>: date string - YYYY-MM-DD, e.g., <code>new Date()</code> || <code>'2021-01-01'</code>.</li>
<li><code>source_url</code>: string - Source where the file comes from, typically an URL.</li>
<li><code>author</code>: string - Author's name or username in wikicode, e.g., URL or <code>'[[User:Yoda|Yoda]]'</code>.</li>
<li><code>permission</code>: string - License and other usage limitations and warnings, e.g., <code>'{{cc-by-sa-2.5}}'</code>.</li>
<li><code>other_versions</code>: string - Wikicode links to files with very similar content or derived files.</li>
<li><code>other_fields</code>: string - Additional table fields added on the bottom of the template.</li>
</ul>
}
</li>

<li><code>license</code>: array of strings - License under which the file is uploaded, e.g., <code>['{{cc-by-sa-2.5}}']</code>.</li>
<li><code>additional_text</code>: string - Additional wikitext to place before <code>categories</code>.</li>
<li><code>categories</code>: array of strings - Categories for this file, e.g., <code>['[[Category:test images]]']</code>.</li>

<li><code>ignorewarnings</code>: boolean - Set to 1 will overwrite existing files.</li>
</ul>
}<br />
<br />
See <a href="https://github.com/kanasimi/CeJS/blob/master/application/net/wiki/edit.js" target="_blank">edit.js</a> and search for <q>file_data</q> for other <code>file_data</code> options.
 *
 * @returns {Promise} Promise object represents {String} result of MediaWiki API
 *
 * @example <caption><span id="example__Upload file / media">Upload file / media</span></caption>
// <code>
const wiki = new Wikiapi;
await wiki.login('user', 'password', 'test');
// Upload a local file directly:
//let result = await wiki.upload({ file_path: '/local/file/path', comment: '', text: '' || {description: '', ...} });
let result = await wiki.upload({
	file_path: '/local/file/path', comment: '',
	filename: 'Will set via .file_path or .media_url if not settled.',
	description: '', date: new Date() || '2021-01-01', source_url: 'https://github.com/kanasimi/wikiapi', author: '[[User:user]]', permission: '{{cc-by-sa-2.5}}', other_versions: '', other_fields: '',
	license: ['{{cc-by-sa-2.5}}'], categories: ['[[Category:test images]]'],
	bot: 1, tags: "tag1|tag2",
	// To overwrite existing file
	ignorewarnings: 1,
});
// Upload file from URL:
result = await wiki.upload({ media_url: 'https://media.url/name.jpg', comment: '', text: '' });
// </code>
 *
 * @example <caption>Upload file and then update content of file page</caption>
// <code>
const wiki = new Wikiapi;
await wiki.login('user', 'password', 'test');

const variable_Map = new CeL.wiki.Variable_Map();
variable_Map.set('description', '...');
//variable_Map.set('date', '...');
// ...
//variable_Map.set('other_fields', '...');

let result = await wiki.upload({
	file_path: '/local/file/path',
	// The <code>comment</code> will only show in the file page when updating file. It is read-only and cannot be modified.
	comment: '',

	// <code>CeL.wiki.Variable_Map</code> is used to update content when update pages or files. It will insert comments around the value, prevent others from accidentally editing the text that will be overwritten.
	// <code>description</code> till <code>other_fields</code> will be auto-setted as values assigned above.
	// The code to do the conversion is in <code>wiki_API.upload</code> @ https://github.com/kanasimi/CeJS/blob/master/application/net/wiki/edit.js
	// There are some examples: https://github.com/kanasimi/wikibot/blob/master/routine/20181016.import_earthquake_shakemap.js https://github.com/kanasimi/wikibot/blob/master/routine/20190629.import_hurricane_track_maps.js
	// More examples to use <code>CeL.wiki.Variable_Map</code>: https://github.com/kanasimi/wikibot/blob/master/routine/20191129.check_language_convention.js
	variable_Map,
	// When set .variable_Map, after successful update, the content of file page will be auto-updated too.

	// To overwrite existing file
	ignorewarnings: 1,
});
// </code>
 *
 * @memberof Wikiapi.prototype
 */
function Wikiapi_upload(file_data) {
	// 2021/3/25 renamed from old name: Wikiapi_upload_file(),
	// Wikiapi_upload_file_executor()
	function Wikiapi_upload_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		wiki.upload(file_data, (result, error) => {
			if (error) {
				reject(error);
			} else {
				resolve(result);
			}
		});
	}

	return new Promise(Wikiapi_upload_executor.bind(this));
}

// --------------------------------------------------------

/**
 * @alias download
 * @description Download file to local path.
 *
 * @param {String} file_title	- file title starts with "File:"
 * @param {Object} [options]	- options to run this function. Refer to example codes.
 *
 * @returns {Promise} Promise object represents [ {Object}file informations ]
 *
 * @example <caption>Download original file / media to current directory.</span></caption>
// <code>
const wiki = new Wikiapi('commons');
await wiki.download('File:Example.svg');
// </code>
 *
 * @example <caption>Download file / media with options</span></caption>
// <code>
const wiki = new Wikiapi('commons');

// Download non-vector version of .svg
await wiki.download('File:Example.svg', { width: 80 });

// Change width / height
await wiki.download('File:Example.png', {
	file_name: 'example.png', directory: '/tmp/',
	// reget and overwrite existed file.
	reget: true,
	width: 80,// height: 80
});

// Download all files from a (Commons) category and its subcategories WITH directory structure.
const file_data_list = await wiki.download('Category:name', {
	directory: './',
	max_threads: 4,
	// depth of categories
	depth: 4,
	// Only download files with these formats.
	//download_derivatives : ['wav', 'mp3', 'ogg'],
	// Warning: Will skip downloading if there is no new file!
	download_derivatives : 'mp3',
	// A function to filter result pages. Return `true` if you want to keep the element.
	page_filter(page_data) {
		return page_data.title.includes('word');
	}
});

// Download all files from a (Commons) category WITHOUT directory structure.
for (const page_data of await wiki.categorymembers('Category:name', { namespace: 'File' })) {
	try {
		//if (wiki.is_namespace(page_data, 'File'))
		const file_data = await wiki.download(page_data, { directory: './' });
	} catch (e) { console.error(e); }
}
// also
const categorymembers = await wiki.categorymembers('Category:name', { namespace: 'File' });
const file_data_list = await wiki.download(categorymembers, { directory: './', no_category_tree: true });
// </code>
 *
 * @memberof Wikiapi.prototype
 */
function Wikiapi_download(file_title, options) {
	function Wikiapi_download_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		wiki.download(file_title, options, (result, error) => {
			if (error) {
				// return result.error_titles
				reject(result && result.error_titles && result || error);
			} else {
				resolve(result);
			}
		});
	}

	return new Promise(Wikiapi_download_executor.bind(this));
}

// --------------------------------------------------------

/**
 * @alias for_each_page
 * @description Edit / process pages listing in <code>page_list</code>. Will get the content of multiple pages at once to save transmission times. 一次取得多個頁面內容，以節省傳輸次數。
 * 
 * @param {Array} page_list			- title list or page_data list
 * @param {Function} for_each_page	- processor for each page. for_each_page(page_data with contents)
 * @param {Object} [options]		- options to run this function. Refer to example codes.
 *
 * @returns {Promise} Promise object represents the operations are done.
 *
 * @example <caption>read / edit multiple pages</caption>
// <code>
const enwiki = new Wikiapi('en');
const link_from = await wiki.redirects_here('ABC');
await wiki.for_each_page(link_from, page_data => {
	// Return `Wikiapi.skip_edit` if you just want to get the page data.
	return Wikiapi.skip_edit;
	return 'You may also modify page contents for each page';
}, {
	// The options below are sample, not default configuration.

	// denotes we do not edit pages
	no_edit: true,

	// Only needed if you want to modify page.
	summary: 'test edit',
	// Allow content to be emptied. 允許內容被清空。白紙化。
	allow_empty: true,
	tags: 'bot trial',
	// prevent creating new pages
	// Throw an error if the page doesn't exist.
	// 若頁面不存在/已刪除，則產生錯誤。
	nocreate: 1,
	// denotes this is a bot edit. 標記此編輯為機器人編輯。
	bot: 1,
	minor: 1,

	// options to get page revisions
	page_options: { redirects: 1, rvprop: 'ids|content|timestamp|user' }

	// <code>.for_each_page()</code> will generate a report. It can be written to the specified page.
	log_to: 'log to this page',
	// no warning messages on console. e.g., hide "wiki_API_page: No contents: [[title]]" messages
	no_warning: true,
	// no warning messages and debug messages on console
	no_message: true,
});
// </code>
 *
 * @memberof Wikiapi.prototype
 */
function Wikiapi_for_each_page(page_list, for_each_page, options) {
	function Wikiapi_for_each_page_executor(resolve, reject) {
		options = typeof options === 'string' ? { summary: options } : CeL.setup_options(options);

		const wiki = this[KEY_wiki_session];
		const append_to_this = Array.isArray(for_each_page) && for_each_page[1];
		if (Array.isArray(for_each_page))
			for_each_page = for_each_page[0];
		// console.trace(for_each_page);
		const work_config = {
			log_to: null,
			no_message: options.no_edit,

			...options,

			//is_async_each: CeL.is_async_function(for_each_page),
			each: [function each(page_data/* , messages, config */) {
				set_page_data_attributes(page_data, wiki);

				return for_each_page.apply(this, arguments);
			}, append_to_this],
			// Run after all list items (pages) processed.
			last(error) {
				// this === options
				// console.trace('last(error)');
				// console.error(error);
				// console.trace('Wikiapi_for_each_page_executor finish:');
				// console.log(options);

				// 提早執行 resolve(), reject() 的話，可能導致後續的程式碼 `options.last`
				// 延後執行，程式碼順序錯亂。
				if (typeof options.last === 'function')
					options.last.call(this, error);
				if (error) {
					if (options.throw_error) {
						reject(error);
						return;
					}
					console.error(error);
				}
				resolve(this);
			}
		};

		wiki.work(work_config, page_list);
	}

	return new Promise(Wikiapi_for_each_page_executor.bind(this));
}


// --------------------------------------------------------

/**
 * @alias convert_Chinese
 * @description convert text to traditional Chinese / simplified Chinese.
 * 
 * @param {String|Array|Object} text	- text or objects to convert. Will convert to {String} using JSON.stringify().
 * @param {Object} [options]			- options to run this function
 *
 * @returns {Promise} Promise object represents the converted text.
 *
 * @example <caption>繁簡轉換</caption>
// <code>
const wiki = new Wikiapi('en');
await wiki.convert_Chinese('中国', { uselang: 'zh-hant' });
await wiki.convert_Chinese('中國', { uselang: 'zh-hans' });
await wiki.convert_Chinese(['繁體', '簡體'], { uselang: 'zh-hans' });
// </code>
 * 
 * @memberof Wikiapi.prototype
 */
function Wikiapi_convert_Chinese(text, options) {
	function Wikiapi_convert_Chinese(resolve, reject) {
		if (typeof options === 'string') {
			options = { uselang: options };
		}
		const site_name = this.site_name({ get_all_properties: true });
		// node.js v12.22.7: Cannot use "?."
		if (site_name && site_name.language === 'zh') {
			// 不用再重新造出一個實體。
			options = this.append_session_to_options(options);
		}

		// using wiki_API.search
		wiki_API.convert_Chinese(text, (text, error) => {
			if (error) {
				reject(error);
			} else {
				resolve(text);
			}
		}, options);
	}

	return new Promise(Wikiapi_convert_Chinese.bind(this));
}

// --------------------------------------------------------

// May only test in the [https://tools.wmflabs.org/ Wikimedia Toolforge]
function Wikiapi_run_SQL(SQL, for_each_row/* , options */) {
	function Wikiapi_run_SQL_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		function run_callback() {
			wiki.SQL_session.SQL(SQL, (error, rows/* , fields */) => {
				if (error) {
					reject(error);
				} else {
					rows.forEach(for_each_row);
				}
			});
			resolve();
		}
		if (wiki.SQL_session) {
			run_callback();
			return;
		}
		wiki.SQL_session = new wiki_API.SQL((error, rows, fields) => {
			if (error) {
				reject(error);
			} else {
				run_callback();
			}
		}, wiki);
	}

	return new Promise(Wikiapi_run_SQL_executor.bind(this));
}

// --------------------------------------------------------

function Wikiapi_setup_layout_elements(options) {
	function Wikiapi_setup_layout_elements_executor(resolve, reject) {
		// const wiki = this[KEY_wiki_session];
		wiki_API.setup_layout_elements(resolve, this.append_session_to_options(options));
	}

	return new Promise(Wikiapi_setup_layout_elements_executor.bind(this));
}

// --------------------------------------------------------

/**
 * @alias get_featured_content
 * @description Get featured content.
 * 
 * @param {String|Object} [options]	- options to run this function.
 *            {String}type (FFA|GA|FA|FL)
 *            || {type,on_conflict(FC_title, {from,to})}
 *
 * @returns {Promise} Promise object represents {Object} featured content data hash
 *
 * @example <caption>Get featured content of current wiki site.</caption>
// <code>
// MUST including wiki.featured_content first to get featured content!
CeL.run('application.net.wiki.featured_content');

// ...

const FC_data_hash = await wiki.get_featured_content();
console.assert(FC_data_hash === wiki.FC_data_hash);
// </code>
 * 
 * @memberof Wikiapi.prototype
 */
function Wikiapi_get_featured_content(options) {
	if (!options || !options.type) {
		const session = this;
		return Wikiapi_get_featured_content.default_types
			.reduce((promise, type) => promise.then(Wikiapi_get_featured_content.bind(session, { ...options, type })), Promise.resolve());
		if (false) {
			let promise = Promise.resolve();
			Wikiapi_get_featured_content.default_types.forEach(type => {
				promise = promise.then(Wikiapi_get_featured_content.bind(session, { ...options, type }));
			});
			return promise;
		}
	}

	function Wikiapi_get_featured_content_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		wiki.get_featured_content(options, FC_data_hash => {
			try {
				this.FC_data_hash = FC_data_hash;
				resolve(FC_data_hash);
			} catch (e) {
				reject(e);
			}
		});
	}

	return new Promise(Wikiapi_get_featured_content_executor.bind(this));
}

Wikiapi_get_featured_content.default_types = 'FFA|GA|FA|FL'.split('|');

// --------------------------------------------------------

/**
 * @alias site_name
 * @description Get site name / project name of this {Wikiapi}.
 * 
 * @param {String} [language]	- language code of wiki session
 * @param {Object} [options]	- options to run this function
 *
 * @returns {String}site name
 * 
 * @example <caption>Get site name of {Wikiapi}.</caption>
// <code>
console.log(Wikiapi.site_name('zh', { get_all_properties: true }));

const wiki = new Wikiapi('en');
console.assert(wiki.site_name() === 'enwiki');
console.log(wiki.site_name({ get_all_properties: true }));
console.assert(wiki.site_name({ get_all_properties: true }).language === 'en');
// </code>
 * 
 * @memberof Wikiapi.prototype
 */
function Wikiapi_site_name(language, options) {
	return wiki_API.site_name(language, options);
}

Wikiapi.site_name = Wikiapi_site_name;

// --------------------------------------------------------
// administration functions 管理功能。

/**
 * @alias delete
 * @description delete page
 *
 * @param {String} title		- page title
 * @param {Object} [options]	- options to run this function
 *
 * @returns {Promise} Promise object represents response of delete.
 *
 * @example <caption>delete page [[Page to delete]]</caption>
// <code>
const testwiki = new Wikiapi('test');
await testwiki.delete('Page to delete', { reason: 'test' });
// { title: 'Aaaaaaa', reason: 'test', logid: 346223 }
// </code>
 *
 * @memberof Wikiapi.prototype
 */
function Wikiapi_delete(title, options) {
	function Wikiapi_delete_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		// using wiki_API.delete
		wiki.page(title).delete(options, (response, error) => {
			if (error) {
				reject(error);
			} else {
				resolve(response);
			}
		}, options);
	}

	return new Promise(Wikiapi_delete_executor.bind(this));
}

// --------------------------------------------------------
// exports

Object.assign(Wikiapi.prototype, {
	append_session_to_options(options) {
		// Object.assign({ [KEY_SESSION]: wiki }, options)
		// return { ...options, [KEY_SESSION]: this[KEY_wiki_session] };
		return wiki_API.add_session_to_options(this[KEY_wiki_session], options);
	},

	site_name(options) {
		return Wikiapi_site_name(this[KEY_wiki_session], options);
	},
	login: Wikiapi_login,

	query: Wikiapi_query,
	page: Wikiapi_page,
	tracking_revisions: Wikiapi_tracking_revisions,
	edit_page: Wikiapi_edit_page,
	/**
	 * @description edits content of target page.<br />
	 * <em>MUST using after {@link Wikiapi#page}!</em><br />
	 * Note: for multiple pages, you should use {@link Wikiapi#for_each_page}.<br />
	 * Note: The function will check sections of [[User talk:user name/Stop]] if somebody tells us needed to stop edit. See <a href="https://zh.wikipedia.org/wiki/User:Cewbot/Stop">mechanism to stop operations</a>.
	 * 
	 * @param {String|Function} content	- 'wikitext page content' || page_data => 'wikitext'
	 * @param {Object} [options]		- options to run this function. e.g., { summary: '', bot: 1, nocreate: 1, minor: 1 }
	 * 
	 * @returns {Promise} Promise object represents {Object} result of MediaWiki API
	 *
	 * @memberof Wikiapi.prototype
	 */
	edit(content, options) {
		return this.edit_page(null, content, options);
	},
	move_to: Wikiapi_move_to,
	move_page: Wikiapi_move_page,
	purge: Wikiapi_purge,
	/**
	 * @description Listen to page modification. 監視最近更改的頁面。<br />
	 * wrapper for {@link wiki_API}#listen
	 *
	 * @param {Function} listener	- function(page_data) { return quit_listening; }
	 * @param {Object} [options]	- options to run this function. e.g., { summary: '', bot: 1, nocreate: 1, minor: 1 }
	 *
	 * @example <caption>listen to new edits</caption>
// <code>
const wiki = new Wikiapi;
wiki.listen(function for_each_row() {
	// ...
}, {
	// 檢查的延遲時間。
	delay: '2m',
	filter: function filter_row(row) {
		// row is the same format as page_data
	},
	// also get diff
	with_diff: { LCS: true, line: true },
	// only for articles (0:main namespace) and talk pages
	namespace: '0|talk',
});
// </code>
	 *
	 * @memberof Wikiapi.prototype
	 */
	listen(listener, options) {
		const wiki = this[KEY_wiki_session];
		wiki.listen(listener, options);
	},

	category_tree: Wikiapi_category_tree,
	search: Wikiapi_search,

	redirects_root: Wikiapi_redirects_root,
	// Warning: 採用 wiki_API.redirects_here(title) 才能追溯重新導向的標的。
	// wiki.redirects() 無法追溯重新導向的標的！
	redirects_here: Wikiapi_redirects_here,
	register_redirects: Wikiapi_register_redirects,

	upload: Wikiapi_upload,
	download: Wikiapi_download,

	get_featured_content: Wikiapi_get_featured_content,

	for_each_page: Wikiapi_for_each_page,

	for_each: Wikiapi_for_each,

	delete: Wikiapi_delete,

	data: Wikiapi_data,
	new_data_entity: Wikiapi_new_data_entity,
	SPARQL: Wikiapi_SPARQL,

	convert_Chinese: Wikiapi_convert_Chinese,

	run_SQL: Wikiapi_run_SQL,

	setup_layout_elements: Wikiapi_setup_layout_elements,
});

// wrapper for properties
for (const property_name of ('task_configuration|latest_task_configuration').split('|')) {
	Object.defineProperty(Wikiapi.prototype, property_name, {
		get() {
			const wiki = this[KEY_wiki_session];
			return wiki[property_name];
		}
	});
}

// wrapper for sync functions
for (const function_name of ('namespace|remove_namespace|is_namespace|to_namespace|is_talk_namespace|to_talk_page|talk_page_to_main|normalize_title|redirect_target_of|aliases_of_page|is_template'
	// CeL.run('application.net.wiki.featured_content');
	// [].map(wiki.to_talk_page.bind(wiki))
	+ '|get_featured_content_configurations').split('|')) {
	Wikiapi.prototype[function_name] = function wrapper() {
		const wiki = this[KEY_wiki_session];
		return wiki[function_name].apply(wiki, arguments);
	};
}

// @see get_list.type @
// https://github.com/kanasimi/CeJS/blob/master/application/net/wiki/list.js
for (const type of wiki_API.list.type_list) {
	// Cannot use `= (title, options) {}` !
	// arrow function expression DO NOT has this, arguments, super, or
	// new.target keywords.
	Wikiapi.prototype[type] = function (title, options) {
		const _this = this;
		/**
		 * @example <code>
		
		const page_list = await wiki.embeddedin(template_name, options);
		await page_list.each((page_data) => { }, options);

		 * </code>
		 */
		return Wikiapi_list.call(this, type, title, options)
			.then((page_list) => {
				// console.log(page_list);
				page_list.each = Wikiapi_for_each_page.bind(_this, page_list);
				return page_list;
			});
	};
}

module.exports = Wikiapi;

// export default Wikiapi;
