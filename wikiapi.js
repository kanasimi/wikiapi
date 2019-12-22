'use strict';

let CeL;

try {
	// Load CeJS library.
	CeL = require('cejs');
} catch (e) /* istanbul ignore next: Only for debugging locally */ {
	// https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md
	// const wikiapi = require('./wikiapi.js');
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
	'application.net.wiki.parser',
	'application.net.wiki.edit', 'application.net.wiki.list',
	'application.net.wiki.data', 'application.net.wiki.admin',
	// Add color to console messages. 添加主控端報告的顏色。
	'interact.console',
	// for 'application.platform.nodejs': CeL.env.arg_hash, CeL.wiki.cache(),
	// CeL.fs_mkdir(), CeL.wiki.read_dump()
	'application.storage']);

// syntactic sugar
const wiki_API = CeL.net.wiki;

// Set default language. 改變預設之語言。
wiki_API.set_language('en');

/** @inner */
const KEY_wiki = Symbol('wiki');

/**
 * main wikiapi operator 操作子.
 * 
 * @param {String}[API_URL]
 *            language code or API URL of MediaWiki project
 */
function wikiapi(API_URL) {
	this[KEY_wiki] = new wiki_API(null, null, API_URL);
}

// --------------------------------------------------------

function wikiapi_login(user_name, user_password, API_URL) {
	function wikiapi_login_executor(resolve, reject) {
		this[KEY_wiki] = wiki_API.login(user_name, user_password, {
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
			return wiki_API.content_of(this, 0);
		}
	},
	revision: {
		value: function revision(revision_NO) {
			return wiki_API.content_of(this, revision_NO);
		}
	},
	parse: {
		value: function parse(options) {
			// function parse_page(options) @ CeL.wiki
			return wiki_API.parser(this).parse(options);
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
		}, {
			rvlimit: options && options.revisions,
			...options
		});
	}

	return new Promise(wikiapi_page_executor.bind(this));
}

// --------------------------------------------------------

// for page list, you had better use wiki.for_each_page(page_list)
function wikiapi_edit_page(title, content, options) {
	function wikiapi_edit_page_executor(resolve, reject) {
		const wiki = this[KEY_wiki];
		if (title) {
			wiki.page(title);
		}
		// wiki.edit(page contents, options, callback)
		wiki.edit(content, options, function callback(title, error, result) {
			if (error) {
				if (typeof error === 'string') {
					error = new Error(error);
					error.from_string = true;
				}
				if (typeof error === 'object')
					error.result = result;
				reject(error);
			} else {
				resolve(title);
			}
		});
	}

	return new Promise(wikiapi_edit_page_executor.bind(this));
}

// `return Wikiapi.skip_edit;` as a symbol to skip this edit, do not generate
// warning message.
// 可以利用 ((return [ CeL.wiki.edit.cancel, 'reason' ];)) 來回傳 reason。
// ((return [ CeL.wiki.edit.cancel, 'skip' ];)) 來跳過 (skip) 本次編輯動作，不特別顯示或處理。
// 被 skip/pass 的話，連警告都不顯現，當作正常狀況。
wikiapi.skip_edit = [wiki_API.edit.cancel, 'skip'];

// --------------------------------------------------------

/**
 * Move to `move_to_title`. Must call `wiki.page(move_from_title)` first!
 * 
 * @example <code>

	page_data = await wiki.page(move_from_title);
	try { await wiki.move_to(move_to_title, { reason: reason, noredirect: true, movetalk: true }); } catch (e) {}

 * </code>
 * 
 * @param {Object|String}[move_to_title]
 * @param {Object}[options]
 */
function wikiapi_move_to(move_to_title, options) {
	function wikiapi_move_to_executor(resolve, reject) {
		const wiki = this[KEY_wiki];
		if (!wiki.last_page) {
			reject(new Error('wikiapi_move_to: Must call .page() first!'
				+ ' Can not move to ' + CeL.wiki.title_link_of(move_to_title)));
			return;
		}
		// using wiki_API.move_to
		wiki.move_to(move_to_title, options, function callback(data, error) {
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

				e.g., { from: 'from', to: 'to', reason: 'move', redirectcreated: '' }

				</code>
				 */
				resolve(data);
			}
		}, options);
	}

	return new Promise(wikiapi_move_to_executor.bind(this));
}

// --------------------------------------------------------

