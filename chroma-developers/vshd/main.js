(function(){
'use strict';
var D=window.VSHD,P=D.projects,$=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var small=function(){return window.innerWidth<=800};
var pad=function(n){return (n<10?'0':'')+n};
var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};

/* ---------- loader ---------- */
var first=new Image();var started=false;
function start(){if(started)return;started=true;document.body.classList.remove('is-loading');setTimeout(heroPlay,1400)}
first.onload=first.onerror=function(){setTimeout(start,900)};
setTimeout(start,3500);

/* ---------- hero ---------- */
var cur=$('#heroCur'),nxt=$('#heroNxt'),cv=$('#heroGl'),bars=$('#heroBars'),hi=0,busy=false,timer=null,DUR=6500;
function hsrc(p){return 'img/'+p.key+'-'+(small()?'2':'1')+'.webp'}
var heroSet=[P[0],P[1],P[2],P[4],P[5]];
heroSet.forEach(function(p,i){var b=document.createElement('button');b.setAttribute('aria-label','Show '+p.name);b.innerHTML='<i></i>';b.onclick=function(){go(i)};bars.appendChild(b)});
cur.src=first.src=hsrc(heroSet[0]);
function setBars(){$$('button',bars).forEach(function(b,i){b.className=i<hi?'done':'';if(i===hi){void b.offsetWidth;b.className='act'}})}
function heroPlay(){setBars();clearTimeout(timer);timer=setTimeout(function(){go((hi+1)%heroSet.length)},DUR)}
function caption(p){var t=$('.hc-t');t.classList.add('swap');setTimeout(function(){$('#heroN').textContent=pad(hi+1);$('#heroName').textContent=p.name;$('#heroPlace').textContent=p.place;t.classList.remove('swap')},600)}
/* WebGL dissolve */
var gl=null,prog=null,tex=[],U={};
function initGL(){
  try{gl=cv.getContext('webgl',{antialias:false,alpha:false,powerPreference:'low-power'})}catch(e){gl=null}
  if(!gl)return false;
  var vs='attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  var fs='precision mediump float;varying vec2 v;uniform sampler2D a,b;uniform float t;uniform vec2 r,sa,sb;'+
  'vec2 cov(vec2 u,vec2 s){float ra=r.x/r.y,ri=s.x/s.y;vec2 k=ra>ri?vec2(1.,ri/ra):vec2(ra/ri,1.);return (u-.5)*k+.5;}'+
  'void main(){float w=v.x*.55+(1.-v.y)*.2;float e=clamp(t*1.75-w,0.,1.);e=e*e*(3.-2.*e);'+
  'float f=1.-e;vec2 ua=(cov(v,sa)-.5)*(1.-e*.14)+.5;ua.x+=e*.06;vec2 ub=(cov(v,sb)-.5)*(1.-f*.14)+.5;ub.x-=f*.06;'+
  'vec3 c=mix(texture2D(a,ua).rgb,texture2D(b,ub).rgb,e);float g=e*(1.-e)*4.;c+=g*.05;gl_FragColor=vec4(c,1.);}';
  function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o}
  prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,vs));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){gl=null;return false}
  gl.useProgram(prog);
  var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  var l=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);
  ['a','b','t','r','sa','sb'].forEach(function(n){U[n]=gl.getUniformLocation(prog,n)});
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  for(var i=0;i<2;i++){tex[i]=gl.createTexture();gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex[i]);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE)}
  gl.uniform1i(U.a,0);gl.uniform1i(U.b,1);return true;
}
var glTried=false;
function go(i){
  if(busy||i===hi||document.hidden&&0)return;busy=true;clearTimeout(timer);
  var p=heroSet[i],im=new Image();
  im.onload=function(){
    hi=i;caption(p);setBars();
    var useGL=!small()&&window.matchMedia('(pointer:fine)').matches;
    if(useGL&&!glTried){glTried=true;initGL()}
    if(useGL&&gl){
      try{
        var dpr=Math.min(window.devicePixelRatio||1,2),w=cv.clientWidth,h=cv.clientHeight;cv.width=w*dpr;cv.height=h*dpr;gl.viewport(0,0,cv.width,cv.height);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex[0]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,cur);
        gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tex[1]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,im);
        gl.uniform2f(U.r,w,h);gl.uniform2f(U.sa,cur.naturalWidth,cur.naturalHeight);gl.uniform2f(U.sb,im.naturalWidth,im.naturalHeight);
        var t0=performance.now(),T=1900;gl.uniform1f(U.t,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);cv.classList.add('on');
        (function fr(now){var k=clamp((now-t0)/T,0,1),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;gl.uniform1f(U.t,e);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
          if(k<1)requestAnimationFrame(fr);else{cur.src=im.src;cur.alt=p.name+' by VSHD Design';var fin=function(){requestAnimationFrame(function(){cv.classList.remove('on');done()})};(cur.decode?cur.decode().then(fin,fin):fin())}})(t0);
        return;
      }catch(e){gl=null}
    }
    nxt.src=im.src;requestAnimationFrame(function(){nxt.classList.add('show');setTimeout(function(){cur.src=im.src;cur.alt=p.name+' by VSHD Design';setTimeout(function(){nxt.classList.remove('show');done()},120)},1700)});
  };
  im.onerror=function(){busy=false;heroPlay()};
  im.src=hsrc(p);
}
function done(){busy=false;clearTimeout(timer);timer=setTimeout(function(){go((hi+1)%heroSet.length)},DUR)}
$('#heroCap').onclick=function(){openProject(heroSet[hi].slug)};
document.addEventListener('visibilitychange',function(){if(document.hidden)clearTimeout(timer);else if(started&&!busy)heroPlay()});

