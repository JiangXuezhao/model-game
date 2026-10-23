(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TransformerKit=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const D=4,H=2,DK=2,DF=8,T=3;
const shape=a=>[a.length,a[0]?.length||0],same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const weights=(r,c,seed)=>Array.from({length:r},(_,i)=>Array.from({length:c},(_,j)=>Math.sin((i+1)*1.71+(j+1)*.87+seed)*.45));
function matmul(a,b){if(!a.length||a[0].length!==b.length)throw Error('矩阵相乘需要左侧列数等于右侧行数');return a.map(row=>b[0].map((_,j)=>row.reduce((s,v,k)=>s+v*b[k][j],0)));}
const transpose=a=>a[0].map((_,j)=>a.map(r=>r[j]));
const plus=(a,b)=>{if(!same(shape(a),shape(b)))throw Error('相加的两个张量形状必须完全一致');return a.map((r,i)=>r.map((x,j)=>x+b[i][j]));};
const map=(a,f)=>a.map(r=>r.map(f));
function softmax(a){return a.map(r=>{const m=Math.max(...r),e=r.map(x=>Math.exp(x-m)),s=e.reduce((p,n)=>p+n,0);return e.map(v=>v/s);});}
function norm(a){return a.map(r=>{const m=r.reduce((s,v)=>s+v,0)/r.length,v=r.reduce((s,x)=>s+(x-m)**2,0)/r.length;return r.map(x=>(x-m)/Math.sqrt(v+1e-5));});}
const mask=a=>a.map((r,i)=>r.map((v,j)=>j>i?-Infinity:v));
const project=(x,axis,head=0)=>matmul(x,weights(D,DK,{q:1,k:2,v:3}[axis]+head*5));
const dense=(x,out,seed)=>matmul(x,weights(x[0].length,out,seed)).map(r=>r.map((v,i)=>v+Math.cos(seed+i)*.03));
function attention(q,k,v,causal){const heads=[0,1].map(h=>{const Q=project(q,'q',h),K=project(k,'k',h),V=project(v,'v',h);const scores=map(matmul(Q,transpose(K)),x=>x/Math.sqrt(DK));return matmul(softmax(causal?mask(scores):scores),V);});return matmul(heads[0].map((r,i)=>r.concat(heads[1][i])),weights(D,D,8));}
const ffn=(x,gelu=false)=>dense(map(dense(x,DF,9),v=>gelu?.5*v*(1+Math.tanh(Math.sqrt(2/Math.PI)*(v+.044715*v**3))):Math.max(0,v)),D,10);
const PE=()=>Array.from({length:T},(_,p)=>Array.from({length:D},(_,i)=>i%2?Math.cos(p/10000**((i-1)/D)):Math.sin(p/10000**(i/D))));
const X=[[.6,.2,-.4,.1],[.1,.8,.3,-.2],[-.2,.4,.7,.5]],ids=[[0],[1],[2]],target=[[3],[4],[5]];
const E=weights(6,D,2);
const op=(id,name,short,color,ports,formula,detail)=>({id,name,short,color,ports,formula,detail});
const ops=[
 op('embed','Token Embedding','E[token]','blue',['ids'],'X = E[token_ids]','按 token ID 查表，输出每个位置的 4 维向量。这里使用固定的微型词表和手工参数。'),
 op('scaleEmbed','Embedding 缩放','× √d','blue',['x'],'X ← X · √d_model','经典论文将词向量乘以 √d_model。本例 d_model=4，缩放因子为 2；并非所有现代架构都保留此步骤。'),
 op('position','正弦位置编码','sin / cos','mint',[],'PE(pos,2i) = sin(pos / 10000^(2i/d))','生成与词向量同形状的固定位置编码。偶数维用 sin，奇数维用 cos，再与词向量逐元素相加。'),
 op('learnedPos','可学习位置表','P[pos]','mint',[],'X_pos = P[position]','GPT 式分支使用可学习的绝对位置表。这里展示固定的教学表，推理时只读取，不训练。'),
 op('add','逐元素相加','+','sand',['a','b'],'Y = A + B','两路张量必须同形状。位置融合时相加的是词向量与位置编码；残差处相加的是子层输出与该子层的输入。'),
 op('norm','LayerNorm','LN','sand',['x'],'Y = (X − mean(X)) / √(var(X) + ε)','对每个 token 的特征维做归一化。此例 γ=1、β=0；经典 Transformer 使用 Post-LN，GPT 式分支使用 Pre-LN。不是 RMSNorm。'),
 op('self','多头自注意力','MHA','blue',['x'],'Q=XW_Q, K=XW_K, V=XW_V','Q、K、V 都来自这一子层的输入。两个头分别计算，再沿特征维拼接并经过 W_O。点击「拆开」可亲手组装内部电路。'),
 op('masked','带因果遮罩的注意力','MASKED MHA','pink',['x'],'softmax(QKᵀ/√d_k + M) V','Decoder 的当前位置不能看到后面的 token。必须在 softmax 前将未来位置设为 −∞。'),
 op('cross','交叉注意力','CROSS ATTENTION','pink',['q','k','v'],'Q=decoder·W_Q; K,V=encoder·W_K,V','Q 来自 Decoder 前一个子层；K 和 V 来自 Encoder 最后一层。两座塔就是在这里交换信息。'),
 op('ffn','逐位置前馈网络','FFN','mint',['x'],'FFN(X) = ReLU(XW₁+b₁)W₂+b₂','每个 token 独立经过 4→8→4 的网络。中间的非线性不可省略。点击「拆开」可以组装两次投影与 ReLU。'),
 op('ffnGelu','GELU 前馈网络','FFN · GELU','mint',['x'],'FFN(X) = GELU(XW₁+b₁)W₂+b₂','GPT 式教学分支使用 GELU 前馈网络，保持 token 位置不变。'),
 op('vocab','词表输出投影','LINEAR','blue',['x'],'logits = H W_vocab + b','隐藏维 4 投影到 4 个词表候选分数。形状恰好相同不代表语义相同。'),
 op('softmax','Softmax','σ','purple',['x'],'Pᵢ = exp(zᵢ−max(z)) / Σ exp(zⱼ−max(z))','沿每一行归一化。注意力电路得到位置权重，输出层得到候选词概率；它们作用在不同语义的轴上。'),
 op('q','Q 投影','W_Q','blue',['x'],'Q = X W_Q','Query 是当前位置的查询向量。本电路每个头都有自己的 4×2 投影矩阵。'),
 op('k','K 投影','W_K','purple',['x'],'K = X W_K','Key 提供被匹配的位置特征。QKᵀ 需要转置 K 才能得到位置×位置的分数矩阵。'),
 op('v','V 投影','W_V','mint',['x'],'V = X W_V','Value 是被加权汇总的信息。注意力权重与 V 相乘，不是与 K 相乘。'),
 op('scores','QKᵀ 矩阵乘法','QKᵀ','purple',['q','k'],'S = Q Kᵀ','Q 是 3×2，Kᵀ 是 2×3，因此结果是 3×3。每行代表一个 query 对所有 key 的分数。'),
 op('scale','缩放注意力分数','÷ √dₖ','purple',['x'],'S ← S / √d_k','除以头维度的平方根。本例 d_k=2，不是总隐藏维 d_model=4。'),
 op('mask','因果 Mask','−∞','pink',['x'],'S[i,j] = −∞, when j > i','屏蔽未来位置，保留当前位置和历史位置。放在 softmax 之后会破坏概率和为 1 的性质。'),
 op('mix','加权汇总 Value','P × V','mint',['p','v'],'head = P V','3×3 的位置权重乘 3×2 的 Value，得到 3×2 的上下文向量。'),
 op('concat','拼接两个头','CONCAT','sand',['h1','h2'],'H = Concat(head₁, head₂)','沿特征维拼接，不是逐元素相加：两个 3×2 张量变成一个 3×4 张量。'),
 op('wo','输出投影 W_O','W_O','blue',['x'],'Y = Concat(heads) W_O','拼接后再做一次 4×4 线性投影；到这里才是完整的多头注意力输出。'),
 op('up','升维线性层','4 → 8','blue',['x'],'H = X W₁ + b₁','把每个 token 的特征维从 4 扩到 8。真实原论文中通常从 512 扩到 2048。'),
 op('relu','ReLU 激活','ReLU','pink',['x'],'ReLU(x) = max(0, x)','把负值变成 0，带来非线性。去掉它，两次线性变换仍可折叠成一次线性变换。'),
 op('down','降维线性层','8 → 4','blue',['x'],'Y = H W₂ + b₂','将特征维恢复为 4，才可以与原始 3×4 输入做残差相加。')
];
const getOp=id=>ops.find(x=>x.id===id);
const slot=(id,op,x,y,label,extras={})=>({id,op,x,y,label,...extras});
const fixed=(id,x,y,label,value,extras={})=>slot(id,'source',x,y,label,{fixed:true,value,...extras});
const edge=(from,to,port,lane)=>({from,to,port,...(lane?{lane}:{} )});
const chain=(a,b,p='x')=>edge(a,b,p);
const classic={id:'classic',name:'经典 Transformer',subtitle:'把两座塔，接成一台机器',tag:'ENCODER–DECODER · POST-LN',width:1020,height:1320,
 description:'从论文中的双塔结构开始。Q/K/V 的来源、三条 Decoder 子层和所有残差旁路，都要接对。',
 zones:[{x:100,y:490,w:310,h:510,label:'ENCODER LAYER × 1',color:'blue'},{x:595,y:300,w:320,h:700,label:'DECODER LAYER × 1',color:'pink'}],
 slots:[fixed('src',230,1230,'输入 Tokens · I / like / cats',ids),slot('ee','embed',230,1155,'输入词向量'),slot('es','scaleEmbed',230,1085,'缩放词向量'),slot('ep','position',70,1000,'位置编码'),slot('ea','add',230,1000,'词向量 + 位置'),slot('em','self',230,900,'Encoder 自注意力',{sub:'attention'}),slot('er1','add',230,815,'残差 ①'),slot('en1','norm',230,745,'归一化 ①'),slot('ef','ffn',230,665,'Encoder 前馈网络',{sub:'ffn'}),slot('er2','add',230,590,'残差 ②'),slot('en2','norm',230,520,'Encoder 最终输出'),
 fixed('tgt',750,1230,'右移目标 · BOS / 我 / 喜欢',target),slot('de','embed',750,1155,'目标词向量'),slot('ds','scaleEmbed',750,1085,'缩放词向量'),slot('dp','position',940,1000,'位置编码'),slot('da','add',750,1000,'词向量 + 位置'),slot('dm','masked',750,920,'Masked 自注意力',{sub:'attention'}),slot('dr1','add',750,845,'残差 ①'),slot('dn1','norm',750,775,'归一化 ①'),slot('dc','cross',750,685,'跨塔：Q ≠ K,V'),slot('dr2','add',750,610,'残差 ②'),slot('dn2','norm',750,540,'归一化 ②'),slot('df','ffn',750,450,'Decoder 前馈网络',{sub:'ffn'}),slot('dr3','add',750,375,'残差 ③'),slot('dn3','norm',750,305,'归一化 ③'),slot('lm','vocab',750,215,'投影到词表'),slot('prob','softmax',750,135,'下一个词的概率')],
 edges:[chain('src','ee','ids'),chain('ee','es'),chain('es','ea','a'),chain('ep','ea','b'),chain('ea','em'),chain('em','er1','a'),edge('ea','er1','b',435),chain('er1','en1'),chain('en1','ef'),chain('ef','er2','a'),edge('en1','er2','b',435),chain('er2','en2'),chain('tgt','de','ids'),chain('de','ds'),chain('ds','da','a'),chain('dp','da','b'),chain('da','dm'),chain('dm','dr1','a'),edge('da','dr1','b',570),chain('dr1','dn1'),chain('dn1','dc','q'),edge('en2','dc','k',490),edge('en2','dc','v',520),chain('dc','dr2','a'),edge('dn1','dr2','b',570),chain('dr2','dn2'),chain('dn2','df'),chain('df','dr3','a'),edge('dn2','dr3','b',940),chain('dr3','dn3'),chain('dn3','lm'),chain('lm','prob')],
 missing:['ea','dm','dc','dr2','prob'],cut:[['ea','er1'],['en1','er2'],['da','dr1'],['en2','dc'],['dn1','dr2'],['dn2','dr3']],goal:'完整计算下一词概率，并验证跨塔来源与残差旁路。',output:'prob',focus:['dc','dm','ea','dr2','prob']};
const attn={id:'attention',name:'拆开多头注意力',subtitle:'两个头，并行工作',tag:'Q / K / V → SCALED DOT-PRODUCT → CONCAT',width:1040,height:1180,
 description:'每个头单独投影 Q/K/V、计算位置权重，再汇总 V。两个头拼起来以后，还需要 W_O。这里展开 Decoder 的因果注意力。',
 zones:[{x:45,y:245,w:440,h:745,label:'HEAD 01 · d_k = 2',color:'blue'},{x:555,y:245,w:440,h:745,label:'HEAD 02 · d_k = 2',color:'purple'}],
 slots:[fixed('x',520,1090,'同一份输入 X · 3 × 4',X),...Array.from({length:2},(_,h)=>{const x=h?775:265,n=h+1;return[slot('q'+n,'q',x-130,925,'Query · 3×2',{head:h}),slot('k'+n,'k',x,925,'Key · 3×2',{head:h}),slot('v'+n,'v',x+130,925,'Value · 3×2',{head:h}),slot('s'+n,'scores',x-65,790,'Q · K 的转置'),slot('scale'+n,'scale',x-65,675,'除以 √2'),slot('mask'+n,'mask',x-65,560,'遮住未来位置'),slot('p'+n,'softmax',x-65,445,'每行概率和为 1'),slot('mix'+n,'mix',x,330,'注意力权重 × V')];}).flat(),slot('cat','concat',520,210,'沿特征维拼接 · 3×4'),slot('o','wo',520,105,'多头注意力输出 · 3×4')],
 edges:[...Array.from({length:2},(_,h)=>{const n=h+1;return[chain('x','q'+n),chain('x','k'+n),chain('x','v'+n),chain('q'+n,'s'+n,'q'),chain('k'+n,'s'+n,'k'),chain('s'+n,'scale'+n),chain('scale'+n,'mask'+n),chain('mask'+n,'p'+n),chain('p'+n,'mix'+n,'p'),edge('v'+n,'mix'+n,'v',h?974:464),chain('mix'+n,'cat','h'+n)];}).flat(),chain('cat','o')],
 missing:['q1','mask1','mix1','k2','cat','o'],cut:[['x','v2'],['v1','mix1'],['v2','mix2']],goal:'算出两个不同的头，未来位置权重为 0，拼接后输出 3×4。',output:'o',focus:['q1','mask1','mix1','k2','cat','o']};
const feed={id:'ffn',name:'前馈与残差',subtitle:'先扩维，再变换，最后回到原尺寸',tag:'LINEAR → RELU → LINEAR + RESIDUAL',width:770,height:980,
 description:'分清升维、非线性、降维、残差与 LayerNorm。旁路必须来自子层输入，两个张量形状相同才可以相加。',zones:[{x:180,y:290,w:400,h:510,label:'POSITION-WISE FEED FORWARD',color:'mint'}],
 slots:[fixed('x',375,885,'输入 X · 3 × 4',X),slot('up','up',375,740,'每个 token 从 4 维到 8 维'),slot('act','relu',375,600,'负值归零，加入非线性'),slot('down','down',375,460,'恢复到 4 维'),slot('res','add',375,305,'子层输出 + 原始输入'),slot('ln','norm',375,170,'Post-LN · 按特征维归一化')],
 edges:[chain('x','up'),chain('up','act'),chain('act','down'),chain('down','res','a'),edge('x','res','b',650),chain('res','ln')],missing:['act','down','res'],cut:[['x','res']],goal:'保留原始输入旁路，完成 4→8→4 的非线性变换。',output:'ln',focus:['act','down','res']};
const gpt={id:'decoder',name:'Decoder-only 分支',subtitle:'保留一座塔，改成 Pre-LN',tag:'GPT-STYLE · PRE-LN · CAUSAL',width:850,height:1270,
 description:'这个简化的 GPT 式分支使用可学习位置表、前置 LayerNorm、因果注意力与 GELU。没有 Encoder，也没有 Cross-Attention。',zones:[{x:185,y:275,w:460,h:620,label:'PRE-LN DECODER BLOCK × 1',color:'pink'}],
 slots:[fixed('x',415,1180,'前缀 Tokens · 3 × 1',target),slot('e','embed',415,1080,'Token Embedding'),slot('p','learnedPos',705,990,'可学习位置表'),slot('a','add',415,990,'词向量 + 位置'),slot('n1','norm',415,870,'先归一化'),slot('m','masked',415,760,'因果自注意力',{sub:'attention'}),slot('r1','add',415,650,'旁路仍取归一化前输入'),slot('n2','norm',415,540,'再归一化'),slot('f','ffnGelu',415,430,'GELU 前馈网络'),slot('r2','add',415,320,'第二条残差'),slot('nf','norm',415,230,'最终 LayerNorm'),slot('lm','vocab',415,150,'词表投影'),slot('pr','softmax',415,65,'下一 token 概率')],
 edges:[chain('x','e','ids'),chain('e','a','a'),chain('p','a','b'),chain('a','n1'),chain('n1','m'),chain('m','r1','a'),edge('a','r1','b',700),chain('r1','n2'),chain('n2','f'),chain('f','r2','a'),edge('r1','r2','b',145),chain('r2','nf'),chain('nf','lm'),chain('lm','pr')],missing:['n1','m','r1','n2','r2'],cut:[['a','r1'],['r1','r2']],output:'pr',goal:'接对 Pre-LN 的残差来源，算出因果语言模型的下一词分布。',focus:['n1','m','r1','n2','r2']};
// Shared operators, different sources and masking: do not equate all attention variants.
const encoderAttention=JSON.parse(JSON.stringify(attn));
encoderAttention.id='attention-encoder';encoderAttention.name='Encoder 自注意力内部';encoderAttention.tag='SELF-ATTENTION · NO CAUSAL MASK';
encoderAttention.description='Encoder 参考输入序列的全部位置，不使用 Decoder 的因果遮罩。Q/K/V 都来自同一个输入。';
encoderAttention.slots=encoderAttention.slots.filter(s=>!s.id.startsWith('mask'));
encoderAttention.edges=encoderAttention.edges.filter(e=>!e.from.startsWith('mask')&&!e.to.startsWith('mask')).concat([chain('scale1','p1'),chain('scale2','p2')]);
encoderAttention.missing=['q1','mix1','k2','cat','o'];encoderAttention.goal='完成无因果遮罩的两个头；所有输入位置都可参与上下文计算。';encoderAttention.focus=encoderAttention.missing.slice();
const crossAttention=JSON.parse(JSON.stringify(encoderAttention));
crossAttention.id='attention-cross';crossAttention.name='Cross-Attention 内部';crossAttention.tag='DECODER Q · ENCODER K / V';
crossAttention.description='Decoder 提供 Query，Encoder 最终输出提供 Key 和 Value。交叉注意力不加三角因果遮罩。';
crossAttention.slots[0]=fixed('x',300,1090,'Decoder 上一子层 · 3 × 4',X);
crossAttention.slots.splice(1,0,fixed('memory',750,1090,'Encoder 最终输出 · 3 × 4',[[.3,-.7,.2,.8],[.9,.1,-.3,.5],[-.4,.6,.8,-.2]]));
crossAttention.edges=crossAttention.edges.map(e=>e.from==='x'&&/^[kv][12]$/.test(e.to)?{...e,from:'memory'}:e);
crossAttention.missing=['q1','k1','v2','mix1','cat','o'];crossAttention.cut=[['memory','k2'],['memory','v1']];
crossAttention.goal='两个头的 Q 取 Decoder，K/V 取 Encoder；保留两个不同的数据源。';crossAttention.focus=crossAttention.missing.slice();
const boards=[classic,attn,feed,gpt,encoderAttention,crossAttention];
const primaryBoards=boards.slice(0,4);
classic.slots.find(s=>s.id==='em').sub='attention-encoder';
classic.slots.find(s=>s.id==='dc').sub='attention-cross';
function execute(id,inputs,s){const x=inputs.x;switch(id){case 'embed':return inputs.ids.map(r=>E[r[0]].slice());case 'scaleEmbed':return map(x,v=>v*Math.sqrt(D));case 'position':return PE();case 'learnedPos':return weights(T,D,12);case 'add':return plus(inputs.a,inputs.b);case 'norm':return norm(x);case 'self':return attention(x,x,x,false);case 'masked':return attention(x,x,x,true);case 'cross':return attention(inputs.q,inputs.k,inputs.v,false);case 'ffn':return ffn(x);case 'ffnGelu':return ffn(x,true);case 'vocab':return dense(x,4,13);case 'softmax':return softmax(x);case 'q':case 'k':case 'v':return project(x,id,s.head);case 'scores':return matmul(inputs.q,transpose(inputs.k));case 'scale':return map(x,v=>v/Math.sqrt(DK));case 'mask':return mask(x);case 'mix':return matmul(inputs.p,inputs.v);case 'concat':if(inputs.h1.length!==inputs.h2.length)throw Error('拼接需要两个头有相同的位置数量');return inputs.h1.map((r,i)=>r.concat(inputs.h2[i]));case 'wo':return matmul(x,weights(D,D,8));case 'up':return dense(x,DF,9);case 'relu':return map(x,v=>Math.max(0,v));case 'down':return dense(x,D,10);default:throw Error('未知零件');}}
function init(board,mode='guided'){const b=typeof board==='string'?boards.find(b=>b.id===board):board;if(!b)throw new RangeError('未知电路');const comps={};for(const s of b.slots)if(!s.fixed&&(mode==='explore'||mode==='guided'&&!b.missing.includes(s.id)))comps[s.id]=s.op;const edges=mode==='blank'?[]:b.edges.filter(e=>mode==='explore'||(!b.missing.includes(e.from)&&!b.missing.includes(e.to)&&!b.cut.some(([f,t])=>f===e.from&&t===e.to))).map(e=>({...e}));return {comps,edges};}
function expectedValues(b){const state=init(b,'explore');return evaluate(b,state,false).values;}
function edgeSatisfied(b,build,e){
 const target=b.slots.find(s=>s.id===e.to),swappable=target?.op==='add'&&build.comps[e.to]==='add';
 return build.edges.some(x=>x.from===e.from&&x.to===e.to&&(x.port===e.port||swappable&&['a','b'].includes(x.port)));
}
function evaluate(board,build,audit=true){const b=typeof board==='string'?boards.find(b=>b.id===board):board;if(!b)return{status:'error',message:'未知电路',values:{},trace:[]};const values={},inputValues={},trace=[],done=new Set();for(const s of b.slots)if(s.fixed){values[s.id]=s.value.map(r=>r.slice());done.add(s.id);trace.push({id:s.id,value:values[s.id],shape:shape(values[s.id])});}
 const pending=b.slots.filter(s=>!s.fixed);let progress=true;const fail=(id,message,code)=>({status:'error',id,message,code,values,inputs:inputValues,trace});
 for(const e of build.edges){const from=b.slots.find(s=>s.id===e.from),to=b.slots.find(s=>s.id===e.to),ports=getOp(build.comps[e.to])?.ports||[];
  if(!from||!to||to.fixed||!ports.includes(e.port))return fail(to?.id||from?.id||b.output,'这条线接到了不存在或已移除的接口。拔下它，再连接有效的输入端口。','edge');
  if(build.edges.filter(x=>x.to===e.to&&x.port===e.port).length>1)return fail(e.to,'同一个输入端口接了两条线。保留一个来源即可。','duplicate-wire');
 }
 while(progress){progress=false;for(const s of pending){if(done.has(s.id))continue;const installed=build.comps[s.id],o=getOp(installed);if(!o)continue;const inputs={},ports=o.ports;let ready=true;for(const p of ports){const links=build.edges.filter(e=>e.to===s.id&&e.port===p);if(links.length!==1||!values[links[0].from]){ready=false;break;}inputs[p]=values[links[0].from];}if(!ready)continue;
 try{if(audit&&installed!==s.op)return fail(s.id,'这个位置要完成「'+s.label+'」。当前的 '+o.name+' 执行的是另一种运算，展开说明后换一块试试。','operator');inputValues[s.id]=Object.fromEntries(Object.entries(inputs).map(([p,t])=>[p,t.map(r=>r.slice())]));const value=execute(installed,inputs,s);if(value.some(r=>r.some(v=>Number.isNaN(v)||v===Infinity)))return fail(s.id,'计算出现无效数值，检查矩阵形状与概率输入。','numeric');values[s.id]=value;done.add(s.id);trace.push({id:s.id,value,shape:shape(value)});progress=true;}catch(error){return fail(s.id,error.message+'。检查这块积木的两侧接口。','shape');}}
 }
 for(const s of pending)if(!done.has(s.id)){if(!build.comps[s.id])return fail(s.id,'这里还空着：「'+s.label+'」。从零件盒选一块，再放进这个槽位。','missing');const o=getOp(build.comps[s.id]);if(!o)return fail(s.id,'无法识别这块零件。','operator');for(const p of o.ports){if(!build.edges.some(e=>e.to===s.id&&e.port===p))return fail(s.id,'「'+s.label+'」的 '+p.toUpperCase()+' 接口还没接线。先点来源的输出，再点这个输入端口。','wire');}return fail(s.id,'这条线路形成了环，或它的上游还没搭好。顺着输入线找到最先断开的地方。','dependency');}
 if(audit){for(const e of b.edges){if(!edgeSatisfied(b,build,e)){const s=b.slots.find(x=>x.id===e.to),from=b.slots.find(x=>x.id===e.from);return fail(e.to,(s.op==='cross'?'Cross-Attention 的 Q 来自 Decoder，K/V 来自 Encoder。':s.op==='add'?'相加的 A/B 可交换，但必须保留两路正确来源。':'形状能接上，信息来源还需要对照架构。')+'「'+s.label+'」需要来自「'+from.label+'」的输入。','source');}}}
 const output=values[b.output];return{status:'success',message:'所有模块与分支已接通，计算与架构校验通过。',values,inputs:inputValues,trace,output,shape:shape(output)};}
function stats(b,build){const missing=b.slots.filter(s=>!s.fixed&&build.comps[s.id]!==s.op).length;const wires=b.edges.filter(e=>!edgeSatisfied(b,build,e)).length;return {missing,wires,total:b.slots.filter(s=>!s.fixed).length,connections:b.edges.length};}
function portShape(s,port){if(s.op==='embed')return [3,1];if(['scores'].includes(s.op))return[3,2];if(s.op==='mix')return port==='p'?[3,3]:[3,2];if(['scale','mask'].includes(s.op))return[3,3];if(s.op==='softmax')return /^p[12]$/.test(s.id)?[3,3]:[3,4];if(s.op==='concat')return[3,2];if(s.op==='relu'||s.op==='down')return[3,8];return[3,4];}
return {ops,getOp,boards,primaryBoards,init,evaluate,expectedValues,stats,edgeSatisfied,shape,portShape,math:{matmul,transpose,plus,softmax,norm,mask,attention,ffn,project,weights},dimensions:{D,H,DK,DF,T}};
});
