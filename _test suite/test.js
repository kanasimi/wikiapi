﻿'use strict';

// load module
const Wikiapi = require('../wikiapi.js');

const CeL = global.CeL;
CeL.info('Using CeJS version: ' + CeL.version);

// load modules for test
CeL.run(['application.debug.log',
	// gettext(), and for .detect_HTML_language(), .time_zone_of_language()
	'application.locale.gettext'
]);

// ============================================================================

/** {ℕ⁰:Natural+0}count of all errors (failed + fatal) */
let all_error_count = 0;
/** {ℕ⁰:Natural+0}all tests count */
let all_tests = 0;
/** {ℕ⁰:Natural+0}tests done */
let test_done = 0;
/** {ℕ⁰:Natural}test start time value */
const test_start_time = Date.now();


function check_tests(recorder, error_count) {
	all_error_count += error_count;
	++test_done;
	if (test_done < all_tests) {
		return;
	}

	// finish_test

	// 耗時，經過時間
	const elapsed_message = ' Elapsed time: '
		+ Math.round((Date.now() - test_start_time) / 1000) + ' s.';

	if (all_error_count === 0) {
		CeL.info('check_tests: All ' + all_tests + ' test groups done.' + elapsed_message);
		// normal done. No error.
		return;
	}

	CeL.gettext.conversion['error'] = ['no %n', '1 %n', '%d %ns'];
	const error_message = CeL.gettext('All %error@1.', all_error_count) + elapsed_message;
	throw new Error(error_message);
}

function add_test(test_name, conditions) {
	if (!conditions) {
		// shift arguments: 跳過 test_name。
		conditions = test_name;
		test_name = null;
	}

	all_tests++;
	CeL.test(test_name, conditions, check_tests);
}

// ============================================================================

add_test('load page', async (assert, setup_test, finish_test) => {
	const wiki = new Wikiapi;
	let page_data;

	setup_test('load page: [[w:en:Universe]]');
	page_data = await wiki.page('Universe');
	// console.log(CeL.wiki.title_link_of(page_data) + ':');
	// console.log(page_data.wikitext);
	assert(page_data.wikitext.includes('space]]')
		&& page_data.wikitext.includes('time]]'), 'load page: wikitext');
	finish_test('load page: [[w:en:Universe]]');

	setup_test('load page: [[w:en:Earth]]');
	page_data = await wiki.page('Earth', {
		revisions: 2
	});
	// console.log(CeL.wiki.title_link_of(page_data) + ':');
	// console.log(page_data.revisions);
	assert([page_data.revisions.length, 2], 'load page: revisions.length');
	assert([page_data.wikitext, page_data.revision(0)], 'load page: revision(0)');
	assert(page_data.wikitext !== page_data.revision(1), 'load page: revision(1)');
	finish_test('load page: [[w:en:Earth]]');
});

add_test('load page of other wiki', async (assert, setup_test, finish_test) => {
	const wiki = new Wikiapi('https://awoiaf.westeros.org/api.php');
	let page_data;

	setup_test('load page of other wiki: [[Game of Thrones]]');
	page_data = await wiki.page('Game of Thrones');
	// console.log(page_data.wikitext);
	assert(page_data.wikitext.includes('[[es:Game of Thrones]]'), 'load page: wikitext of [[Game of Thrones]]');
	finish_test('load page of other wiki: [[Game of Thrones]]');
});

// ------------------------------------------------------------------

function edit_blocked(result) {
	// @see wiki_API.edit @ wiki.js
	return result.edit && result.edit.captcha
		|| result.error && result.error.code === 'globalblocking-ipblocked-range';
}

function handle_edit_error(assert, result) {
	const result = error.result;
	if (edit_blocked(result)) {
		// IP is blocked.
		CeL.log('Skip blocked edit: ' + result.message);
		return;
	}

	assert([error.message, 'OK'], 'test edit page result');
}

add_test('edit page', async (assert, setup_test, finish_test) => {
	setup_test('edit page');
	const test_page_title = 'Project:Sandbox';
	const test_wikitext = '\nTest edit using {{GitHub|kanasimi/wikiapi}}.';
	const bot_name = null;
	const password = null;

	const enwiki = new Wikiapi;
	await enwiki.login(bot_name, password, 'en');
	await enwiki.page(test_page_title);

	// CeL.set_debug(6);
	try {
		await enwiki.edit((page_data) => {
			// append text
			return page_data.wikitext
				+ test_wikitext;
		}, {
			bot: 1,
			summary: 'Test edit using wikiapi module'
		});

		// edit successed
		// reget page to test.
		const page_data = await enwiki.page(test_page_title);
		assert(page_data.wikitext.endsWith(test_wikitext), 'test edit page result');
	} catch (error) {
		// failed to edit
		handle_edit_error(assert, error);
	}
	// CeL.set_debug(0);

	// console.log('Done.');
	finish_test('edit page');
});

