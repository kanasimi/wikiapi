/**
 * @name wikiapi
 * 
 * @fileoverview Main code of module wikiapi
 */

// To generate documents:
// node_modules\.bin\jsdoc --readme README.md --destination docs wikiapi.js

'use strict';

let CeL;

try {
	// Load CeJS library.
	CeL = require('cejs');
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
	// for 'application.platform.nodejs': CeL.env.arg_hash, CeL.wiki.cache(),
	// CeL.fs_mkdir(), CeL.wiki.read_dump()
	'application.storage']);

// --------------------------------------------------------

// syntactic sugar
const wiki_API = CeL.net.wiki;
/**
 * key to get {wiki_API}operator of CeJS MediaWiki module when usiing CeL.wiki.
 * 
 * @type Symbol
 * 
 * @inner
 */
const KEY_SESSION = wiki_API.KEY_SESSION;

// Set default language. 改變預設之語言。
wiki_API.set_language('en');

/**
 * key to get {wiki_API}operator of CeJS MediaWiki module inside Wikiapi.
 * `this[KEY_wiki_session]` inside module code will get {wiki_API}operator.
 * 
 * @type Symbol
 * 
 * @inner
 */
const KEY_wiki_session = Symbol('wiki session');
// for debug
// Wikiapi.KEY_wiki_session = KEY_wiki_session;

/**
 * main Wikiapi operator 操作子.
 * 
 * @param {String|Object}[API_URL]
 *            language code or API URL of MediaWiki project.<br />
 *            Input {Object} will be treat as options.
 * 
 * @class
 * @constructor Wikiapi
 */
function Wikiapi(API_URL) {
	const wiki_session = new wiki_API(null, null, API_URL);
	// this[KEY_wiki_session] = new wiki_API(null, null, API_URL);
	this.setup_wiki_session(wiki_session);
}

// --------------------------------------------------------

function setup_wiki_session(wiki_session) {
	Object.defineProperty(wiki_session, 'setup_data_entity', { value: setup_data_entity });
	Object.defineProperty(this, KEY_wiki_session, {
		value: wiki_session,
		writable: true,
	});
}

Object.defineProperty(Wikiapi.prototype, 'setup_wiki_session', { value: setup_wiki_session });

/**
 * login into the target API using the provided username and password. For bot,
 * see [Special:BotPasswords] on your wiki.
 * 
 * @param {String}user_name
 *            Account username.
 * @param {String}password
 *            Account's password.
 * @param {String}[API_URL]
 *            API URL of target wiki site.
 * 
 * @example <caption>Login to wiki site.</caption>
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
			callback(data, error) {
				if (error) {
					reject(error);
				} else {
					resolve(data);
				}
			},
			// task_configuration_page: 'page title',
		});
		this.setup_wiki_session(wiki_session);
	}

	return new Promise(Wikiapi_login_executor.bind(this));
}

// --------------------------------------------------------

const page_data_attributes = {
	/**
	 * {String}page content, maybe undefined. 條目/頁面內容 =
	 * CeL.wiki.revision_content(revision)
	 */
	wikitext: {
		get() {
			// console.trace(this);
			// console.log(wiki_API.content_of(this, 0));
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
			// this === page_data

			// options = { ...options, [KEY_SESSION]: this[KEY_wiki_session] };
			options = Wikiapi.prototype.append_session_to_options.call(this, options);

			// using function parse_page(options) @ CeL.wiki
			return wiki_API.parser(this, options).parse();
			// return {Array}parsed
		}
	},
};

function set_page_data_attributes(page_data, wiki) {
	// `page_data` maybe non-object when error occurres.
	if (page_data) {
		page_data[KEY_wiki_session] = wiki;
		Object.defineProperties(page_data, page_data_attributes);
	}
	return page_data;
}

