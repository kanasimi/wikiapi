'use strict';

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
		CeL.info(`check_tests: All ${all_tests} test group(s) done.${elapsed_message}`);
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

// Just for test
delete CeL.wiki.query.default_maxlag;

add_test('load page', async (assert, setup_test, finish_test) => {
	const enwiki = new Wikiapi;
	let page_data;

	setup_test('load page: [[w:en:Universe]]');
	assert(['enwiki', enwiki.site_name()], '.site_name() #1');
	assert(['zhwiki', enwiki.site_name('zh')], '.site_name() #2');

	page_data = await enwiki.page('Universe');
	// console.log(CeL.wiki.title_link_of(page_data) + ':');
	// console.log(page_data.wikitext);
	assert(page_data.wikitext.includes('space]]')
		&& page_data.wikitext.includes('time]]'), 'load page: wikitext');
	finish_test('load page: [[w:en:Universe]]');

	setup_test('load page: [[w:en:Earth]]');
	page_data = await enwiki.page('Earth', {
		revisions: 2
	});
	// console.log(CeL.wiki.title_link_of(page_data) + ':');
	// console.log(page_data.revisions);
	assert([page_data.revisions.length, 2], 'load page: revisions.length');
	assert([page_data.wikitext, page_data.revision(0)], 'load page: revision(0)');
	assert(page_data.wikitext !== page_data.revision(1), 'load page: revision(1)');

	const redirects_taregt = await enwiki.redirects_root('WP:SB');
	assert(['Wikipedia:Sandbox', redirects_taregt], '.redirects_root()');
	const redirects_list = await enwiki.redirects_here('WP:SB');
	assert(['WP:SB', redirects_list.query_title], '.redirects_here() #1');
	assert(redirects_list.length > 1, '.redirects_here() #2');
	assert(['Wikipedia:Sandbox', redirects_list[0].title], '.redirects_here() #3');

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

function normally_blocked_edit(result) {
	// @see wiki_API.edit @ wiki.js
	return result.edit && result.edit.captcha
		// e.g., [[m:NOP|Open Proxy]] is blocked.
		|| result.error && (result.error.code === 'globalblocking-ipblocked-range' || result.error.code === 'wikimedia-globalblocking-ipblocked-range');
}

function handle_edit_error(assert, error) {
	const result = error.result;
	if (normally_blocked_edit(result)) {
		CeL.log(`handle_edit_error: Skip blocked edit: ${result.message || result.error && result.error.code || JSON.stringify(result)}`);
		return;
	}

	assert(error.message === '[blocked] You have been blocked from editing.'
		|| error.message === 'OK', 'test edit page result');
}

add_test('edit page', async (assert, setup_test, finish_test) => {
	setup_test('edit page');
	const test_page_title = 'Project:Sandbox';
	const test_wikitext = '\nTest edit using {{GitHub|kanasimi/wikiapi}}.';
	const bot_name = null;
	const password = null;

	const enwiki = new Wikiapi;
	await enwiki.login({ user_name: bot_name, password, API_URL: 'en' });
	const query_result = await enwiki.query({ action: 'query', meta: 'userinfo' });
	if (password) {
		assert([bot_name, query_result?.query?.userinfo?.name], 'test wiki.query()');
	} else {
		assert(['' in query_result?.query?.userinfo?.anon], 'test wiki.query()');
	}

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
	await zhwiki.login(bot_name, password, { API_URL: 'zh' });

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
	await enwiki.login(user_name, password/*, 'en' */);
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

add_test('featured content: en', async (assert, setup_test, finish_test) => {
	setup_test('featured content: en');
	CeL.run('application.net.wiki.featured_content');
	// Usage with other language
	const enwiki = new Wikiapi('en');
	// get only type: featured article
	enwiki.get_featured_content.default_types = ['FA'];
	// FC_data_hash === wiki.FC_data_hash[page_title]
	const FC_data_hash = await enwiki.get_featured_content({
		// get only type: featured article
		// type: 'FA',
		on_conflict(FC_title, data) {
			CeL.warn(`Category conflict: ${data.from}→${CeL.wiki.title_link_of('Category:' + data.category, data.to)}`);
		}
	});
	assert(FC_data_hash['Sun'].type === 'FA', '[[w:en:Sun]] is featured article');

	// cache alias of {{Article history}}
	const Article_history_alias = (await enwiki.redirects_here('Template:Article history'))
		.map(page_data => page_data.title
			// remove "Template:" prefix
			.replace(/^[^:]+:/, ''));

	await enwiki.for_each_page(Object.keys(FC_data_hash).filter((title) => 'FA' === FC_data_hash[title].type).slice(0, 4), async (page_data) => {
		const talk_page_data = await enwiki.page(enwiki.to_talk_page(page_data));
		let has_Article_history;
		talk_page_data.parse().each('template',
			(token) => { if (Article_history_alias.includes(token.name)) has_Article_history = true; });
		assert(has_Article_history, `${CeL.wiki.title_link_of(talk_page_data)} has {{ArticleHistory}}`);
	});
	finish_test('featured content: en');
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
		result = await testwiki.move_page(move_from_title, move_to_title, { reason: reason });
		assert([result.to, move_to_title], `move page: [[testwiki:${move_from_title}]]→[[testwiki:${move_to_title}]]`);


		await testwiki.page(move_from_title);
		result = await testwiki.move_to(move_to_title, { reason: reason, noredirect: true, movetalk: true });
		// revert
		await testwiki.page(move_to_title);
		await testwiki.move_to(move_from_title, { reason: reason, noredirect: true, movetalk: true });

		assert([result.from, move_from_title], `move page from: [[testwiki:${move_from_title}]]`);
		assert([result.to, move_to_title], `move page to: [[testwiki:${move_to_title}]]`);

	} catch (e) {
		if (e.code !== 'missingtitle' && e.code !== 'articleexists') {
			if (e.code) {
				CeL.error(`[${e.code}] ${e.info}`);
			} else {
				console.trace(e);
			}
		}
		assert(e === 'No csrftoken specified'
			|| e.code && e.code !== 'missingtitle' && e.code !== 'articleexists',
			`move page from: [[testwiki:${move_from_title}]]`);
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

add_test('繁簡轉換', async (assert, setup_test, finish_test) => {
	setup_test('繁簡轉換');
	const wiki = new Wikiapi;
	assert(['中國', await wiki.convert_Chinese('中国', { uselang: 'zh-hant' })], '繁簡轉換: 中国');
	assert(['中国', await wiki.convert_Chinese('中國', { uselang: 'zh-hans' })], '繁簡轉換: 中國');
	assert(['繁体,简体', (await wiki.convert_Chinese(['繁體', '簡體'], { uselang: 'zh-hans' })).join()], '繁簡轉換: {Array}');
	finish_test('繁簡轉換');
});

// ------------------------------------------------------------------

add_test('tracking revisions to lookup what revision had added "an international team led by scientists"', async (assert, setup_test, finish_test) => {
	setup_test('tracking revisions to lookup what revision had added "an international team led by scientists"');
	const wiki = new Wikiapi('en.wikinews');
	// trace https://en.wikinews.org/w/index.php?title=Study_suggests_Mars_hosted_life-sustaining_habitat_for_millions_of_years&diff=4434584&oldid=4434582
	const newer_revision = await wiki.tracking_revisions('Study suggests Mars hosted life-sustaining habitat for millions of years', 'an international team led by scientists');
	assert([4434584, p.revid], 'tracking revisions: Get the revid added the text');
	assert(newer_revision.diff_list[0][0].includes('a team led by scientists'), 'tracking revisions: Get the text removed');
	assert(newer_revision.diff_list[0][1].includes('an international team led by scientists'), 'tracking revisions: Get the text added');
	finish_test('tracking revisions to lookup what revision had added "an international team led by scientists"');
});

add_test('tracking revisions to lookup what revision had added "金星快车效果图"', async (assert, setup_test, finish_test) => {
	setup_test('tracking revisions to lookup what revision had added "金星快车效果图"');
	const wiki = new Wikiapi('zh.wikinews');
	// trace https://zh.wikinews.org/w/index.php?title=%E9%87%91%E6%98%9F%E5%BF%AB%E8%BD%A6%E5%8F%91%E5%9B%9E%E4%BA%91%E5%B1%82%E7%85%A7%E7%89%87&diff=12260&oldid=12259
	const newer_revision = await wiki.tracking_revisions('金星快车发回云层照片', '金星快车效果图');
	assert([12260, p.revid], 'tracking revisions: Get the revid added the text');
	assert(['[[Image:Venus_express.jpg|thumb|200px|金星快车效果图]]', newer_revision.diff_list[0][1]], 'tracking revisions: Get the text added');
	finish_test('tracking revisions to lookup what revision had added "金星快车效果图"');
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
	assert('Mexico' in page_list[Wikiapi.KEY_subcategories], 'list category tree: [[Category:Mexico]] is a subcategory of [[Category:Countries in North America]]');
	finish_test('list category tree: Countries in North America');
});

// ------------------------------------------------------------------

add_test('search pages include key', async (assert, setup_test, finish_test) => {
	setup_test('search pages include key: 霍金');

	const zhwikinews = new Wikiapi('zh.wikinews');
	const page_list = await zhwikinews.search('"霍金"');
	assert(page_list?.some(page_data => page_data?.title === '霍金访问香港'), 'search pages include key: "霍金" must includes [[n:zh:霍金访问香港]]');
	finish_test('search pages include key: 霍金');
});

// ------------------------------------------------------------------

add_test('query MediaWiki API manually', async (assert, setup_test, finish_test) => {
	setup_test('query MediaWiki API manually');
	const wiki = new Wikiapi('mediawiki');
	const results = await wiki.query({
		action: "flow-parsoid-utils",
		content: "<b>bold</b> &amp; <i>italic</i>",
		title: "MediaWiki", from: "html", to: "wikitext"
	});
	assert(["'''bold''' & ''italic''", results['flow-parsoid-utils']?.content], 'query MediaWiki API manually: flow-parsoid-utils');
	finish_test('query MediaWiki API manually');
});
