import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../docs/camera-lives.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261124200005_connect_live_interactions.sql',import.meta.url),'utf8');
test('LIVE interaction source parses and uses protected RPC',()=>{assert.doesNotThrow(()=>new Function(js));assert.match(js,/connect_live_interact/);assert.match(js,/stopInteractions\(\)/);assert.match(js,/esc\(c\.body\)/);assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on function public\.connect_live_interact/);});

test('LIVE video and interactions are one overlay stage',()=>{const css=readFileSync(new URL('../docs/live-explore.css',import.meta.url),'utf8');const viewer=js.slice(js.indexOf('function viewer(){'),js.indexOf('function discoveryResults'));assert.match(viewer,/camera-live-stage connect-live-overlay/);assert.match(viewer,/cameraLiveVideos/);assert.match(viewer,/liveSocial\(tools\)/);assert.match(js,/stack\.appendChild\(node\)/);assert.match(js,/list\.scrollTop=list\.scrollHeight/);assert.match(css,/connect-live-overlay \.camera-live-grid\s*\{\s*position:absolute/);assert.match(css,/connect-live-overlay \.connect-live-social\s*\{\s*position:absolute/);assert.doesNotMatch(viewer,/camera-live-security/);});

test('studio uses server actions for guests, staff, filters and PK',()=>{for(const term of ['connect_live_studio','guest_request','guest_approve','guest_remove','staff_add','match_start','match_end','studio-pin','connectLiveWordsForm'])assert.ok(js.includes(term),term);assert.match(js,/Reações gratuitas, sem cobrança/);assert.match(js,/if\(await studioCall\('words'/);});
