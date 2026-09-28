/* ONE ROOM CARD (Owner, 28 Sep 2026): U Sathorn's held room was drawn as a narrow, tall card of its own on The Journey — a
   tiny photograph, broken wrapping, empty space beside it — while every other stay draws its rooms as one row. A stay with one
   room is now that same row, and held · selected · not-for-you · open are states of it: only the status line and the action
   change. On My Trip a chosen or held Bangkok room is the one stay card, as for every other stay. Presentation only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { src } from './sandbox.mjs';

const j = src('journeys.html'), y = src('your-journey.html');
const branch = j.slice(j.indexOf('if(!many){box.innerHTML'), j.indexOf('}else\n  box.innerHTML'));

test('THE JOURNEY · a one-room stay is the canonical room row (the Kunming, Lijiang and Souphattra rows\' own classes), never the tall card', () => {
  assert.ok(branch.length > 200, 'the one-room branch exists');
  assert.match(branch, /'<div class="vars">'/); assert.match(branch, /'<div class="var vroom'\+\(on\?' on':''\)\+\(gone\?' gone':''\)/);
  for (const part of ['<a class="vt', '<span class="vbody"><a class="vname"', '<span class="vn">', '<span class="vp">', '<span class="vact">', '<a class="vdet"']) assert.ok(branch.includes(part), part);
  assert.doesNotMatch(branch, /pcard|pcimg|pcbody|aslide/, 'none of the tall card');
  /* the same row as renderRows draws for every other stay */
  const rows = j.slice(j.indexOf('function renderRows'), j.indexOf('function renderRows') + 3000);
  for (const part of ['<div class="var vroom', '<a class="vt', '<span class="vbody"><a class="vname"', '<span class="vact">', '<a class="vdet"']) assert.ok(rows.includes(part), 'renderRows: ' + part);
});

test('THE STATES · held says its room and "Held for you" and offers no Select; selected, not-for-you and open change only the action', () => {
  assert.match(branch, /data-card-state="'\+\(held\?'held':on\?'selected':gone\?'unavailable':'available'\)/);
  assert.match(branch, /\(on\?\(unit\?'<span class="vsel">'\+unit\+'<\/span>':''\)/, 'the held row names its room (Room A)');
  assert.match(branch, /\(on\?'<span class="add vsbtn sel" aria-current="true">&#10003; <span>'\+\(held\?'Held for you':'Selected'\)\+'<\/span><\/span>'/, 'a state, not a button: no Select on a held room');
  assert.match(branch, /:gone\?'<button type="button" class="add vsbtn" disabled aria-disabled="true">'\+\(U\.ctaWords\(win,r\.slug\)\|\|'Sold out'\)/);
  assert.match(branch, /:'<button type="button" class="add vsbtn" data-choose="'\+r\.slug\+'">Select<\/button>'/);
  /* the choice is still made where it always was */
  assert.match(j, /box\.querySelectorAll\('\[data-choose\]'\)\.forEach\(function\(b\)\{\s*b\.addEventListener\('click',function\(e\)\{\s*e\.preventDefault\(\); e\.stopPropagation\(\);\s*select\(win, sk, b\.getAttribute\('data-choose'\), false\);/);
});

test('MY TRIP · a chosen or held Bangkok room is the one stay card — the photographed chooser is shown only while nothing is chosen', () => {
  assert.match(y, /var h='<div id="bkksel">'\+\(line\?'':'<div class="'\+\(many\?'acar ':''\)\+'p-rail-car">/);
  assert.match(y, /aria-label="Next stay"><\/button><\/div><\/div>':''\)\+'<\/div>'\);/);
  assert.match(y, /h\+='<div class="p-card" id="stay-bkk-stay">/, 'the stay card is unchanged');
});