/* ---------- work track ---------- */
var track=$('#track'),work=$('#work');
P.forEach(function(p,i){
  var b=document.createElement('button');b.className='card';b.setAttribute('data-slug',p.slug);b.setAttribute('data-hover','');
  b.innerHTML='<div class="card-img"><img loading="lazy" src="img/'+p.key+'-'+(p.key==='bateen'?'1':'2')+'-s.webp" alt="'+p.name+', '+p.place+'"></div><div class="card-meta"><b>'+p.name+'</b><span>'+pad(i+1)+'</span></div><p class="card-sub">'+p.type+', '+p.place+'</p>';
  b.onclick=function(){openProject(p.slug)};track.appendChild(b);
});
var end=document.createElement('div');end.className='card-end';end.innerHTML='<p class="label" style="margin-bottom:18px">More than forty works</p><a href="#index">See the full index</a>';track.appendChild(end);
var maxX=0,tx=0,target=0,cards=$$('.card',track),imgs=cards.map(function(c){return $('img',c)});
function measure(){
  if(small()){work.style.height='';maxX=0;track.style.transform='';return}
  maxX=Math.max(0,track.scrollWidth-window.innerWidth);work.style.height=(window.innerHeight+maxX)+'px';
}
function workTick(){
  if(!small()&&maxX>0){
    var pr=clamp((window.scrollY-work.offsetTop)/maxX,0,1);target=-pr*maxX;tx+=(target-tx)*.09;if(Math.abs(target-tx)<.05)tx=target;
    track.style.transform='translate3d('+tx.toFixed(2)+'px,0,0)';
    $('#workProg').style.transform='scaleX('+pr.toFixed(4)+')';
    var vw=window.innerWidth;
    for(var i=0;i<cards.length;i++){var r=cards[i].offsetLeft+tx,c=(r+cards[i].offsetWidth/2-vw/2)/vw;if(c>-1.2&&c<1.2)imgs[i].style.transform='translate3d('+(-c*5).toFixed(2)+'%,0,0)';
      if(Math.abs(c)<.25&&$('#workCount').textContent.slice(0,2)!==pad(i+1))$('#workCount').textContent=pad(i+1)+' / '+pad(P.length)}
  }
  requestAnimationFrame(workTick);
}
track.addEventListener('scroll',function(){if(!small())return;var m=track.scrollWidth-track.clientWidth,pr=m>0?track.scrollLeft/m:0;$('#workProg').style.transform='scaleX('+pr.toFixed(3)+')';
  var i=clamp(Math.round(pr*(P.length)),1,P.length);$('#workCount').textContent=pad(i)+' / '+pad(P.length)},{passive:true});
window.addEventListener('resize',measure);window.addEventListener('load',measure);measure();setTimeout(measure,1500);requestAnimationFrame(workTick);

/* ---------- statement fill, header, band, whatsapp ---------- */
var fill=$('#fill');fill.innerHTML=fill.textContent.trim().split(/\s+/).map(function(w){return '<span>'+w+'</span>'}).join(' ');
var words=$$('span',fill),top=$('#top'),wa=$('#wa'),hero=$('#home'),band=$('.band'),bandImg=$('.band-img'),lastY=0,tick=false;
function onScroll(){
  var y=window.scrollY,vh=window.innerHeight,hh=hero.offsetHeight;
  top.classList.toggle('solid',y>hh-70);top.classList.toggle('on-dark',y<=hh-70);
  top.classList.toggle('hide',y>hh&&y>lastY+4&&!document.body.classList.contains('menu-open'));if(y<lastY-4)top.classList.remove('hide');lastY=y;
  wa.classList.toggle('show',y>hh*.75);
  var r=fill.getBoundingClientRect(),pr=clamp((vh*.86-r.top)/(r.height+vh*.4),0,1),n=Math.round(pr*words.length);
  for(var i=0;i<words.length;i++)words[i].classList.toggle('on',i<n);
  var b=band.getBoundingClientRect();if(b.bottom>0&&b.top<vh){var k=(b.top+b.height/2-vh/2)/vh;bandImg.style.transform='translate3d(0,'+(-k*9).toFixed(2)+'%,0)'}
  tick=false;
}
window.addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(onScroll)}},{passive:true});onScroll();

