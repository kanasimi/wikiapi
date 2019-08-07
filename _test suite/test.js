'use strict';

// load module
const wikiapi = require('../wikiapi.js');

const CeL = global.CeL;
CeL.info('Using CeL version: ' + CeL.version);

// load modules for test
CeL.run('application.debug.log');

CeL.test('load page', async (assert) => {
	let wiki = new wikiapi;
	let page = await wiki.page('Universe');
	assert(page.wikitext.includes('space]]')
		&& page.wikitext.includes('time]]'), 'wikitext');
});

CeL.test('edit page', async (assert) => {
	const test_page_title = 'Project:Sandbox';
	const test_wikitext = '\nTest edit using {{GitHub|kanasimi/wikiapi}}.';
	let bot_name = null;
	let password = null;

	let enwiki = new wikiapi;
	await enwiki.login(bot_name, password, 'en');
	await enwiki.page(test_page_title);
	await enwiki.edit((page_data) => {
		// append text
		return page_data.wikitext
			+ test_wikitext;
	}, {
			bot: 1,
			summary: 'Test edit using wikiapi'
		});

	let page = await enwiki.page(test_page_title);
	assert(page.wikitext.endsWith(test_wikitext), 'test edit page result');
	// console.log('Done.');
});

CeL.test('parse page', async (assert) => {
	let user_name = null;
	let password = null;

	let zhwiki = new wikiapi('zh');
	await zhwiki.login(user_name, password);
	let page = await zhwiki.page('Universe');
	let template_list = [];
	page.parse().each('template',
		(token) => template_list.push(token.name));
	assert(template_list.includes('Infobox'), '[[Universe]] must includes {{Infobox}}');
});

CeL.test('read wikidata', async (assert) => {
	let wiki = new wikiapi;
	// Q1: Universe
	let page = await wiki.data('Q1');
	assert([CeL.wiki.data.value_of(page.labels.zh), '宇宙'], 'zh label of Q1 is 宇宙');
});

CeL.test('read wikidata #2', async (assert) => {
	let wiki = new wikiapi;
	// P1419: shape
	let data = await wiki.data('Universe', 'P1419');
	assert(data.includes('shape of the universe'), '`shape` of the `Universe` is Q1647152 (shape of the universe)');
});

CeL.test('get list of [[w:en:Category:Chemical_elements]]', async (assert) => {
	let wiki = new wikiapi;
	let list = await wiki.categorymembers('Chemical elements');
	assert(list.map((page_data) => page_data.title).includes('Iron'), 'Iron is a chemical element');
});
