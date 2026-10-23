(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FactoryView=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function overview(world,width,height){
  const top=width<700?122:104,bottom=160,padding=24;
  const availableW=Math.max(1,width-padding*2),availableH=Math.max(1,height-top-bottom);
  const scale=Math.min(availableW/world.width,availableH/world.height);
  return {x:world.width/2,y:world.height/2,scale,screenX:width/2,screenY:top+availableH/2};
 }
 function player(player,width,height){return{x:player.x,y:player.y,scale:width<700?.86:1,screenX:width/2,screenY:height/2+25};}
 function lerp(view,target,dt,speed=8){const mix=1-Math.exp(-Math.max(0,dt)*speed),next={};for(const key of ['x','y','scale','screenX','screenY'])next[key]=view[key]+(target[key]-view[key])*mix;return next;}
 return{overview,player,lerp};
});