/* ---------- reveals ---------- */
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
$$('.rv,.reveal-img').forEach(function(el,i){io.observe(el)});
$$('.services li,.awards li').forEach(function(el,i){el.style.transitionDelay=(i%9*70)+'ms'});

/* ---------- index ---------- */
$('#indexList').innerHTML=D.index.map(function(n){var s=D.indexLinks[n];return '<li>'+(s?'<a href="#/'+s+'">'+n+'</a>':'<span>'+n+'</span>')+'</li>'}).join('');

/* ---------- menu ---------- */
var burger=$('#burger');
function menu(o){document.body.classList.toggle('menu-open',o);burger.setAttribute('aria-expanded',o);$('#menu').setAttribute('aria-hidden',!o)}
burger.onclick=function(){menu(!document.body.classList.contains('menu-open'))};
$$('#menu a').forEach(function(a){a.addEventListener('click',function(){menu(false)})});

/* ---------- project sheet ---------- */
var sheet=$('#sheet'),sbody=$('#sheetBody'),sscroll=$('#sheetScroll'),openSlug=null;
function render(p){
  var i=P.indexOf(p),nx=P[(i+1)%P.length],g='',dims=p.dims||{};
  for(var k=2;k<=p.n;k++){g+='<figure data-k="'+k+'"><img loading="lazy" src="img/'+p.key+'-'+k+'.webp" alt="'+p.name+' by VSHD Design, view '+k+'" onload="if(this.naturalWidth>this.naturalHeight)this.parentNode.classList.add(\'land\')"></figure>'}
  var heroK='1';
  sbody.innerHTML='<div class="pj-hero"><img src="img/'+p.key+'-'+heroK+'.webp" alt="'+p.name+', '+p.place+'"></div>'+
  '<div class="pj-head"><p class="label">Project '+pad(i+1)+'</p><h2>'+p.name+'</h2><div class="pj-meta"><div><span>Location</span>'+p.place+'</div><div><span>Year</span>'+p.year+'</div><div><span>Type</span>'+p.type+'</div><div><span>Photography</span>'+p.photo+'</div></div></div>'+
  '<div class="pj-text"><p class="pj-lead">'+p.lead+'</p><div class="pj-body">'+p.text.map(function(t){return '<p>'+t+'</p>'}).join('')+'</div></div>'+
  '<div class="pj-gal">'+g+'</div><p class="pj-credit">Design by VSHD Design. Photography by '+p.photo+'.</p>'+
  '<button class="pj-next" data-next="'+nx.slug+'"><span>Next project</span><b>'+nx.name+'</b></button>';
  $('.pj-next',sbody).onclick=function(){location.hash='#/'+nx.slug};
  sscroll.scrollTop=0;
}
function openProject(slug){if(location.hash!=='#/'+slug)location.hash='#/'+slug;else route()}
function route(){
  var m=location.hash.match(/^#\/([a-z0-9-]+)/),p=m&&P.filter(function(x){return x.slug===m[1]})[0];
  if(p){render(p);openSlug=p.slug;sheet.classList.add('open');sheet.setAttribute('aria-hidden','false');document.body.classList.add('lock');document.title=p.name+' | VSHD Design'}
  else if(openSlug){openSlug=null;sheet.classList.remove('open');sheet.setAttribute('aria-hidden','true');document.body.classList.remove('lock');document.title='VSHD Design | Architecture and Interior Architecture, Dubai'}
}
function closeSheet(){if(!openSlug)return;history.pushState(null,'',location.pathname+location.search);route()}
$('#sheetX').onclick=closeSheet;
window.addEventListener('hashchange',route);window.addEventListener('popstate',route);
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeSheet();menu(false)}});
route();

/* ---------- form ---------- */
$('#form').addEventListener('submit',function(e){
  e.preventDefault();var f=e.target,n=f.name.value.trim(),note=$('#formNote');
  if(!n){note.textContent='Please add your name so the studio knows who is writing.';f.name.focus();return}
  var t='Hello VSHD Design,\n\nMy name is '+n+'.\nProject type: '+f.type.value+(f.place.value.trim()?'\nLocation: '+f.place.value.trim():'')+(f.msg.value.trim()?'\n\n'+f.msg.value.trim():'');
  note.textContent='Opening WhatsApp with your message.';
  window.open('https://wa.me/971504515402?text='+encodeURIComponent(t),'_blank','noopener');
});

/* ---------- cursor ---------- */
if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){
  var dot=$('#curDot'),ring=$('#curRing'),mx=-100,my=-100,rx=-100,ry=-100;
  window.addEventListener('mousemove',function(e){mx=e.clientX;my=e.clientY;dot.style.transform='translate3d('+mx+'px,'+my+'px,0)'},{passive:true});
  (function loop(){rx+=(mx-rx)*.16;ry+=(my-ry)*.16;ring.style.transform='translate3d('+rx.toFixed(1)+'px,'+ry.toFixed(1)+'px,0)';requestAnimationFrame(loop)})();
  document.addEventListener('mouseover',function(e){ring.classList.toggle('big',!!(e.target.closest&&e.target.closest('a,button,.card')))});
}
})();
