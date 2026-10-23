const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../game.js');

for (let level = 0; level < 5; level++) {
  test(`lesson ${level + 1}: required build succeeds within budget`, () => {
    const m = E.mission(level, 'commerce');
    assert.equal(E.assess(level, 'commerce', m.required).pass, true);
    assert.equal(E.trace(level, 'commerce', m.required).at(-1).kind, 'success');
    for (const id of m.required) {
      const result = E.assess(level, 'commerce', m.required.filter(x => x !== id));
      assert.equal(result.pass, false, `${id} must be necessary`);
      assert.ok(result.missing.includes(id));
    }
  });
}
for (const [scenario, m] of Object.entries(E.scenarios)) {
  test(`${scenario}: complete assembly passes, each missing capability fails`, () => {
    assert.equal(E.assess(5, scenario, m.required).pass, true);
    for (const id of m.required) {
      assert.equal(E.assess(5, scenario, m.required.filter(x => x !== id)).pass, false, id);
    }
  });
  test(`${scenario}: tools beyond task scope are rejected`, () => {
    for (const id of m.forbidden) {
      const result = E.assess(5, scenario, [...m.required, id]);
      assert.equal(result.pass, false);
      assert.ok(result.forbidden.includes(id));
    }
  });
}
test('no model means no generated text or executed tools', () => {
  const trace = E.trace(5, 'commerce', E.scenarios.commerce.required.filter(x=>x!=='model'));
  assert.equal(trace.length, 1);
  assert.equal(trace[0].kind, 'error');
});
test('timeout without loop does not produce a successful lookup', () => {
  const trace = E.trace(3, 'commerce', E.levels[3].required.filter(x=>x!=='loop'));
  assert.ok(trace.some(s => s.title.includes('超时')));
  assert.ok(!trace.some(s => s.title==='工具返回订单事实'));
  assert.ok(!trace.some(s => s.kind==='success'));
});
test('refund execution must follow approval and precede deduplication check', () => {
  const trace = E.trace(5, 'commerce', E.scenarios.commerce.required);
  const approval = trace.findIndex(s=>s.kind==='approval');
  const refund = trace.findIndex(s=>s.title==='执行一次退款');
  const deduplication = trace.findIndex(s=>s.title==='重复请求检查通过');
  assert.ok(approval > 0 && refund > approval && deduplication > refund);
  const unsafe = E.trace(5, 'commerce', E.scenarios.commerce.required.filter(x=>x!=='guard'));
  assert.ok(!unsafe.some(s=>s.title==='执行一次退款'));
});
test('assembly above budget fails and does not execute tools', () => {
  const ids = ['model','prompt','context'];
  assert.equal(E.assess(0,'commerce',ids).over,true);
  const trace = E.trace(0,'commerce',ids);
  assert.ok(!trace.some(s=>s.kind==='tool'||s.kind==='success'));
});
test('duplicate components cannot increase cost or score', () => {
  assert.equal(E.cost(['model','model']),4);
  assert.deepEqual(E.assess(0,'commerce',['model','model']),E.assess(0,'commerce',['model']));
});
test('coding demonstrates failure, repair, and retest in that order', () => {
  const trace = E.trace(5,'coding',E.scenarios.coding.required);
  const indexes=['测试暴露边界错误','根据失败反馈修复','重新运行测试'].map(title=>trace.findIndex(s=>s.title===title));
  assert.ok(indexes[0]>=0&&indexes[1]>indexes[0]&&indexes[2]>indexes[1]);
});
test('coding without runtime permission checks does not apply a patch', () => {
  const trace=E.trace(5,'coding',E.scenarios.coding.required.filter(id=>id!=='guard'));
  assert.ok(!trace.some(s=>s.title==='根据失败反馈修复'));
  assert.ok(!trace.some(s=>s.title==='重新运行测试'));
  assert.ok(trace.some(s=>s.kind==='error'));
});
test('research reports conflicting year and preserves source references', () => {
  const result=E.artifact(5,'research');
  assert.ok(result.text.includes('[S1]')&&result.text.includes('[S2]')&&result.text.includes('[S3]'));
  assert.ok(result.text.includes('2024'));
  assert.ok(result.facts.every(s=>s.includes('虚构')||s.includes('教学资料')));
});
