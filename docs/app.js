(function () {
  'use strict';
  const E = window.Foundry;
  const $ = s => document.querySelector(s);
  const paths = {
    spark:'m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3Z M19 2v4 M17 4h4',
    sliders:'M4 6h6m4 0h6M4 12h10m4 0h2M4 18h2m4 0h10 M10 3v6m4 0v6M6 15v6',
    layers:'m12 3 9 5-9 5-9-5Z M3 12l9 5 9-5M3 16l9 5 9-5',
    box:'m12 3 9 5v9l-9 5-9-5V8Z M3 8l9 5 9-5M12 13v9M7 5.8l10 5.6',
    globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18',
    code:'m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18',
    loop:'M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5',
    terminal:'M3 4h18v16H3ZM7 9l3 3-3 3m6 0h4',
    wallet:'M4 7V4h14v3M3 7h18v13H3ZM21 11h-6v5h6M17 13.5h.1',
    database:'M20 6c0 2-16 2-16 0s16-2 16 0M4 6v12c0 3 16 3 16 0V6M4 12c0 3 16 3 16 0',
    shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6ZM8 12l3 3 5-6',
    check:'m5 12 4 4L19 6',
    grid:'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
    book:'M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15',
    award:'M17 8a5 5 0 1 1-10 0 5 5 0 0 1 10 0M8 12l-2 9 6-3 6 3-2-9',
    help:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01',
    'arrow-up-right':'M6 18 18 6M6 6h12v12',
    'arrow-right':'M4 12h16m-6-6 6 6-6 6',
    bulb:'M9 18h6m-5 3h4M8 15c-6-5-2-12 4-12s10 7 4 12c-1 1-1 3-1 3H9s0-2-1-3',
    blocks:'M3 12h8v9H3ZM13 12h8v9h-8ZM8 2h8v8H8Z',
    info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 11v6m0-10h.01',
    rotate:'M3 10a9 9 0 1 1 2 9M3 4v6h6',
    message:'M3 4h18v13H9l-6 4Z M7 9h10m-10 4h6',
    flag:'M5 22V3m0 0c5-4 9 4 15 0v10c-6 4-10-4-15 0',
    play:'m7 4 14 8-14 8Z',
    activity:'M2 12h5l3-9 4 18 3-9h5',
    route:'M5 3v10a5 5 0 0 0 5 5h9m-4-4 4 4-4 4M8 3a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    close:'m6 6 12 12M6 18 18 6',
    plus:'M12 5v14M5 12h14',
    lock:'M6 10h12v11H6ZM8 10V6a4 4 0 0 1 8 0v4',
    alert:'m12 3 10 18H2ZM12 9v5m0 3h.01',
    bag:'M4 7h16l1 14H3ZM8 8V6a4 4 0 0 1 8 0v2'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.spark}"/></svg>`;
  document.querySelectorAll('[data-icon]').forEach(el => el.outerHTML = icon(el.dataset.icon));
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const STORAGE = 'agent-foundry-v1';
  const fresh = () => ({version:1,level:0,scenario:'commerce',completed:{},builds:{},scores:{}});
  function restore() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE));
      if (!raw || raw.version !== 1) return fresh();
      const next = fresh();
      const keys = ['level-0','level-1','level-2','level-3','level-4','commerce','research','coding'];
      for (const key of keys) {
        if (raw.completed?.[key] === true) next.completed[key] = true;
        if (Array.isArray(raw.builds?.[key])) next.builds[key] = [...new Set(raw.builds[key].filter(id=>E.modules.some(m=>m.id===id)))];
        if (Number.isFinite(raw.scores?.[key])) next.scores[key] = Math.max(0,Math.min(100,raw.scores[key]));
      }
      if (Object.hasOwn(E.scenarios,raw.scenario)) next.scenario = raw.scenario;
      if (Number.isInteger(raw.level)) next.level = Math.min(Math.max(0,raw.level),maxUnlocked(next));
      return next;
    } catch { return fresh(); }
  }
  function maxUnlocked(s) { for(let i=0;i<5;i++) if(!s.completed['level-'+i]) return i; return 5; }
  let state = restore();
  let filter = 'all', tab = 'task', running = false, epoch = 0, approvalResolve = null, lastResult = null, toastTimer, exportURL;
  const key = () => state.level === 5 ? state.scenario : 'level-'+state.level;
  function installed() { if (!state.builds[key()]) state.builds[key()] = []; return state.builds[key()]; }
  function save() { try {localStorage.setItem(STORAGE,JSON.stringify(state));} catch {toast('浏览器暂时无法保存进度，本次仍可正常游玩。');} }
  function toast(message) { $('#toast').textContent=message; $('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3300); }
  function renderPath() {
    const unlocked=maxUnlocked(state), count=Object.keys(state.completed).length;
    $('#level-path').innerHTML=E.levels.map((l,i)=>{
      const done=i<5?state.completed['level-'+i]:Object.keys(E.scenarios).every(s=>state.completed[s]);
      return `<button class="level ${i===state.level?'current ':''}${i>unlocked?'locked ':''}${done?'done':''}" data-level="${i}" ${i===state.level?'aria-current="step"':''} aria-label="第 ${i+1} 关 ${l.title}${i>unlocked?'，尚未解锁':''}"><span class="level-number">${done?icon('check'):String(i+1).padStart(2,'0')}</span><span><strong>${l.title}</strong><small>${l.sub}</small></span>${i>unlocked?icon('lock'):''}</button>`;
    }).join('');
    $('#progress-value').innerHTML=`${count}<small>/8</small>`;
    $('#progress-ring').style.setProperty('--progress',(count/8*360)+'deg');
    $('#progress-label').textContent=count===8?'所有业务关卡已完成':count?'已完成 '+count+' 个学习挑战':'从第一块组件开始';
  }
  function renderLibrary() {
    const ids=installed();
    $('#module-count').textContent=String(E.modules.filter(m=>m.unlock<=state.level).length).padStart(2,'0')+' / '+E.modules.length;
    document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));
    const groups={core:'MODEL / 模型与输入',tools:'TOOLS / 外部能力',runtime:'RUNTIME / 运行系统'};
    $('#module-list').innerHTML=Object.entries(groups).filter(([g])=>filter==='all'||g===filter).map(([g,title])=>`<div class="module-group-label">${title}</div>`+E.modules.filter(m=>m.group===g).map(m=>{
      const locked=m.unlock>state.level, added=ids.includes(m.id);
      return `<div class="module-card group-${m.group} ${locked?'locked':''} ${added?'installed':''}" draggable="${!locked}" data-drag="${m.id}"><button class="module-install" data-install="${m.id}" aria-pressed="${added}" aria-label="${locked?'第 '+(m.unlock+1)+' 关解锁':added?'移除':'添加'}${m.name}"><span class="module-card-head"><span class="module-icon">${icon(m.icon)}</span><span class="module-name">${m.name}<small>${m.en}</small></span><span class="module-add">${locked?icon('lock'):added?icon('check'):icon('plus')}<small>${m.cost}</small></span></span><span class="module-desc">${locked?'第 '+String(m.unlock+1).padStart(2,'0')+' 关解锁 · '+m.short:m.short}</span></button><button class="info-button" data-info="${m.id}" aria-label="了解${m.name}">i</button></div>`;
    }).join('')).join('');
  }
  function slot(id) {
    const m=E.modules.find(m=>m.id===id),added=installed().includes(id);
    return `<button class="slot ${added?'filled':''}" data-slot="${id}" aria-label="${added?'移除':'添加'}${m.name}" aria-pressed="${added}">${icon(added?m.icon:'plus')}<span>${m.name}</span><small>${added?'CONNECTED':m.unlock>state.level?'LOCKED':'EMPTY SLOT'}</small>${added?'<span class="remove-indicator">×</span>':''}</button>`;
  }
  function renderCanvas() {
    const ids=installed(),used=E.cost(ids),budget=E.mission(state.level,state.scenario).budget;
    $('#core-slots').innerHTML=['model','prompt','context'].map(slot).join('');
    const toolModules=E.modules.filter(m=>m.group==='tools'&&ids.includes(m.id));
    const toolHTML=toolModules.length?`<div class="slot tool-slot filled">${toolModules.map(m=>`<button class="tool-chip" data-install="${m.id}" aria-label="移除${m.name}">${icon(m.icon)}${m.name}<span class="chip-remove">×</span></button>`).join('')}</div>`:`<button class="slot tool-slot empty" data-action="tool-filter">${icon('plus')}<span>连接工具</span><small>让模型触达外部世界</small></button>`;
    $('#harness-slots').innerHTML=toolHTML+['loop','memory','guard'].map(slot).join('')+`<button class="runtime-extra ${ids.includes('eval')?'filled':''}" data-slot="eval" aria-pressed="${ids.includes('eval')}">${icon(ids.includes('eval')?'check':'plus')}结果验收 <span>· ${ids.includes('eval')?'CONNECTED':'交付前的最后一站'}</span></button>`;
    $('#assembly-count').textContent=ids.length+' COMPONENTS';
    $('#budget-text').textContent=used+' / '+budget;
    $('#budget-fill').style.width=Math.min(used/budget*100,100)+'%';
    $('.budget').classList.toggle('over',used>budget);
    $('#run-button').disabled=running;
    $('#run-button').innerHTML=icon(running?'activity':'play')+(running?'实验运行中…':'运行智能体')+' <kbd>↵</kbd>';
    $('.assembly').classList.toggle('running',running);
    $('#flow-output').classList.toggle('success',Boolean(lastResult?.pass));
    $('#flow-output small').textContent=lastResult?.pass?'已完成 · 查看交付':lastResult?'需要调整':'等待运行';
  }
  function renderMission() {
    const m=E.mission(state.level,state.scenario);
    $('#stage-tag').textContent='STAGE '+String(state.level+1).padStart(2,'0');
    $('#level-title').textContent=E.levels[state.level].title;
    $('#lesson-duration').textContent=state.level<2?'约 2 分钟':state.level<5?'约 3 分钟':'3 个业务挑战';
    $('#mission-tag').textContent=state.level===5?'BUSINESS MISSION':'EXPERIMENT '+String(state.level+1).padStart(2,'0');
    $('#mission-title').textContent=state.level===5?m.short:['从第一句话开始。','让回答有据可依。','给模型一双手。','失败之后，再试一次。','行动，也需要边界。'][state.level];
    $('#mission-brief').textContent=m.brief;
    $('#mission-request').textContent=m.request;
    $('#checklist').innerHTML=m.checks.map(c=>`<li>${c}</li>`).join('');
    $('#checklist').classList.toggle('completed',Boolean(lastResult?.pass));
    $('#learning-text').textContent=m.learn;
    $('#scenario-selector').innerHTML=state.level===5?Object.entries(E.scenarios).map(([id,s])=>`<button class="scenario-button ${id===state.scenario?'active':''}" data-scenario="${id}" aria-pressed="${id===state.scenario}">${s.name}${state.completed[id]?'<span class="scenario-done">✓</span>':''}</button>`).join(''):'';
  }
  function setTab(next) { tab=next;document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-selected',String(b.dataset.tab===tab));});$('#task-panel').hidden=tab!=='task';$('#trace-panel').hidden=tab!=='trace'; }
  function emptyTrace() { $('#trace-count').textContent='0';$('#trace-panel').innerHTML=`<div class="trace-empty">${icon('activity')}<h4>每一步，都看得见</h4><p>运行后，在这里观察模型如何思考、<br>工具如何执行、循环如何推进。</p></div>`; }
  function render() {renderPath();renderLibrary();renderCanvas();renderMission();setTab(tab);}
  function editModule(id,onlyAdd=false) {
    if(running) return toast('请先停止当前运行，再调整组件。');
    const m=E.modules.find(m=>m.id===id);if(!m)return;
    if(m.unlock>state.level)return toast('「'+m.name+'」在第 '+(m.unlock+1)+' 关解锁。先完成当前实验。');
    const ids=installed(),exists=ids.includes(id);
    if(onlyAdd&&exists)return toast('「'+m.name+'」已经接入装配台。');
    state.builds[key()]=exists?ids.filter(x=>x!==id):[...ids,id];
    lastResult=null;emptyTrace();render();save();
    toast((exists?'已移除 ':'已接入 ')+m.name);
  }
  function goLevel(index) {
    if(running)return toast('请先停止当前运行。');
    if(index>maxUnlocked(state))return toast('先完成第 '+(maxUnlocked(state)+1)+' 关，即可继续解锁。');
    if(index===state.level)return;
    const previous=installed().slice();state.level=index;
    if(!state.builds[key()])state.builds[key()]=index===0?[]:previous.filter(id=>E.modules.find(m=>m.id===id).unlock<=index);
    lastResult=null;filter='all';tab='task';emptyTrace();render();save();
  }
  function changeScenario(id) {
    if(running)return toast('请先停止当前运行。');
    if(!Object.hasOwn(E.scenarios,id)||id===state.scenario)return;
    state.scenario=id;
    if(!state.builds[key()])state.builds[key()]=['model','prompt','context','loop'];
    lastResult=null;tab='task';emptyTrace();render();save();
  }
  function addTrace(item,index) {
    const el=document.createElement('div');el.className='trace-item '+item.kind;
    el.innerHTML=`<span class="trace-icon">${icon(item.icon)}</span><h4>${escape(item.title)}</h4><p>${escape(item.detail)}</p>`;
    $('#trace-panel').append(el);$('#trace-count').textContent=String(index+1);
    $('#trace-panel').scrollTop=$('#trace-panel').scrollHeight;
    return el;
  }
  function stopRun() {
    if(!running)return;
    epoch++;running=false;
    if(approvalResolve){approvalResolve(false);approvalResolve=null;}
    $('#trace-panel').querySelectorAll('.approval-actions').forEach(el=>el.remove());
    $('#stop-run')?.remove();addTrace({kind:'warning',title:'运行已停止',detail:'当前装配方案已保留，没有新的模拟操作执行。',icon:'alert'},Number($('#trace-count').textContent));
    renderCanvas();
  }
  async function run() {
    if(running)return;
    $('#dialog').close();running=true;lastResult=null;const current=++epoch;
    const ids=installed().slice(),level=state.level,scenario=state.scenario;
    const result=E.assess(level,scenario,ids),steps=E.trace(level,scenario,ids);
    renderCanvas();renderMission();setTab('trace');$('#trace-count').textContent='0';
    $('#trace-panel').innerHTML='<button id="stop-run" class="text-button" data-action="stop" style="margin-bottom:15px">停止运行</button>';
    for(let i=0;i<steps.length;i++) {
      await new Promise(resolve=>setTimeout(resolve,window.matchMedia('(prefers-reduced-motion: reduce)').matches?45:470));
      if(current!==epoch)return;
      const item=steps[i],el=addTrace(item,i);
      if(item.kind==='approval') {
        el.insertAdjacentHTML('beforeend','<div class="approval-actions"><button data-approval="yes">批准模拟退款</button><button data-approval="no">拒绝</button></div>');
        $('#trace-panel').scrollTop=$('#trace-panel').scrollHeight;
        const accepted=await new Promise(resolve=>{approvalResolve=resolve;});
        approvalResolve=null;if(current!==epoch)return;
        el.querySelector('.approval-actions')?.remove();
        if(!accepted) {
          addTrace({kind:'warning',title:'审批被拒绝，流程安全停止',detail:'未执行退款，也未记为通关。你可以调整方案后重新发起模拟。',icon:'shield'},i+1);
          running=false;lastResult={...result,pass:false,declined:true};$('#stop-run')?.remove();renderCanvas();showResult(lastResult);return;
        }
        el.querySelector('h4').textContent='模拟审批已通过';
        el.querySelector('p').textContent='你已批准对订单 #A1024 进行 ¥129 的模拟退款。';
      }
    }
    if(current!==epoch)return;
    running=false;lastResult=result;
    if(result.pass){state.completed[key()]=true;state.scores[key()]=Math.max(state.scores[key()]||0,result.score);save();}
    $('#stop-run')?.remove();renderPath();renderCanvas();renderMission();showResult(result);
  }
  function showResult(result) {
    const card=document.createElement('div');card.className='result-card '+(result.pass?'':'failed');
    if(result.pass){
      const next=state.level<5?'进入下一关':Object.keys(E.scenarios).every(s=>state.completed[s])?'查看我的学习成就':'挑战下一个业务';
      card.innerHTML=`<div class="result-card-header"><b>实验成功 ${icon('check')}</b><span>${result.score}<small> / 100</small></span></div><p>目标达成度 ${result.coverage}% · 装配效率 ${result.efficiency}%<br>你已经让这一套组件完成了任务。</p><button data-action="next">${next} →</button><button class="secondary" data-action="show-output">查看业务交付物</button>`;
    }else{
      const description=result.declined?'审批拒绝后，系统正确停止了操作。业务尚未完成，未计入通关。':result.over?'当前装配超出预算。试着移除任务不需要的组件。':result.forbidden.length?'移除超出任务范围的工具，再运行一次。':result.missing.length?'还缺少：'+E.names(result.missing)+'。看看轨迹里流程停在了哪一步。':'当前装配尚未满足任务要求。';
      card.innerHTML=`<div class="result-card-header"><b>${result.declined?'已安全停止':'还差一点，再试一次'}</b></div><p>${escape(description)}</p><button data-action="hint">查看组装提示</button><button class="secondary" data-tab="task">回到任务简报</button>`;
    }
    $('#trace-panel').append(card);$('#trace-panel').scrollTop=$('#trace-panel').scrollHeight;
  }
  function dialog(title,content,eyebrow='FIELD NOTES') {$('#dialog-eyebrow').textContent=eyebrow;$('#dialog-content').innerHTML=`<h2>${title}</h2>${content}`;if(!$('#dialog').open)$('#dialog').showModal();$('#dialog').scrollTop=0;}
  function showModule(id) {
    const m=E.modules.find(m=>m.id===id);if(!m)return;
    const locked=m.unlock>state.level;
    dialog(m.name,`<p class="analogy">${icon(m.icon)} ${m.analogy}</p><p>${m.detail}</p><div class="note-box"><strong>它的能力边界</strong><p>${m.limit}</p></div><p>装配成本：${m.cost} 点（教学指标，不对应实际 API 价格）</p>${locked?`<button class="dialog-secondary" data-action="close-dialog">第 ${m.unlock+1} 关解锁 · 继续实验</button>`:`<button class="dialog-primary" data-dialog-install="${id}">${installed().includes(id)?'从装配台移除':'接入装配台'}</button>`}`,m.en);
  }
  function showHandbook() {dialog('每个组件，各司其职。','<p>模型负责生成。Harness 是围绕模型运行的那套代码：连接工具、组织上下文、维护循环和状态，并落实权限与验收。下面的划分是一种教学设计，并非唯一实现方式。</p>'+E.modules.map(m=>`<div class="handbook-row"><button data-info="${m.id}">${icon(m.icon)}${m.name}<small>${m.en} ↗</small></button><p>${m.short}</p></div>`).join(''),'THE FIELD GUIDE');}
  function showAchievements() {
    const badges=[...E.levels.slice(0,5).map((l,i)=>({key:'level-'+i,name:l.title,icon:['spark','layers','box','loop','shield'][i]})),...Object.entries(E.scenarios).map(([key,s])=>({key,name:s.name+'交付',icon:s.icon}))];
    dialog('你的组装之旅。',`<p>已完成 ${Object.keys(state.completed).length} / 8 个挑战。成绩根据目标达成和装配效率计算，只是本游戏的教学反馈，不代表真实 Agent 的评测能力。</p><div class="award-grid">${badges.map(b=>`<div class="award-card ${state.completed[b.key]?'earned':''}">${icon(b.icon)}<b>${b.name}</b><small>${state.completed[b.key]?state.scores[b.key]+' 分 · 已完成':'等待解锁'}</small></div>`).join('')}</div><button class="dialog-secondary" data-action="reset-dialog">重置学习进度</button>`,'YOUR PROGRESS');
  }
  function showOutput() {
    if(!lastResult?.pass)return toast('先让当前装配通过运行，就能查看交付结果。');
    const a=E.artifact(state.level,state.scenario);
    dialog(a.title,`<p class="artifact-text">${escape(a.text)}</p><ul class="artifact-facts">${a.facts.map(f=>`<li>${escape(f)}</li>`).join('')}</ul><div class="note-box"><strong>你刚刚验证了什么</strong><p>${E.mission(state.level,state.scenario).learn}</p></div><button class="dialog-primary" data-action="export">下载本次实验记录</button>`,'DELIVERY / 教学模拟交付物');
  }
  function exportRun() {
    if(!lastResult?.pass)return;
    const a=E.artifact(state.level,state.scenario),m=E.mission(state.level,state.scenario);
    const content=`# Agent Foundry 实验记录\n\n本记录来自确定性教学模拟；未调用真实模型或外部工具。\n\n关卡：${E.levels[state.level].title}${state.level===5?' / '+E.scenarios[state.scenario].name:''}\n\n## 任务\n${m.request}\n\n## 装配方案\n${installed().map(id=>'- '+E.names([id])).join('\n')}\n\n预算：${E.cost(installed())} / ${m.budget} 点（教学指标）\n得分：${lastResult.score} / 100\n\n## ${a.title}\n${a.text}\n\n${a.facts.map(f=>'- '+f).join('\n')}\n\n## 执行轨迹\n${E.trace(state.level,state.scenario,installed()).map((s,i)=>`${i+1}. ${s.title}：${s.detail}${s.kind==='approval'?'（玩家已批准）':''}`).join('\n')}\n\n## 核心理解\n${m.learn}\n`;
    if(exportURL)URL.revokeObjectURL(exportURL);
    exportURL=URL.createObjectURL(new Blob([content],{type:'text/markdown;charset=utf-8'}));
    dialog('本次实验记录',`<p>记录包含装配方案、执行轨迹和最终交付物。可以下载 Markdown，或选中下方文本复制保存。</p><textarea class="export-text" id="export-text" readonly aria-label="Markdown 实验记录">${escape(content)}</textarea><a class="dialog-primary export-link" href="${exportURL}" download="agent-foundry-${key()}.md">下载 Markdown 文件</a><button class="dialog-secondary" data-action="select-export">选中全部文本</button><p class="export-note">部分内置浏览器不支持文件下载，可使用文本方式保存。</p>`,'EXPERIMENT RECORD');
  }
  const actions={
    handbook:showHandbook,achievements:showAchievements,
    'close-dialog':()=>$('#dialog').close(),
    hint:()=>dialog('下一步，试试这样做。',`<p>${E.mission(state.level,state.scenario).hint}</p><div class="note-box"><strong>实验方法</strong><p>每次只改变一两个组件，然后运行。比较前后的轨迹，观察增加的能力解决了哪个问题。</p></div><button class="dialog-primary" data-action="close-dialog">回到装配台</button>`,'A LITTLE NUDGE'),
    clear:()=>{if(running)return toast('请先停止当前运行。');state.builds[key()]=[];lastResult=null;emptyTrace();render();save();toast('当前装配已清空，通关进度已保留。');},
    'tool-filter':()=>{filter='tools';renderLibrary();toast(state.level<2?'工具在第 3 关解锁。':'从左侧组件库选择任务需要的工具。');},
    'show-output':showOutput,export:exportRun,stop:stopRun,
    'select-export':()=>{$('#export-text')?.select();toast('已选中全部记录，按 ⌘C / Ctrl+C 即可复制。');},
    next:()=>{if(!lastResult?.pass)return;if(state.level<5)goLevel(state.level+1);else{const next=Object.keys(E.scenarios).find(s=>!state.completed[s]);if(next)changeScenario(next);else showAchievements();}},
    map:()=>dialog('从生成文字，到交付结果。',E.levels.map((l,i)=>`<div class="map-row"><span>${String(i+1).padStart(2,'0')}</span><div><b>${l.title}</b><p>${l.learn}</p></div></div>`).join('')+'<p>最终业务挑战：电商售后 / 行业研究 / 编程助手。</p>','LEARNING ROADMAP'),
    about:()=>dialog('在动手中，理解 Agent。','<p>Agent Foundry 是一个中文学习组装游戏。通过添加组件、运行实验、查看失败和修正方案，理解基础模型、Agent Harness 与业务交付之间的关系。</p><div class="note-box"><strong>关于模拟</strong><p>所有模型回复、订单、退款、搜索资料和代码测试都使用离线预设数据。没有调用真实模型、外部工具或资金系统；研究中的公司与收入均为虚构。</p></div><p>无需 API Key。组件预算与得分仅用于教学，不代表真实费用或性能。进度保存在当前浏览器，无法跨设备自动同步。</p>','ABOUT THE LAB'),
    'reset-dialog':()=>dialog('重新开始这段旅程？','<p>将清除这个浏览器中的全部通关成绩和装配方案。此操作无法撤销。</p><button class="dialog-primary" data-action="reset-confirm">清除进度并重新开始</button><button class="dialog-secondary" data-action="close-dialog">保留进度</button>','RESET PROGRESS'),
    'reset-confirm':()=>{stopRun();state=fresh();filter='all';tab='task';lastResult=null;save();emptyTrace();render();$('#dialog').close();toast('已重新开始。');}
  };
  document.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.dataset.action)actions[b.dataset.action]?.();
    else if(b.dataset.install)editModule(b.dataset.install);
    else if(b.dataset.dialogInstall){$('#dialog').close();editModule(b.dataset.dialogInstall);}
    else if(b.dataset.info)showModule(b.dataset.info);
    else if(b.dataset.slot)editModule(b.dataset.slot);
    else if(b.dataset.level!==undefined)goLevel(Number(b.dataset.level));
    else if(b.dataset.scenario)changeScenario(b.dataset.scenario);
    else if(b.dataset.filter){filter=b.dataset.filter;renderLibrary();}
    else if(b.dataset.tab)setTab(b.dataset.tab);
    else if(b.dataset.approval&&approvalResolve){const resolve=approvalResolve;approvalResolve=null;resolve(b.dataset.approval==='yes');}
    else if(b.dataset.view==='workshop'){$('.workshop-heading').scrollIntoView({behavior:'smooth',block:'start'});}
  });
  $('#run-button').addEventListener('click',run);
  document.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.repeat&&!$('#dialog').open&&!event.target.closest('button,a,input,textarea,select')){event.preventDefault();run();}});
  document.addEventListener('dragstart',event=>{const card=event.target.closest('[data-drag]');if(!card||running||card.getAttribute('draggable')==='false'){event.preventDefault();return;}event.dataTransfer.setData('text/plain',card.dataset.drag);event.dataTransfer.effectAllowed='copy';});
  $('#canvas').addEventListener('dragover',event=>{event.preventDefault();event.dataTransfer.dropEffect='copy';event.target.closest('[data-drop-zone]')?.classList.add('dragover');});
  $('#canvas').addEventListener('dragleave',event=>{const zone=event.target.closest('[data-drop-zone]');if(zone&&!zone.contains(event.relatedTarget))zone.classList.remove('dragover');});
  $('#canvas').addEventListener('drop',event=>{event.preventDefault();document.querySelectorAll('.dragover').forEach(el=>el.classList.remove('dragover'));const id=event.dataTransfer.getData('text/plain');const m=E.modules.find(m=>m.id===id);if(!m)return;const zone=event.target.closest('[data-drop-zone]')?.dataset.dropZone;if(zone&&(m.group==='core'?'core':'harness')!==zone)return toast(m.group==='core'?'这个组件属于上方 MODEL 区域。':'这个组件属于下方 HARNESS 区域。');editModule(id,true);});
  $('#dialog').addEventListener('click',event=>{if(event.target===$('#dialog')){const r=$('#dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('#dialog').close();}});
  render();
})();
