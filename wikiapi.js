'use strict';

try {
	// Load CeJS library.
	const CeL = require('cejs');
} catch {
}

// for debug:
// const wikiapi = require('./wikiapi.js');
if (typeof CeL === 'undefined') {
	require('./_CeL.loader.nodejs.js');
}

// @see `wiki loader.js`
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

// Set default language. 改變預設之語言。
CeL.wiki.set_language('en');

const KEY_wiki = 'wiki';

function wikiapi(API_URL) {
	this[KEY_wiki] = new CeL.wiki(null, null, API_URL);
}

function wikiapi_login(user_name, user_password, API_URL) {
	return new Promise(function (resolve, reject) {
		this[KEY_wiki] = CeL.wiki.login(user_name, user_password, {
			API_URL: API_URL || this[KEY_wiki].API_URL,
			callback: function (data, error) {
				if (error) {
					reject(error);
				} else {
					resolve(data);
				}
			},
			preserve_password: true
		});
	}.bind(this));
}

const page_data_attributes = {
	wikitext: {
		get() {
			return CeL.wiki.content_of(this);
		}
	},
	parse: {
		value: function parse() {
			return CeL.wiki.parser(this).parse();
		}
	},
};

function wikiapi_page(title, options) {
	return new Promise(function (resolve, reject) {
		const wiki = this[KEY_wiki];
		wiki.page(title, function (page_data, error) {
			if (error) {
				reject(error);
				return;
			}

			Object.defineProperties(page_data, page_data_attributes);
			resolve(page_data);
		}, options);
	}.bind(this));
}

function wikiapi_edit_page(title, content, options) {
	return new Promise(function (resolve, reject) {
		const wiki = this[KEY_wiki];
		if (title) {
			wiki.page(title);
		}
		wiki.edit(content, options, function (title, error) {
			if (error) {
				reject(error);
			} else {
				resolve(title);
			}
		});
	}.bind(this));
}


Object.assign(wikiapi.prototype, {
	login: wikiapi_login,
	page: wikiapi_page,
	edit_page: wikiapi_edit_page,
	edit: function (content, options) {
		return this.edit_page(null, content, options);
	},
});

module.exports = wikiapi;

// export default wikiapi;
