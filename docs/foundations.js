(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ModelLab=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const mergedWords=['语言模型','人工智能','智能体','上下文','小猫','正在','睡觉','模型','学习','订单','退款','hello',' world'];
  const utf8=text=>Array.from(new TextEncoder().encode(text));
  const vocabulary=mergedWords.map((text,i)=>({id:256+i,text,bytes:utf8(text)})).sort((a,b)=>b.bytes.length-a.bytes.length);
  function tokenize(text,merged=true){
    const bytes=utf8(text),tokens=[];
    for(let i=0;i<bytes.length;){
      const match=merged&&vocabulary.find(v=>v.bytes.every((b,j)=>bytes[i+j]===b));
      if(match){tokens.push({id:match.id,bytes:match.bytes,label:match.text});i+=match.bytes.length;}
      else {const b=bytes[i++];tokens.push({id:b,bytes:[b],label:b===32?'␠':b>=33&&b<=126?String.fromCharCode(b):'0x'+b.toString(16).padStart(2,'0')});}
    }return tokens;
  }
  function decode(tokens){return new TextDecoder().decode(new Uint8Array(tokens.flatMap(t=>t.bytes)));}
  function dot(a,b){return a.reduce((n,x,i)=>n+x*b[i],0);}
  function softmax(values,temperature=1){
    if(!Number.isFinite(temperature)||temperature<=0)throw new RangeError('temperature must be positive');
    const max=Math.max(...values);if(max===-Infinity)return values.map(()=>0);
    const exps=values.map(v=>Math.exp((v-max)/temperature)),sum=exps.reduce((a,b)=>a+b,0);return exps.map(v=>v/sum);
  }
  const embeddings=[{word:'猫',vector:[.9,.25]},{word:'狗',vector:[.8,.4]},{word:'苹果',vector:[-.25,.9]},{word:'香蕉',vector:[-.4,.85]},{word:'汽车',vector:[-.8,-.6]}];
  function cosine(a,b){return dot(a,b)/(Math.sqrt(dot(a,a))*Math.sqrt(dot(b,b)));}
  const attentionInput={tokens:['小猫','正在','睡觉'],x:[[1,0],[0,1],[1,1]],wq:[[1,.2],[.3,1]],wk:[[.8,.1],[.2,1]],wv:[[1,.4],[-.2,.8]]};
  function matvec(row,matrix){return matrix[0].map((_,j)=>row.reduce((sum,v,i)=>sum+v*matrix[i][j],0));}
  function attention(queryIndex=2,causal=true){
    const {x,wq,wk,wv}=attentionInput,q=x.map(v=>matvec(v,wq)),k=x.map(v=>matvec(v,wk)),v=x.map(x=>matvec(x,wv));
    const scores=k.map((key,j)=>causal&&j>queryIndex?-Infinity:dot(q[queryIndex],key)/Math.sqrt(2));
    const weights=softmax(scores),output=v[0].map((_,d)=>weights.reduce((sum,a,j)=>sum+a*v[j][d],0));
    return {q,k,v,scores,weights,output};
  }
  function rmsNorm(x){const rms=Math.sqrt(dot(x,x)/x.length+1e-5);return x.map(v=>v/rms);}
  function block(input=[1,.2],residual=true){
    const normalized=rmsNorm(input);
    // 固定输出投影演示；实际注意力结果由第 3 个实验计算。
    const attentionBranch=matvec(normalized,[[.3,.1],[.2,.4]]);
    const afterAttention=attentionBranch.map((v,i)=>v+(residual?input[i]:0));
    const normalized2=rmsNorm(afterAttention),hidden=matvec(normalized2,[[.5,-.6,1],[.2,.8,-.3]]);
    const activated=hidden.map(v=>Math.max(0,v));
    const feedForward=matvec(activated,[[.4,.1],[-.2,.5],[.3,-.4]]);
    const output=feedForward.map((v,i)=>v+(residual?afterAttention[i]:0));
    return {input,normalized,attentionBranch,afterAttention,normalized2,hidden,activated,feedForward,output};
  }
  const samplingTokens=['睡觉','玩耍','吃鱼','<EOS>'];
  function distribution(history=[],temperature=1){
    // 这是显式的上下文 → logits 小表，不冒充一个训练出来的语言模型。
    const table={'睡觉':[.4,1.8,.8,2.1],'玩耍':[1.8,.4,1,1.3],'吃鱼':[1.3,.7,.2,2.7]};
    const logits=history.length?(table[history.at(-1)]||[0,0,0,4]):[2.4,1.4,.5,-.8];
    return {logits,probabilities:softmax(logits,temperature)};
  }
  function sample(probabilities,rng=Math.random){let r=rng();for(let i=0;i<probabilities.length;i++){r-=probabilities[i];if(r<0)return i;}return probabilities.length-1;}
  function infer(weight,x=1){const logit=weight*x,probability=1/(1+Math.exp(-logit));return {logit,probability,loss:-Math.log(Math.max(probability,1e-12))};}
  function train(weight,rate=.5,x=1){const before=infer(weight,x),gradient=(before.probability-1)*x,nextWeight=weight-rate*gradient;return {before,gradient,nextWeight,after:infer(nextWeight,x)};}
  const toolSchema={name:'order.lookup',parameters:{type:'object',properties:{order_id:{type:'string',pattern:'^A[0-9]{4}$'}},required:['order_id'],additionalProperties:false}};
  function executeCall(raw,allowed=true){
    const checked=[];
    const reject=(phase,message)=>({ok:false,phase,message,checked:[...checked]});
    let call;try{call=JSON.parse(raw);}catch{return reject('parse','JSON 解析失败：执行器无法读取调用结构。');}
    checked.push('parse');
    if(!call||typeof call!=='object'||Array.isArray(call))return reject('shape','调用结构不合法：必须是包含 name 与 arguments 的对象。');
    checked.push('shape');
    if(call.name!=='order.lookup')return reject('tool','工具未注册：'+String(call.name)+'。模型写出名称不等于拥有该能力。');
    checked.push('tool');
    const args=call.arguments;
    if(!args||typeof args!=='object'||Array.isArray(args)||typeof args.order_id!=='string'||!/^A\d{4}$/.test(args.order_id)||Object.keys(args).some(k=>k!=='order_id'))return reject('schema','参数校验失败：order_id 必须是 A 加 4 位数字的字符串，且不允许额外参数。');
    checked.push('schema');
    if(!allowed)return reject('permission','运行时拒绝：当前任务没有 order.lookup 的读取权限。');
    checked.push('permission');
    if(args.order_id!=='A1024')return reject('execute','本地工具执行完毕：NOT_FOUND。未知订单不能被补写为已存在。');
    checked.push('execute','result');
    return {ok:true,phase:'result',message:'工具返回事实，执行器将结果追加到消息列表。',checked,result:{order_id:'A1024',amount:129,status:'delivered'},messages:[{role:'assistant',tool_calls:[{id:'call_01',name:'order.lookup',arguments:args}]},{role:'tool',tool_call_id:'call_01',content:{order_id:'A1024',amount:129,status:'delivered'}}]};
  }
  return {vocabulary,utf8,tokenize,decode,dot,softmax,embeddings,cosine,attentionInput,matvec,attention,rmsNorm,block,samplingTokens,distribution,sample,infer,train,toolSchema,executeCall};
});
