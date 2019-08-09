'use strict';

let CeL;

try {
	// Load CeJS library.
	CeL = require('cejs');
} catch (e) /* istanbul ignore next: only for debugging locally */ {
	// https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md
	// const wikiapi = require('./wikiapi.js');
	require('./_CeL.loader.nodejs.js');
	CeL = global.CeL;
}
// assert: typeof CeL === 'function'

// Load modules.
// @see `wiki loader.js`: https://github.com/kanasimi/wikibot/blob/master/wiki%20loader.js
CeL.run(['interact.DOM', 'application.debug',
	// 載入不同地區語言的功能 for wiki.work()。
	'application.locale',
	// 載入操作維基百科的主要功能。
	'application.net.wiki',
	// Add color to console messages. 添加主控端報告的顏色。
	'interact.console',
	// for 'application.platform.nodejs': CeL.env.arg_hash, CeL.wiki.cache(),
	// CeL.fs_mkdir(), CeL.wiki.read_dump()
	'application.storage']);

const CeL_wiki = CeL.wiki;

// Set default language. 改變預設之語言。
CeL_wiki.set_language('en');

const KEY_wiki = 'wiki';

/**
 * wikiapi operator 操作子.
 * 
 * @param {String}[API_URL] language code or API URL of MediaWiki project
 */
function wikiapi(API_URL) {
	this[KEY_wiki] = new CeL_wiki(null, null, API_URL);
}

// --------------------------------------------------------

function wikiapi_login(user_name, user_password, API_URL) {
	function wikiapi_login_executor(resolve, reject) {
		this[KEY_wiki] = CeL_wiki.login(user_name, user_password, {
			API_URL: API_URL || this[KEY_wiki].API_URL,
			callback(data, error) {
				if (error) {
					reject(error);
				} else {
					resolve(data);
				}
			},
			preserve_password: true
		});
	}

	return new Promise(wikiapi_login_executor.bind(this));
}

// --------------------------------------------------------

const page_data_attributes = {
	wikitext: {
		get() {
			return CeL_wiki.content_of(this);
		}
	},
	parse: {
		value: function parse(options) {
			// function parse_page(options) @ CeL.wiki
			return CeL_wiki.parser(this).parse(options);
		}
	},
};

function wikiapi_page(title, options) {
	function wikiapi_page_executor(resolve, reject) {
		const wiki = this[KEY_wiki];
		wiki.page(title, function callback(page_data, error) {
			if (error) {
				reject(error);
			} else {
				Object.defineProperties(page_data, page_data_attributes);
				resolve(page_data);
			}
		}, options);
	}

	return new Promise(wikiapi_page_executor.bind(this));
}

// --------------------------------------------------------

function wikiapi_edit_page(title, content, options) {
	function wikiapi_edit_page_executor(resolve, reject) {
		const wiki = this[KEY_wiki];
		if (title) {
			wiki.page(title);
		}
		// wiki.edit(page contents, options, callback)
		wiki.edit(content, options, function callback(title, error, result) {
			if (error) {
				result.message = error;
				reject(result);
			} else {
				resolve(title);
			}
		});
	}

	return new Promise(wikiapi_edit_page_executor.bind(this));
}

// --------------------------------------------------------

function wikiapi_purge(title, options) {
	if (CeL.is_Object(title) && !options) {
		// shift arguments.
		options = title;
		title = null;
	}

	function wikiapi_purge_executor(resolve, reject) {
		const wiki = this[KEY_wiki];
		if (title) {
			wiki.page(title);
		}
		// using wiki_API.purge
		wiki.purge(function callback(data, error) {
			if (error) {
				reject(error);
			} else {
				resolve(data);
			}
		}, options);
	}

	return new Promise(wikiapi_purge_executor.bind(this));
}

// --------------------------------------------------------

function wikiapi_data(key, property, options) {
	if (CeL.is_Object(property) && !options) {
		// shift arguments.
		options = property;
		property = null;
	}

	function wikiapi_data_executor(resolve, reject) {
		const wiki = this[KEY_wiki];
		// using wikidata_entity() → wikidata_datavalue()
		wiki.data(key, property, function callback(data, error) {
			if (error) {
				reject(error);
			} else {
				resolve(data);
			}
		}, options);
	}

	return new Promise(wikiapi_data_executor.bind(this));
}

// --------------------------------------------------------

// Warning: Won't throw if title isn't existed!
function wikiapi_list(type, title, options) {
	function wikiapi_list_executor(resolve, reject) {
		const wiki = this[KEY_wiki];
		wiki[type](title, function callback(list, error) {
			if (error) {
				reject(error);
			} else {
				resolve(list);
			}
		}, Object.assign({
			limit: 'max'
		}, options));
	}

	return new Promise(wikiapi_list_executor.bind(this));
}

// --------------------------------------------------------

Object.assign(wikiapi.prototype, {
	login: wikiapi_login,

	page: wikiapi_page,
	edit_page: wikiapi_edit_page,
	edit(content, options) {
		return this.edit_page(null, content, options);
	},

	purge: wikiapi_purge,

	data: wikiapi_data,
});

CeL.wiki.list.type_list.forEach((type) => {
	wikiapi.prototype[type] = function (title, options) {
		return wikiapi_list.call(this, type, title, options);
	};
});

module.exports = wikiapi;

// export default wikiapi;
