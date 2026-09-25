/* EDIT 7 FINAL CORRECTION (Owner, 25 Sep 2026): the menu is a panel, not a page; it carries no Cherry point; the site footer
   closes with the same language and currency choice as the menu — one preference, never two. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { src } from './sandbox.mjs';

test('THE MENU IS A PANEL · fixed to the right, a bounded width at every class, scrolling inside itself, over the scrim — never inset: 0', () => {
  const css = src('assets/aman.css');
  const block = css.slice(css.indexOf('.a-menu {'), css.indexOf('body.a-open { overflow: hidden; }'));
  assert.doesNotMatch(block, /\.a-menu \{[^}]*inset: 0/, 'the menu no longer covers the whole screen');
  assert.match(block, /position: fixed; top: 0; right: 0; bottom: 0; left: auto;/);
  assert.match(block, /width: min\(86vw, 440px\)/, 'phone');
  assert.match(block, /@media \(min-width: 600px\) \{ \.a-menu \{ --a-gut: 36px; width: min\(72vw, 480px\); \} \}/, 'tablet');
  assert.match(block, /@media \(min-width: 900px\) \{ \.a-menu \{ --a-gut: 48px; width: min\(46vw, 560px\); \} \}/, 'desktop');
  assert.match(block, /overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain;/, 'taller than the screen: it scrolls inside itself');
  assert.match(css, /\.a-scrim \{ position: fixed; inset: 0;/, 'the page stays visible beneath the scrim');
  /* the page never moves when the menu opens or closes */
  const js = src('assets/aman.js');
  assert.match(js, /if \(open && keptY === null\) keptY = window\.scrollY;/);
  assert.match(js, /if \(!open && keptY !== null\) \{ var y = keptY;/);
});

test('NO CHERRY POINT IN THE MENU · neither the ::before beside the current page nor the ::after beneath it survives; the current page is the quieter word', () => {
  const css = src('assets/aman.css');
  assert.doesNotMatch(css, /\.a-menu a\[aria-current\]::before/);
  assert.doesNotMatch(css, /\.a-mrow > a\[aria-current\]::after/);
  assert.doesNotMatch(css, /\.a-menu[^{]*\{[^}]*var\(--cherry\)[^}]*\}/, 'no menu rule paints Cherry');
  assert.match(css, /\.a-mrow > a\[aria-current\] \{ color: var\(--a-mute\); \}/);
  assert.doesNotMatch(css, /\.a-mrow > a\[aria-current\] \{ color: var\(--a-ink\)/, 'the old override is gone');
});

test('THE FOOTER CLOSES WITH LANGUAGE AND CURRENCY · both footer builders, after the legal line, the menu\'s own [data-prefs] block — the same siyl.lang / siyl.cur', () => {
  for (const f of ['assets/shop-menu.js', 'assets/recon.js']) {
    const s = src(f);
    const at = s.indexOf('sf-legal'), pr = s.indexOf('<div class="sf-prefs" data-prefs>');
    assert.ok(at > 0 && pr > at, f + ': the choice is the footer\'s last row');
    assert.match(s, /'<div class="sf-prefs" data-prefs>' \+ \(window\.SIYL_I18N \? window\.SIYL_I18N\.prefsHtml\(\) : ''\) \+ '<\/div>'/, f);
    assert.doesNotMatch(s, /localStorage/, f + ' keeps no preference of its own');
  }
  const rt = src('src/i18n-runtime.js');
  assert.match(rt, /var LANGS = \['en', 'th'\], KEY = 'siyl\.lang', CKEY = 'siyl\.cur';/);
  assert.match(rt, /function paintPrefs\(\) \{ var els = document\.querySelectorAll\('\[data-prefs\]'\);/, 'every [data-prefs] is painted from the one state');
  assert.match(src('assets/aman.js'), /<div data-prefs>' \+ window\.SIYL_I18N\.prefsHtml\(\)/, 'the menu shows the same block');
  const css = src('assets/aman.css');
  assert.match(css, /\.sfoot-in, \.sfoot \.sf-legal, \.sfoot \.sf-prefs \{ max-width: var\(--a-frame\);/, 'inside the footer\'s frame');
  assert.match(css, /\.sfoot \.sf-prefs\{max-width:var\(--a-frame\);margin:0 auto;/, 'the same frame at every width — never a narrower fixed column (1920: the row stood 50 px inside the wall)');
});