function wikiapi_purge(title, options) {
	if (CeL.is_Object(title) && !options) {
		// shift arguments.
		[title, options] = [null, title];
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
		[property, options] = [null, property];
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
function wikiapi_list(list_type, title, options) {
	function wikiapi_list_executor(resolve, reject) {
		const wiki = this[KEY_wiki];
		CeL.wiki.list(title, (list/* , target, options */) => {
			// console.trace(list);
			if (list.error) {
				reject(list.error);
			} else {
				resolve(list);
			}
		}, {
			// [KEY_SESSION]
			session: wiki,
			type: list_type,
			// namespace: '0|1',
			...options
		});

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
		wiki[list_type](title, function callback(list, error) {
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

	return new Promise(wikiapi_list_executor.bind(this));
}

// functions for several kinds of lists
function wikiapi_for_each(type, title, for_each, options) {
	return wikiapi_list.call(this, type, title, {
		for_each,
		...options
	});
}

// --------------------------------------------------------

function list_executor(type, resolve, reject) {
	const wiki = this[KEY_wiki];
	wiki[type](root_category, function callback(list, error) {
		if (error) {
			reject(error);
		} else {
			resolve(list);
		}
	}, options);
}

function wikiapi_category_tree(root_category, options) {
	// using CeL.wiki.prototype.category_tree
	return new Promise(list_executor.bind(this, 'category_tree'));
}

// export 子分類 subcategory
wikiapi.KEY_subcategories = wiki_API.KEY_subcategories;
// To use:
//const KEY_subcategories = Wikiapi.KEY_subcategories;

// --------------------------------------------------------

function wikiapi_search(key, options) {
	// using wiki_API.search
	return new Promise(list_executor.bind(this, 'search'));
}

// --------------------------------------------------------

/**
 * Edit / process pages listing in `page_list`.
 * 
 * @param {Array}page_list
 *            title list or page_data list
 * @param {Function}for_each_page
 *            processor for each page. for_each_page(page_data with contents)
 * @param {Object}[options]
 *            e.g., { no_message: true, no_warning: true,
 *            page_options: { redirects: true, rvprop: 'ids|content|timestamp|user' } }
 */
function wikiapi_for_each_page(page_list, for_each_page, options) {
	function wikiapi_for_each_page_executor(resolve, reject) {
		const wiki = this[KEY_wiki];
		const promises = [];
		// 一次取得多個頁面內容，以節省傳輸次數。
		wiki.work({
			// log_to: null,
			// no_edit: true,
			no_message: options && options.no_edit,

			...options,

			each(page_data/* , messages, config */) {
				try {
					// `page_data` maybe non-object when error occurres.
					if (page_data)
						Object.defineProperties(page_data, page_data_attributes);
					const result = for_each_page.call(this, page_data
						/* , messages, config */);
					// Promise.isPromise()
					if (result && typeof result.then === 'function') {
						promises.push(result);
					} else {
						return result;
					}
				} catch (e) {
					reject(e);
				}
			},
			// Run after all list got.
			last() {
				Promise.all(promises).then(resolve).catch(reject);
			}
		}, page_list);
	}

	return new Promise(wikiapi_for_each_page_executor.bind(this));
}

// --------------------------------------------------------

// May only test in the [https://tools.wmflabs.org/ Wikimedia Toolforge]
function wikiapi_run_SQL(SQL, for_each_row/* , options */) {
	function wikiapi_run_SQL_executor(resolve, reject) {
		const wiki = this[KEY_wiki];
		function run_callback() {
			wiki.SQL_session.SQL(SQL, function (error, rows/* , fields */) {
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

	return new Promise(wikiapi_run_SQL_executor.bind(this));
}

// --------------------------------------------------------
// exports

Object.assign(wikiapi.prototype, {
	login: wikiapi_login,

	page: wikiapi_page,
	edit_page: wikiapi_edit_page,
	edit(content, options) {
		return this.edit_page(null, content, options);
	},
	move_to: wikiapi_move_to,
	purge: wikiapi_purge,

	category_tree: wikiapi_category_tree,
	search: wikiapi_search,

	for_each_page: wikiapi_for_each_page,

	for_each: wikiapi_for_each,

	data: wikiapi_data,

	run_SQL: wikiapi_run_SQL,
});

for (let type of CeL.wiki.list.type_list) {
	// Can not use `= (title, options) {}` !
	// arrow function expression DO NOT has this, arguments, super, or
	// new.target keywords.
	wikiapi.prototype[type] = function (title, options) {
		var _this = this;
		/**
		 * @example <code>
		
		const page_list = await wiki.embeddedin(template_name, options);
		await page_list.each((page_data) => { }, options);

		 * </code>
		 */
		return wikiapi_list.call(this, type, title, options)
			.then((page_list) => {
				// console.log(page_list);
				page_list.each = wikiapi_for_each_page.bind(_this, page_list);
				return page_list;
			});
	};
}

module.exports = wikiapi;

// export default wikiapi;
