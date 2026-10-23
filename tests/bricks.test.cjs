const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../brick-engine.js');
for (const [index, level] of G.levels.entries()) {
  test(`bricks: ${level.id} delivers through the complete pipeline`, () => {
    const result = G.run(index, level.recipe, { approved: true });
    assert.equal(result.status, 'success', result.message);
    assert.equal(result.kind, level.target);
    assert.equal(result.stars, 3);
    assert.equal(result.trace.length, level.recipe.length);
  });
}
test('brick order affects execution; reversed codec stops at the first incompatible port', () => {
  const result = G.run(0, ['decode', 'tokenize']);
  assert.equal(result.status, 'error'); assert.equal(result.index, 0);
  assert.equal(result.code, 'type'); assert.equal(result.trace.length, 0);
});
test('matching output alone does not meet the model-building goal', () => {
  assert.equal(G.run(3, ['tokenize', 'decode']).code, 'goal');
  assert.equal(G.run(0, []).code, 'empty');
});
test('attention consumes actual vectors and changes the contextual row', () => {
  const plain = G.run(1, G.levels[1].recipe).data.rows;
  const mixed = G.run(2, G.levels[2].recipe).data.rows;
  assert.equal(mixed.length, 2); assert.notDeepEqual(plain, mixed);
  assert.ok(mixed.flat().every(Number.isFinite));
});
test('a timeout cannot be passed off as a successful tool result', () => {
  const result = G.run(5, ['instructions', 'model', 'query', 'reply']);
  assert.equal(result.code, 'timeout');
  assert.equal(result.trace.some(step => step.part === 'reply'), false);
});
test('text claiming completion is not accepted as tool evidence', () => {
  assert.equal(G.run(4, ['pretend']).status, 'error');
  assert.equal(G.run(6, ['pretend']).status, 'error');
});
test('approval pauses before any refund and does not grant success', () => {
  const result = G.run(6, G.levels[6].recipe);
  assert.equal(result.status, 'approval');
  assert.equal(result.trace.at(-1).part, 'approval');
  assert.equal(result.trace.some(step => step.part === 'refund'), false);
  assert.equal(result.stars, undefined);
});
test('missing state ledger exposes duplicate refund even after approval', () => {
  const result = G.run(6, G.levels[6].recipe.filter(id => id !== 'memory'), { approved: true });
  assert.equal(result.code, 'duplicate'); assert.equal(result.data.executions, 2);
});
test('matching call interfaces still require the correct tool name', () => {
  const result = G.run(7, ['instructions', 'model', 'query']);
  assert.equal(result.status, 'error'); assert.match(result.message, /web.search/);
});
test('research requires continuing to a second cited source', () => {
  const result = G.run(7, G.levels[7].recipe.filter(id => id !== 'retry'));
  assert.equal(result.code, 'evidence');
});
test('code delivery must observe failure, repair, and retest', () => {
  const result = G.run(8, G.levels[8].recipe);
  const tests = result.trace.filter(step => step.part === 'tests');
  assert.match(tests[0].value, /2 \/ 3/); assert.match(tests[1].value, /3 \/ 3/);
  assert.equal(G.run(8, ['instructions', 'model', 'workspace', 'tests', 'verify']).code, 'tests');
  assert.equal(G.run(8, ['instructions', 'model', 'workspace', 'tests', 'patch', 'verify']).code, 'type');
});
test('hinted and redundant machines earn two stars without penalizing failures', () => {
  assert.equal(G.run(0, G.levels[0].recipe, { hinted: true }).stars, 2);
  assert.equal(G.run(0, ['tokenize', 'decode', 'tokenize', 'decode']).stars, 2);
  G.run(0, ['decode']);
  assert.equal(G.run(0, G.levels[0].recipe).stars, 3);
});
test('first six levels unlock in order, then all business islands unlock together', () => {
  assert.equal(G.unlocked({}), 0);
  assert.equal(G.unlocked({ codec: 3 }), 1);
  assert.equal(G.unlocked(Object.fromEntries(G.levels.slice(0,6).map(l => [l.id, 3]))), 8);
});
test('invalid levels and over-budget builds stop without executing', () => {
  assert.equal(G.run(999, []).status, 'error');
  assert.equal(G.run(0, Array(5).fill('tokenize')).code, 'budget');
  assert.equal(G.run(0, ['unknown']).code, 'unknown');
});
test('each sampled candidate is one token, and EOS honestly decodes to no text', () => {
  const M = require('../foundations.js');
  for(let i=0;i<4;i++) {
    const tokens=G.chooseToken([0,1,2,3].map(j=>j===i?10:0));
    assert.equal(tokens.length,1);
    assert.equal(M.decode(tokens),i===3?'':M.samplingTokens[i]);
  }
  assert.equal(G.chooseToken([0,0,0,10])[0].label,'<EOS>');
});