/**
 * given a title, returns the page's data.
 * 
 * @param {String}title
 *            page title
 * @param {Object}[options]
 *            options to run this function
 * 
 * @returns {Object} page's data
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
			rvlimit: options && options.revisions,
			...options
		});
	}

	return new Promise(Wikiapi_page_executor.bind(this));
}

// --------------------------------------------------------

/**
 * tracking revisions to lookup what revision add/removed text `to_search`.
 * 
 * @param {String}title
 *            page title
 * @param {String}to_search
 *            filter / text to search
 * @param {Object}[options]
 *            options to run this function
 * 
 * @returns {Array} [ newer_revision, page_data, error ]
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

function reject_edit_error(reject, error, result) {
	// skip_edit is not error
	if (error && error !== /* 'skip' */ Wikiapi.skip_edit[1]
		// @see wiki_API_edit.check_data
		&& error !== 'empty' && error !== 'cancel') {
		if (typeof error === 'string') {
			// console.log('' + reject);
			// console.trace(error);
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
}

// for page list, you had better use wiki.for_each_page(page_list)
function Wikiapi_edit_page(title, content, options) {
	function Wikiapi_edit_page_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];

		// console.trace([title, content]);
		// console.log(`Wikiapi_edit_page 1: ${title}, ${wiki.actions.length}
		// actions, ${wiki.running}/${wiki.thread_count}.`);
		// console.trace(title);
		// CeL.set_debug(3);
		if (title) {
			// console.trace(wiki);
			options = CeL.setup_options(options);
			// options.page_to_edit = title;
			// call wiki_API_prototype_method() @ CeL.application.net.wiki.list
			wiki.page(title, (page_data, error) => {
				// console.trace('Set .page_to_edit:');
				// console.log([title, page_data, error]);
				// console.log(wiki.actions[0]);

				// 手動指定要編輯的頁面。避免多執行續打亂 wiki.last_page。
				options.page_to_edit = page_data;
			}, options);
		}
		// console.log(`Wikiapi_edit_page 2: ${title}, ${wiki.actions.length}
		// actions, ${wiki.running}/${wiki.thread_count}.`);
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
				resolve(title);
			}
			// console.trace('Wikiapi_edit_page: return');
		});

		// console.log(`Wikiapi_edit_page 3: ${title}, ${wiki.actions.length}
		// actions, ${wiki.running}/${wiki.thread_count}.`);
	}

	return new Promise(Wikiapi_edit_page_executor.bind(this));
}

// `return Wikiapi.skip_edit;` as a symbol to skip this edit, do not generate
// warning message.
// 可以利用 ((return [ CeL.wiki.edit.cancel, 'reason' ];)) 來回傳 reason。
// ((return [ CeL.wiki.edit.cancel, 'skip' ];)) 來跳過 (skip) 本次編輯動作，不特別顯示或處理。
// 被 skip/pass 的話，連警告都不顯現，當作正常狀況。
/**
 * Return `Wikiapi.skip_edit` when we running edit function, but do not want to
 * edit current page.
 * 
 * @memberof Wikiapi
 */
Wikiapi.skip_edit = [wiki_API.edit.cancel, 'skip'];

// --------------------------------------------------------

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
 * Move to `move_to_title`. Must call `wiki.page(move_from_title)` first!
 * 
 * @param {Object|String}[move_to_title]
 * @param {Object}[options]
 *            options to run this function
 * 
 * @example <caption>Move `move_from_title` to `move_to_title`.</caption>
// <code>
page_data = await wiki.page(move_from_title);
try { await wiki.move_to(move_to_title, { reason: reason, noredirect: true, movetalk: true }); } catch (e) {}
// </code>
 *
 * @memberof Wikiapi.prototype
 */
