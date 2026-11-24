import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../docs/camera-lives.js',import.meta.url),'utf8');
const sql=readFileSync(new URL('../supabase/migrations/20261124200005_connect_live_interactions.sql',import.meta.url),'utf8');
test('LIVE interaction source parses and uses protected RPC',()=>{assert.doesNotThrow(()=>new Function(js));assert.match(js,/connect_live_interact/);assert.match(js,/stopInteractions\(\)/);assert.match(js,/esc\(c\.body\)/);assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on function public\.connect_live_interact/);});
