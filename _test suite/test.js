'use strict';

// load module
const wikiapi = require('../wikiapi.js');

const CeL = global.CeL;
CeL.info('Using CeJS version: ' + CeL.version);

// load modules for test
CeL.run('application.debug.log');

// ============================================================================

/** {ℕ⁰:Natural+0}count of all errors (failed + fatal) */
let all_error_count = 0;
/** {ℕ⁰:Natural+0}all tests count */
let all_tests = 0;
/** {ℕ⁰:Natural+0}tests done */
let test_done = 0;
/** {ℕ⁰:Natural}test start time value */
let test_start_time = Date.now();

function check_tests(recorder, error_count) {
	all_error_count += error_count;
	if (++test_done < all_tests) {
		return;
	}

	// 耗時，經過時間
	let elapsed_message = ' Elapsed time: '
		+ Math.round((Date.now() - test_start_time) / 1000) + ' s.';

	if (all_error_count === 0) {
		CeL.info('check_tests: All ' + all_tests + ' test groups done.' + elapsed_message);
		// normal done. No error.
		return;
	}

	throw new Error('check_tests: All %error@1.' + elapsed_message, all_error_count);
}

function add_tests(test_name, conditions) {
	if (!conditions) {
		// shift arguments: 跳過 test_name。
		conditions = test_name;
		test_name = null;
	}

	all_tests++;
	CeL.test(test_name, conditions, check_tests);
}

// ============================================================================

add_tests('load page', async (assert, setup_test, finish_test) => {
	setup_test('load page: [[w:en:Universe]]');
	let wiki = new wikiapi;
	let page = await wiki.page('Universe');
	// console.log(CeL.wiki.title_link_of('Universe') + ':');
	// console.log(page.wikitext);
	assert(page.wikitext.includes('space]]')
		&& page.wikitext.includes('time]]'), 'wikitext');
	finish_test('load page: [[w:en:Universe]]');
});

// ------------------------------------------------------------------

async function handler_edit_result(test_page_title, test_wikitext, assert, result) {
	if (!result) {
		// edit successed
		// reget page to test.
		const page = await enwiki.page(test_page_title);
		assert(page.wikitext.endsWith(test_wikitext), 'test edit page result');
	} else if (result.edit && result.edit.captcha
		|| result.error && result.error.code === 'globalblocking-ipblocked-range') {
		// IP is blocked.
		CeL.log('Skip blocked edit: ' + result.message);
	} else {
		assert([result.message, 'OK'], 'test edit page result');
	}
}

add_tests('edit page', async (assert, setup_test, finish_test) => {
	setup_test('edit page');
	const test_page_title = 'Project:Sandbox';
	const test_wikitext = '\nTest edit using {{GitHub|kanasimi/wikiapi}}.';
	let bot_name = null;
	let password = null;

	let enwiki = new wikiapi;
	await enwiki.login(bot_name, password, 'en');
	await enwiki.page(test_page_title);

	let result;
	// CeL.set_debug(6);
	try {
		await enwiki.edit((page_data) => {
			// append text
			return page_data.wikitext
				+ test_wikitext;
		}, {
				bot: 1,
				summary: 'Test edit using wikiapi'
			});
		// edit successed
	} catch (error) {
		// failed to edit
		result = error;
	}
	// CeL.set_debug(0);

	handler_edit_result(test_page_title, test_wikitext, assert, result);

	// console.log('Done.');
	finish_test('edit page');
});

// ------------------------------------------------------------------

add_tests('parse page en', async (assert, setup_test, finish_test) => {
	setup_test('parse page en');
	let user_name = null;
	let password = null;

	let enwiki = new wikiapi('en');
	await enwiki.login(user_name, password);
	let page = await enwiki.page('Universe');
	let template_list = [];
	page.parse().each('template',
		(token) => template_list.push(token.name));
	assert(template_list.includes('Infobox'), '[[w:en:Universe]] must includes {{Infobox}}');
	finish_test('parse page en');
});

// ------------------------------------------------------------------

add_tests('parse page zh', async (assert, setup_test, finish_test) => {
	setup_test('parse page zh');
	let zhwiki = new wikiapi('zh');
	let page = await zhwiki.page('宇宙');
	let template_list = [];
	page.parse().each('template',
		(token) => template_list.push(token.name));
	assert(template_list.includes('Infobox'), '[[w:zh:宇宙]] must includes {{Infobox}}');
	finish_test('parse page zh');
});

// ------------------------------------------------------------------

add_tests('read wikidata', async (assert, setup_test, finish_test) => {
	setup_test('read wikidata');
	let wiki = new wikiapi;
	// Q1: Universe
	let page = await wiki.data('Q1');
	assert([CeL.wiki.data.value_of(page.labels.zh), '宇宙'], 'zh label of Q1 is 宇宙');
	finish_test('read wikidata');
});

// ------------------------------------------------------------------

add_tests('read wikidata #2', async (assert, setup_test, finish_test) => {
	setup_test('read wikidata #2');
	let wiki = new wikiapi;
	// P1419: shape
	let data = await wiki.data('Universe', 'P1419');
	// console.log('`shape` of the `Universe`:');
	// console.log(data);
	assert(data.includes('shape of the universe'), '`shape` of the `Universe` is Q1647152 (shape of the universe)');
	finish_test('read wikidata #2');
});

// ------------------------------------------------------------------

add_tests('get list of category', async (assert, setup_test, finish_test) => {
	setup_test('get list of [[w:en:Category:Chemical_elements]]');
	let wiki = new wikiapi;
	let list = await wiki.categorymembers('Chemical elements');
	assert(list.map((page_data) => page_data.title).includes('Iron'), 'Iron is a chemical element');
	finish_test('get list of [[w:en:Category:Chemical_elements]]');
});