function Wikiapi_move_to(move_to_title, options) {
	function Wikiapi_move_to_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		if (!wiki.last_page) {
			reject(new Error('Wikiapi_move_to: Must call .page() first!'
				+ ' Can not move to ' + CeL.wiki.title_link_of(move_to_title)));
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

function modify_data_entity(data_to_modify, options) {
	function modify_data_entity_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		// console.trace(wiki);

		// using function wikidata_edit() @
		// https://github.com/kanasimi/CeJS/blob/master/application/net/wiki/data.js
		// wiki.edit_data(id, data, options, callback)
		wiki.data(this).edit_data(data_to_modify || this, options, (data_entity, error) => {
			if (error) {
				reject(error);
			} else {
				wiki.setup_data_entity(data_entity);
				resolve(data_entity);
			}
		});
	}

	return new Promise(modify_data_entity_executor.bind(this));
}

function setup_data_entity(data_entity) {
	// assert: data_entity[KEY_SESSION].host === this
	// console.trace(data_entity[KEY_SESSION].host === this);
	delete data_entity[KEY_SESSION];

	Object.defineProperties(data_entity, {
		[KEY_wiki_session]: { value: this },
		modify: { value: modify_data_entity },
	});
}

function Wikiapi_data(key, property, options) {
	if (CeL.is_Object(property) && !options) {
		// shift arguments.
		[property, options] = [null, property];
	}

	function Wikiapi_data_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		// using wikidata_entity() → wikidata_datavalue()
		wiki.data(key, property, (data_entity, error) => {
			if (error) {
				reject(error);
			} else {
				wiki.setup_data_entity(data_entity);
				resolve(data_entity);
			}
		}, options);
	}

	return new Promise(Wikiapi_data_executor.bind(this));
}

// --------------------------------------------------------

