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
//for debug
//wikiapi.KEY_wiki = KEY_wiki;

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
	/**
	 * {String}page content, maybe undefined. 條目/頁面內容 =
	 * CeL.wiki.revision_content(revision)
	 */
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
		wiki.page(title, (page_data, error) => {
			if (error) {
				reject(error);
			} else {
				if (page_data)
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

function reject_edit_error(reject, error, result) {
	// skip_edit is not error
	if (error && error !== /* 'skip' */ wikiapi.skip_edit[1]
		//@see wiki_API_edit.check_data
		&& error !== 'empty' && error !== 'cancel') {
		if (typeof error === 'string') {
			error = new Error(error);
			error.from_string = true;
		}
		if (result && typeof error === 'object')
			error.result = result;
		reject(error);
		return true;
	}
}

// for page list, you had better use wiki.for_each_page(page_list)
function wikiapi_edit_page(title, content, options) {
	function wikiapi_edit_page_executor(resolve, reject) {
		const wiki = this[KEY_wiki];
		//console.trace([title, content]);
		//CeL.set_debug(3);
		if (title) {
			wiki.page(title);
		}
		//console.trace(wiki);
		// wiki.edit(page contents, options, callback)
		wiki.edit(content, options, (title, error, result) => {
			//console.trace('wikiapi_edit_page: callbacked');
			//console.log(title);
			//console.log(wiki.running);
			//CeL.set_debug(6);

			if (!reject_edit_error(reject, error, result)) {
				resolve(title);
			}
			//console.trace('wikiapi_edit_page: return');
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
		wiki.purge((data, error) => {
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
		wiki.data(key, property, (data, error) => {
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
		options = CeL.setup_options(options);
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

function wikiapi_category_tree(root_category, options) {
	function wikiapi_category_tree_executor(resolve, reject) {
		const wiki = this[KEY_wiki];
		// using CeL.wiki.prototype.category_tree
		wiki.category_tree(root_category, (list, error) => {
			if (error) {
				reject(error);
			} else {
				resolve(list);
			}
		}, options);
	}

	return new Promise(wikiapi_category_tree_executor.bind(this));
}

// export 子分類 subcategory
wikiapi.KEY_subcategories = wiki_API.KEY_subcategories;
// To use:
// const KEY_subcategories = Wikiapi.KEY_subcategories;

// --------------------------------------------------------

function wikiapi_search(key, options) {
	function wikiapi_search_executor(resolve, reject) {
		const wiki = this[KEY_wiki];
		// using wiki_API.search
		wiki.search(key, (list, error) => {
			if (error) {
				reject(error);
			} else {
				resolve(list);
			}
		}, options);
	}

	return new Promise(wikiapi_search_executor.bind(this));
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
 *            e.g., { no_edit: true, no_warning: true, page_options: {
 *            redirects: 1, rvprop: 'ids|content|timestamp|user' } }
 */
function wikiapi_for_each_page(page_list, for_each_page, options) {
	function wikiapi_for_each_page_executor(resolve, reject) {
		const promises = [];
		let error;
		const wiki = this[KEY_wiki];
		const work_options = {
			// log_to: null,
			// no_edit: true,
			no_message: options && options.no_edit,

			...options,

			onerror(_error) {
				//console.trace('Get error (onerror): ' + _error);
				if (reject_edit_error(_error => { if (!error) error = _error; }, _error)
					&& options && options.onerror) {
					options.onerror(_error);
				}
			},
			each(page_data/* , messages, config */) {
				try {
					// `page_data` maybe non-object when error occurres.
					if (page_data)
						Object.defineProperties(page_data, page_data_attributes);

					if (work_options.will_call_methods) {
						//** 這邊的操作在 wiki.next() 中會因 .will_call_methods 先執行一次。

						// 因為接下來的操作可能會呼叫 this.next() 本身，
						// 因此必須把正在執行的標記消掉。
						//wiki.running = false;
						// 每次都設定 `wiki.running = false`，在這會出問題:
						// 20200209.「S.P.A.L.」関連ページの貼り換えのbot作業依頼.js
					}
					const result = for_each_page.apply(this, arguments);
					// Promise.isPromise()
					if (CeL.is_thenable(result)) {
						promises.push(result);

						//https://stackoverflow.com/questions/30564053/how-can-i-synchronously-determine-a-javascript-promises-state
						//https://github.com/kudla/promise-status-async/blob/master/lib/promiseState.js
						const fulfilled = Object.create(null);
						//Promise.race([result, fulfilled]).then(v => { status = v === t ? "pending" : "fulfilled" }, () => { status = "rejected" });
						Promise.race([result, fulfilled]).then(first_fulfilled => {
							// wiki.running === true
							//console.trace(`wiki.running = ${wiki.running}`);
							if (first_fulfilled === fulfilled) {
								//assert: result is pending
								//e.g.,
								//await wiki.for_each_page(need_check_redirected_list, ...)
								//@ await wiki.for_each_page(vital_articles_list, for_each_list_page, ...)
								//@ 20200122.update_vital_articles.js

								//console.trace('call wiki.next()');
								wiki.next();
							}
						}, () => { /*Do not catch error here.*/ });
					}
					// wiki.next() will wait for result.then() calling back if CeL.is_thenable(result).
					// e.g., async function for_each_list_page(list_page_data) @ 20200122.update_vital_articles.js
					return result;
				} catch (_error) {
					//console.trace('Get error (catch): ' + _error);
					if (!error) error = _error;

					//re-throw to wiki.work()
					//throw _error;
				}
			},
			// Run after all list items (pages) processed.
			last(options) {
				Promise.allSettled(promises)
					// 提早執行 resolve(), reject() 的話，可能導致後續的程式碼 `options.last` 延後執行，程式碼順序錯亂。
					.catch(_error => { if (!error) error = _error; })
					.then(options && typeof options.last === 'function' && options.last.bind(this))
					.then(() => error ? reject(error) : resolve(this), reject);
				//console.trace('wikiapi_for_each_page_executor finish:');
				//console.log(options);
			}
		};
		// 一次取得多個頁面內容，以節省傳輸次數。
		wiki.work(work_options, page_list);
	}

	return new Promise(wikiapi_for_each_page_executor.bind(this));
}

// --------------------------------------------------------

// May only test in the [https://tools.wmflabs.org/ Wikimedia Toolforge]
function wikiapi_run_SQL(SQL, for_each_row/* , options */) {
	function wikiapi_run_SQL_executor(resolve, reject) {
		const wiki = this[KEY_wiki];
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

	return new Promise(wikiapi_run_SQL_executor.bind(this));
}

// --------------------------------------------------------

/**
 * Get featured content.
 * 
 * @example<code>

// MUST including wiki.featured_content first to get featured content!
CeL.run('application.net.wiki.featured_content');
...
const FC_data_hash = await wiki.get_featured_content();
FC_data_hash === wiki.FC_data_hash;

 </code>
 * 
 * @param {String|Object}[options]
 *            {String}type (FFA|GA|FA|FL) or options:
 *            {type,on_conflict(FC_title, {from,to})}
 */
function wikiapi_get_featured_content(options) {
	if (!options || !options.type) {
		const session = this;
		let promise = Promise.resolve();
		wikiapi_get_featured_content.default_types.forEach(type => {
			promise = promise.then(wikiapi_get_featured_content.bind(session, { ...options, type }));
		});
		return promise;
	}

	function wikiapi_get_featured_content_executor(resolve, reject) {
		const wiki = this[KEY_wiki];
		wiki.get_featured_content(options, (FC_data_hash) => {
			try {
				this.FC_data_hash = FC_data_hash;
				resolve(FC_data_hash);
			} catch (e) {
				reject(e);
			}
		});
	}

	return new Promise(wikiapi_get_featured_content_executor.bind(this));
}

wikiapi_get_featured_content.default_types = 'FFA|GA|FA|FL'.split('|');

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

	get_featured_content: wikiapi_get_featured_content,

	for_each_page: wikiapi_for_each_page,

	for_each: wikiapi_for_each,

	data: wikiapi_data,

	run_SQL: wikiapi_run_SQL,
});

Object.defineProperties(wikiapi.prototype, {
	latest_task_configuration: {
		get() {
			const wiki = this[KEY_wiki];
			return wiki.latest_task_configuration;
		}
	},
});

// wrapper for sync functions
for (let function_name of ('namespace|remove_namespace|is_namespace|to_namespace|is_talk_namespace|to_talk_page|talk_page_to_main|normalize_title'
	//CeL.run('application.net.wiki.featured_content');
	//[].map(wiki.to_talk_page.bind(wiki))
	+ '|get_featured_content_configurations').split('|')) {
	wikiapi.prototype[function_name] = function wrapper() {
		const wiki = this[KEY_wiki];
		return wiki[function_name].apply(wiki, arguments);
	};
}

for (let type of CeL.wiki.list.type_list) {
	// Can not use `= (title, options) {}` !
	// arrow function expression DO NOT has this, arguments, super, or
	// new.target keywords.
	wikiapi.prototype[type] = function (title, options) {
		const _this = this;
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