add_test('edit page #2', async (assert, setup_test, finish_test) => {
	setup_test('edit page #2');
	const test_page_title = 'Wikipedia:沙盒';
	const test_wikitext = '\nTest edit using {{GitHub|kanasimi/wikiapi}} #2.';
	const bot_name = null;
	const password = null;

	const zhwiki = new Wikiapi;
	await zhwiki.login(bot_name, password, 'zh');

	// CeL.set_debug(6);
	try {
		await zhwiki.edit_page(test_page_title, (page_data) => {
			// append text
			return page_data.wikitext
				+ test_wikitext;
		}, {
			bot: 1,
			summary: 'Test edit using wikiapi module'
		});

		// edit successed
		// reget page to test.
		const page_data = await zhwiki.page(test_page_title);
		assert(page_data.wikitext.endsWith(test_wikitext), 'test edit page result');
	} catch (result) {
		// failed to edit
		handle_edit_error(assert, result);
	}
	// CeL.set_debug(0);

	// console.log('Done.');
	finish_test('edit page #2');
});

// ------------------------------------------------------------------

add_test('parse page: en', async (assert, setup_test, finish_test) => {
	setup_test('parse page: en');
	const user_name = null;
	const password = null;

	const enwiki = new Wikiapi('en');
	await enwiki.login(user_name, password);
	const page_data = await enwiki.page('Human');
	const template_list = [];
	page_data.parse().each('template',
		(token) => template_list.push(token.name));
	assert(template_list.includes('Speciesbox'), '[[w:en:Human]] must includes {{Speciesbox}}');
	finish_test('parse page: en');
});

// ------------------------------------------------------------------

add_test('parse page: zh', async (assert, setup_test, finish_test) => {
	setup_test('parse page: zh');
	// Usage with other language
	const zhwiki = new Wikiapi('zh');
	const page_data = await zhwiki.page('宇宙');
	const template_list = [];
	page_data.parse().each('template',
		(token) => template_list.push(token.name));
	assert(template_list.includes('Infobox'), '[[w:zh:宇宙]] must includes {{Infobox}}');
	finish_test('parse page: zh');
});

// ------------------------------------------------------------------

add_test('move page', async (assert, setup_test, finish_test) => {
	setup_test('move page: testwiki');
	const testwiki = new Wikiapi('test');

	const move_from_title = 'move test from';
	const move_to_title = 'move test to';
	const reason = 'move test';
	let result;
	try {
		await testwiki.page(move_from_title);
		result = await testwiki.move_to(move_to_title, { reason: reason, noredirect: true, movetalk: true });
		// revert
		await testwiki.page(move_to_title);
		await testwiki.move_to(move_from_title, { reason: reason, noredirect: true, movetalk: true });

		assert([result.from, move_from_title], 'move page from: [[testwiki:' + move_from_title + ']]');
		assert([result.to, move_to_title], 'move page to: [[testwiki:' + move_to_title + ']]');
	} catch (e) {
		if (e.code !== 'missingtitle' && e.code !== 'articleexists') {
			if (e.code) {
				CeL.error('[' + e.code + '] ' + e.info);
			} else {
				console.trace(e);
			}
		}
		assert(e === 'No csrftoken specified'
			|| e.code && e.code !== 'missingtitle' && e.code !== 'articleexists',
			'move page from: [[testwiki:' + move_from_title + ']]');
	}

	finish_test('move page: testwiki');
});


// ------------------------------------------------------------------

add_test('purge page', async (assert, setup_test, finish_test) => {
	setup_test('purge page: meta');
	const metawiki = new Wikiapi('meta');

	let page_data = await metawiki.purge('Project:Sandbox');
	// [ { ns: 4, title: 'Meta:Sandbox', purged: '' } ]
	assert(page_data.title === 'Meta:Sandbox' && ('purged' in page_data), 'purge page: [[meta:Project:Sandbox]]');

	// -----------------------------------

	await metawiki.page('Meta:Babel');
	page_data = await metawiki.purge({
		multi: true
	});
	// You may also using:
	// page_data = await testwiki.purge(/* no options */);

	// console.log(page_data);
	assert(Array.isArray(page_data) && page_data.length === 1, 'purge page: [[meta:Meta:Babel]]: multi return {Array}');
	page_data = page_data[0];
	assert(page_data.title === 'Meta:Babel' && ('purged' in page_data), 'purge page: [[meta:Meta:Babel]]');

	finish_test('purge page: meta');
});

// ------------------------------------------------------------------

add_test('read wikidata', async (assert, setup_test, finish_test) => {
	setup_test('read wikidata');
	const wiki = new Wikiapi;
	// Q1: Universe
	const page_data = await wiki.data('Q1', {
		props: 'labels|sitelinks'
	});
	// CeL.info('page:');
	// console.log(page);

	// Work with other language
	assert([CeL.wiki.data.value_of(page_data.labels.zh), '宇宙'], 'zh label of Q1 is 宇宙');
	finish_test('read wikidata');
});