// Warning: Won't throw if title is not existed!
function Wikiapi_list(list_type, title, options) {
	function Wikiapi_list_executor(resolve, reject) {
		options = CeL.setup_options(options);
		// const wiki = this[KEY_wiki_session];
		CeL.wiki.list(title, (list/* , target, options */) => {
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

function Wikiapi_category_tree(root_category, options) {
	function Wikiapi_category_tree_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		// using CeL.wiki.prototype.category_tree
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

// export 子分類 subcategory
Wikiapi.KEY_subcategories = wiki_API.KEY_subcategories;
// To use:
// const KEY_subcategories = Wikiapi.KEY_subcategories;

// --------------------------------------------------------

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

function Wikiapi_redirects_root(title, options) {
	function Wikiapi_redirects_root_executor(resolve, reject) {
		// const wiki = this[KEY_wiki_session];
		// using wiki_API.redirects_root
		wiki_API.redirects_root(title, (_title, page_data, error) => {
			if (error) {
				reject(error);
			} else if (options && options.get_page) {
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

function Wikiapi_redirects_here(title, options) {
	function Wikiapi_redirects_here_executor(resolve, reject) {
		// const wiki = this[KEY_wiki_session];
		// using wiki_API.redirects_here
		wiki_API.redirects_here(title, (root_page_data, redirect_list, error) => {
			if (error) {
				reject(error);
			} else {
				if (false) {
					console.trace(root_page_data);
					console.trace(redirect_list);
					console.assert(!redirect_list
						|| redirect_list === root_page_data.redirect_list);
				}
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

// @example
async () => {
	const wiki_session = new Wikiapi;
	await wiki_session.register_redirects([template_name_1,
		template_name_2, template_name_3], { namespace: 'Template' });

	// ...

	const page_data = await wiki_session.page(page_title);
	/** {Array} parsed page content 頁面解析後的結構。 */
	const parsed = page_data.parse();
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
}

function Wikiapi_register_redirects(template_name, options) {
	function Wikiapi_register_redirects_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		wiki.register_redirects(template_name, (redirect_list, error) => {
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

// Upload a local file directly:
// let result = await wiki_session.upload({ file_path: '/local/file/path',
// comment: '', });
// Upload file from URL:
// let result = await wiki_session.upload({ media_url:
// 'https://media.url/name.jpg', comment: '', });
// Other file_data options: @see
// https://github.com/kanasimi/CeJS/blob/master/application/net/wiki/edit.js#L912
// /options.text/
// filename:'Will set via .file_path or .media_url if not settled.',
// text: '', text: { description: '', source: '', author: '', permission: '',...
// },
// bot: 1, tags:"tag1|tag2", ignorewarnings: 1, ...
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
 * Edit / process pages listing in `page_list`.
 * 
 * @param {Array}page_list
 *            title list or page_data list
 * @param {Function}for_each_page
 *            processor for each page. for_each_page(page_data with contents)
 * @param {Object}[options]
 *            e.g., { summary: '' }<br />
 *            e.g., { no_edit: true, no_warning: true, no_message: true,
 *            allow_empty: true, page_options: { redirects: 1, rvprop:
 *            'ids|content|timestamp|user' } }<br />
 *            no_warning: hide "wiki_API_page: No contents: [[title]]" messages
 *
 * @memberof Wikiapi.prototype
 */
function Wikiapi_for_each_page(page_list, for_each_page, options) {
	function Wikiapi_for_each_page_executor(resolve, reject) {
		const promises = [];
		let error;
		const wiki = this[KEY_wiki_session];
		const work_options = {
			// log_to: log_to,
			// no_edit: true,
			// tags: 'bot trial',
			no_message: options && options.no_edit,

			...options,

			onerror(_error) {
				// console.trace('Get error (onerror): ' + _error);
				if (reject_edit_error(_error => { if (!error) error = _error; }, _error)
					&& options && options.onerror) {
					options.onerror(_error);
				}
			},
			each(page_data/* , messages, config */) {
				try {
					set_page_data_attributes(page_data, wiki);

					if (work_options.will_call_methods) {
						// ** 這邊的操作在 wiki.next() 中會因 .will_call_methods 先執行一次。

						// 因為接下來的操作可能會呼叫 this.next() 本身，
						// 因此必須把正在執行的標記消掉。
						// wiki.running = false;
						// 每次都設定 `wiki.running = false`，在這會出問題:
						// 20200209.「S.P.A.L.」関連ページの貼り換えのbot作業依頼.js
					}
					const result = for_each_page.apply(this, arguments);
					// Promise.isPromise()
					if (CeL.is_thenable(result)) {
						promises.push(result);

						// https://stackoverflow.com/questions/30564053/how-can-i-synchronously-determine-a-javascript-promises-state
						// https://github.com/kudla/promise-status-async/blob/master/lib/promiseState.js
						const fulfilled = Object.create(null);
						// Promise.race([result, fulfilled])
						// .then(v => { status = v === t ? "pending" :
						// "fulfilled" },
						// () => { status = "rejected" });
						Promise.race([result, fulfilled]).then(first_fulfilled => {
							// wiki.running === true
							// console.trace(`wiki.running = ${wiki.running}`);
							if (first_fulfilled === fulfilled) {
								// assert: result is pending
								// e.g.,
								// await
								// wiki.for_each_page(need_check_redirected_list,
								// ...)
								// @ await
								// wiki.for_each_page(vital_articles_list,
								// for_each_list_page, ...)
								// @ 20200122.update_vital_articles.js

								// console.trace('call wiki.next()');
								wiki.next();
							}
						}, () => { /* Do not catch error here. */ });
					}
					// wiki.next() will wait for result.then() calling back
					// if CeL.is_thenable(result).
					// e.g., async function for_each_list_page(list_page_data) @
					// 20200122.update_vital_articles.js
					return result;
				} catch (_error) {
					if (typeof _error === 'object')
						console.error(_error);
					else
						CeL.error('Wikiapi_for_each_page: Catched error: ' + _error);
					if (!error) error = _error;

					// re-throw to wiki.work()
					// throw _error;

					// return Wikiapi.skip_edit;
				}
			},
			// Run after all list items (pages) processed.
			last() {
				// this === options
				// console.trace('last()');
				Promise.allSettled(promises)
					// 提早執行 resolve(), reject() 的話，可能導致後續的程式碼 `options.last`
					// 延後執行，程式碼順序錯亂。
					.catch(_error => { if (!error) error = _error; })
					.then(options && typeof options.last === 'function' && options.last.bind(this))
					// .then(() => { console.trace(
					// 'Wikiapi_for_each_page_executor Promise finished.'); })
					.then(() => {
						if (error) {
							if (options.throw_error)
								reject(error);
							else
								console.error(error);
						}
						resolve(this);
					}, reject);
				// console.trace('Wikiapi_for_each_page_executor finish:');
				// console.log(options);
				// console.log(
				// 'Wikiapi_for_each_page_executor last() finished');
			}
		};
		// 一次取得多個頁面內容，以節省傳輸次數。
		wiki.work(work_options, page_list);
	}

	return new Promise(Wikiapi_for_each_page_executor.bind(this));
}


// --------------------------------------------------------

function Wikiapi_convert_Chinese(text, options) {
	function Wikiapi_convert_Chinese(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		if (typeof options === 'string') {
			options = { uselang: options };
		}
		const site_name = wiki_API.site_name(null, this.append_session_to_options());
		if (/^zh/.test(site_name)) {
			options = this.append_session_to_options(options);
		}

		// using wiki_API.search
		CeL.wiki.convert_Chinese(text, (text, error) => {
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
 * Get featured content.
 * 
 * @param {String|Object}[options]
 *            {String}type (FFA|GA|FA|FL) or options:
 *            {type,on_conflict(FC_title, {from,to})}
 * 
 * @example <caption>Get featured content of current wiki site.</caption>
// <code>
// MUST including wiki.featured_content first to get featured content!
CeL.run('application.net.wiki.featured_content');

//...

const FC_data_hash = await wiki.get_featured_content();
FC_data_hash === wiki.FC_data_hash;
// </code>
 * 
 * @memberof Wikiapi.prototype
 */
function Wikiapi_get_featured_content(options) {
	if (!options || !options.type) {
		const session = this;
		let promise = Promise.resolve();
		Wikiapi_get_featured_content.default_types.forEach(type => {
			promise = promise.then(Wikiapi_get_featured_content.bind(session, { ...options, type }));
		});
		return promise;
	}

	function Wikiapi_get_featured_content_executor(resolve, reject) {
		const wiki = this[KEY_wiki_session];
		wiki.get_featured_content(options, (FC_data_hash) => {
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
 * Get site name / project name of this {Wikiapi}.
 * 
 * @param {String}[language]
 *            language code of wiki session
 * @param {Object}[options]
 *            options to run this function
 * 
 * @returns {String}site name
 * 
 * @example <caption>Get site name of {Wikiapi}.</caption>
// <code>
const wiki = new Wikiapi('en');
console.assert(wiki.site_name() === 'enwiki');
// </code>
 * 
 * @memberof Wikiapi.prototype
 */
function Wikiapi_site_name(language, options) {
	if (language === undefined) {
		// const wiki = this[KEY_wiki_session];
		options = this.append_session_to_options(options);
	}
	return wiki_API.site_name(language, options);
}

// --------------------------------------------------------
// exports

Object.assign(Wikiapi.prototype, {
	append_session_to_options(options) {
		// Object.assign({ [KEY_SESSION]: wiki }, options)
		// return { ...options, [KEY_SESSION]: this[KEY_wiki_session] };
		return wiki_API.add_session_to_options(this[KEY_wiki_session], options);
	},

	site_name: Wikiapi_site_name,
	login: Wikiapi_login,

	query: Wikiapi_query,
	page: Wikiapi_page,
	tracking_revisions: Wikiapi_tracking_revisions,
	edit_page: Wikiapi_edit_page,
	edit(content, options) {
		return this.edit_page(null, content, options);
	},
	move_to: Wikiapi_move_to,
	move_page: Wikiapi_move_page,
	purge: Wikiapi_purge,
	// wrapper
	listen(listener, options) {
		const wiki = this[KEY_wiki_session];
		return wiki.listen(listener, options);
	},

	category_tree: Wikiapi_category_tree,
	search: Wikiapi_search,

	redirects_root: Wikiapi_redirects_root,
	// Warning: 採用 wiki_API.redirects_here(title) 才能追溯重新導向的標的。
	// wiki.redirects() 無法追溯重新導向的標的！
	redirects_here: Wikiapi_redirects_here,
	register_redirects: Wikiapi_register_redirects,

	upload: Wikiapi_upload,

	get_featured_content: Wikiapi_get_featured_content,

	for_each_page: Wikiapi_for_each_page,

	for_each: Wikiapi_for_each,

	data: Wikiapi_data,

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
for (const type of CeL.wiki.list.type_list) {
	// Can not use `= (title, options) {}` !
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
