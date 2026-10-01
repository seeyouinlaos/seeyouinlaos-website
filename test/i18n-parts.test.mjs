/* A BLOCK OF PARTS IS NEVER ONE SENTENCE (1 Oct 2026 · the Thai "Sent to us" block on The Journey): the Thai runtime replaces a
   block whose children are all inline as ONE sentence — right for "It is <b>not</b> …", wrong for a block of separate parts (a state
   label, a room name, its occupancy). Marked data-i18n-parts, such a block is translated part by part and keeps its elements, so its
   lines never run together. English is untouched. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { src } from './sandbox.mjs';

test('the runtime honours data-i18n-parts before the whole-sentence path; every stay-state block on The Journey carries it', () => {
  const rt = src('src/i18n-runtime.js'), built = src('assets/i18n/siyl-i18n.js');
  for (const s of [rt, built]) assert.match(s, /if \(el\.hasAttribute\('data-i18n-parts'\)\) return false;\s*if \(el\.querySelector\('a,button,input,select,textarea,img,svg,\[data-i18n-skip\]'\)\) return false;/);
  const j = src('journeys.html');
  assert.equal((j.match(/<p class="stsel">/g) || []).length, 0, 'no stay-state block without the marker');
  assert.equal((j.match(/<p class="stsel" data-i18n-parts>/g) || []).length, 3);
});