// ------------------------------------------------------------------

add_test('read wikidata #2', async (assert, setup_test, finish_test) => {
	setup_test('read wikidata #2');
	const wiki = new Wikiapi;
	// P1419: shape
	const data = await wiki.data('Universe', 'P1419');
	// console.log('`shape` of the `Universe`:');
	// console.log(data);
	assert(data.includes('shape of the universe'), '`shape` of the `Universe` is Q1647152 (shape of the universe)');
	finish_test('read wikidata #2');
});

// ------------------------------------------------------------------

add_test('get list of categorymembers', async (assert, setup_test, finish_test) => {
	setup_test('get list of [[w:en:Category:Chemical_elements]]');
	const wiki = new Wikiapi;
	const list = await wiki.categorymembers('Chemical elements');
	assert(list.map((page_data) => page_data.title).includes('Iron'), 'Iron is a chemical element');
	finish_test('get list of [[w:en:Category:Chemical_elements]]');
});

// ------------------------------------------------------------------

add_test('get pages transclude specified template', async (assert, setup_test, finish_test) => {
	setup_test('get pages transclude {{w:en:Periodic table}}');
	const wiki = new Wikiapi;
	const list = await wiki.embeddedin('Template:Periodic table');
	assert(list.map((page_data) => page_data.title).includes('Periodic table'), '[[w:en:Periodic table]] transclude {{w:en:Periodic table}}');
	finish_test('get pages transclude {{w:en:Periodic table}}');
});

// ------------------------------------------------------------------

add_test('get list of categorymembers using for_each', async (assert, setup_test, finish_test) => {
	setup_test('get list of [[w:en:Category:Wikimedia Cloud Services]] using for_each');

	const wiki = new Wikiapi('en');
	let has_category_count = 0;
	const page_list_proto = await wiki.for_each('categorymembers', 'Wikimedia Cloud Services', async (category) => {
		const page_data = await wiki.page(category);
		const parsed = page_data.parse();
		const to_exit = parsed.each.exit;
		// console.log(page_data.revisions[0].slots.main['*']);
		// console.log(parsed);
		parsed.each('category', (token) => {
			if (token.name === 'Wikimedia Cloud Services') {
				has_category_count++;
				return to_exit;
			}
		});
	});
	// console.log(page_list_proto);
	// console.log([page_list_proto.length, has_category_count]);

	assert([page_list_proto.length, has_category_count], 'Count of [[w:en:Category:Wikimedia Cloud Services]] using for_each');
	finish_test('get list of [[w:en:Category:Wikimedia Cloud Services]] using for_each');
});

add_test('get list of categorymembers using for_each_page', async (assert, setup_test, finish_test) => {
	setup_test('get list of [[w:en:Category:Wikimedia Cloud Services]] using for_each_page');

	const wiki = new Wikiapi('en');
	let has_category_count = 0;
	const page_list = await wiki.categorymembers('Wikimedia Cloud Services');
	await wiki.for_each_page(page_list, (page_data) => {
		const parsed = page_data.parse();
		// console.log(parsed);
		assert([page_data.wikitext, parsed.toString()], 'wikitext parser check');
		let has_category;
		parsed.each('category', (token) => {
			if (token.name === 'Wikimedia Cloud Services') {
				has_category = true;
			}
		});
		if (has_category) {
			has_category_count++;
		}
	});
	// console.log([page_list.length, has_category_count]);

	assert([page_list.length, has_category_count], 'Count of [[w:en:Category:Wikimedia Cloud Services]] using for_each_page');
	finish_test('get list of [[w:en:Category:Wikimedia Cloud Services]] using for_each_page');
});

// ------------------------------------------------------------------

add_test('list category tree', async (assert, setup_test, finish_test) => {
	setup_test('list category tree: Countries in North America');

	const enwiki = new Wikiapi('en');
	const page_list = await enwiki.category_tree('Countries in North America', 1);
	assert(page_list.some(page_data => page_data.title === 'United States'), 'list category tree: [[Category:Countries in North America]] must includes [[United States]]');
	assert('Mexico' in page_list.subcategories, 'list category tree: [[Category:Mexico]] is a subcategory of [[Category:Countries in North America]]');
	finish_test('list category tree: Countries in North America');
});

// ------------------------------------------------------------------

add_test('search key', async (assert, setup_test, finish_test) => {
	setup_test('search key: 霍金');

	const zhwikinews = new Wikiapi('zh.wikinews');
	const page_list = await zhwikinews.search('"霍金"');
	assert(page_list.some(page_data => page_data.title === '霍金访问香港'), 'search key: "霍金" must includes [[n:zh:霍金访问香港]]');
	finish_test('search key: 霍金');
});
