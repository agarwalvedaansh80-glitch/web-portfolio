(function(){
'use strict';
var D=window.VSHD,$=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
var ORDER=['orijins','origami','imdad','jumeirah','bateen','pool'];
var P=ORDER.map(function(k){return D.projects.filter(function(p){return p.key===k})[0]});
/* image roles per project: wide (desktop full screen), tall (phone full screen), card, hover */
var IM={pool:{w:'pool-1',t:'pool-2',c:'pool-5',h:'pool-6',wh:'pool-1',th:'pool-4'},orijins:{w:'orijins-1',t:'orijins-2',c:'orijins-5',h:'orijins-4'},origami:{w:'origami-1',t:'origami-2',c:'origami-4',h:'origami-3'},
  bateen:{w:'bateen-1',t:'bateen-2',c:'bateen-5',h:'bateen-4',th:'bateen-1'},imdad:{w:'imdad-1',t:'imdad-2',c:'imdad-7',h:'imdad-3'},jumeirah:{w:'jumeirah-1',t:'jumeirah-7',c:'jumeirah-5',h:'jumeirah-7',wh:'jumeirah-2',th:'jumeirah-5'}};
var small=function(){return window.innerWidth<=800};
var fine=window.matchMedia('(hover:hover) and (pointer:fine)').matches;
var pad=function(n){return (n<10?'0':'')+n};
var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};
var ease=function(k){return k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2};
var src=function(n){return 'img/'+n+'.webp'};
var cache={};
function loadImg(u){if(!cache[u])cache[u]=new Promise(function(res,rej){var im=new Image();im.onload=function(){(im.decode?im.decode():Promise.resolve()).then(function(){res(im)},function(){res(im)})};im.onerror=rej;im.src=u});return cache[u]}
var mouse={x:0,y:0,tx:0,ty:0};

/* ---------- WebGL stage ---------- */
var VS='attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
var FS='precision highp float;varying vec2 v;uniform sampler2D a,b;uniform float t,time,za,zb,mode;uniform vec2 r,sa,sb,m,pt;'+
'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}'+
'float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}'+
'float fbm(vec2 p){float s=0.,k=.5;for(int i=0;i<4;i++){s+=k*n2(p);p=p*2.03+7.1;k*=.5;}return s/.9375;}'+
'vec2 cov(vec2 u,vec2 s,float z){float ra=r.x/r.y,ri=s.x/s.y;vec2 k=ra>ri?vec2(1.,ri/ra):vec2(ra/ri,1.);return (u-.5)*k/z+.5;}'+
'void main(){vec2 u=v;vec3 c;vec2 par=m*.008;'+
'if(t<=0.0001&&mode<1.5){c=texture2D(a,cov(u,sa,za)+par).rgb;}else{'+
'vec2 q=u*vec2(r.x/r.y,1.);float n=fbm(q*2.4+time*.03);float nb=fbm(q*2.4+31.7-time*.03);vec2 dir=vec2(n-.5,nb-.5);float e;vec2 ua,ub;'+
'if(mode<.5){float th=n*.75+u.x*.25;e=smoothstep(0.,.45,t*1.35-th*.9);'+
'ua=cov(u,sa,za*(1.+t*.1))+dir*t*.07+par;ub=cov(u,sb,zb*(1.1-t*.1))-dir*(1.-t)*.07+par;}'+
'else if(mode<1.5){float th=u.y+(n-.5)*.42+sin(u.x*5.+time*.6)*.025;float w=t*1.56-.28;e=1.-smoothstep(w-.035,w+.035,th);float band=exp(-abs(th-w)*9.);'+
'ua=cov(u,sa,za)+vec2(dir.x*.5,1.)*band*.05+vec2(0.,t*.05)+par;ub=cov(u,sb,zb*(1.12-t*.12))-vec2(dir.x*.5,1.)*band*.05+par;}'+
'else{float d=distance(q,pt*vec2(r.x/r.y,1.));float R=t*1.9;e=1.-smoothstep(R-.4,R,d+(n-.5)*.45);float k=sin(min(t,1.)*3.14159);'+
'ua=cov(u,sa,1.)+dir*k*.06;ub=cov(u,sb,1.06-t*.06)-dir*(1.-t)*.06;}'+
'c=mix(texture2D(a,ua).rgb,texture2D(b,ub).rgb,e);}'+
'c+=(h(u*r+time)-.5)*.022;gl_FragColor=vec4(c,1.);}';
function Stage(el,mode){
  this.el=el;this.cv=$('canvas',el);this.fb=$('.fb',el);this.mode=mode;this.t=0;this.za=1.04;this.zb=1.04;this.busy=false;this.vis=true;this.flip=0;this.sz=[[1,1],[1,1]];this.pt=[.5,.5];this.has=false;
  var gl=null;try{gl=this.cv.getContext('webgl',{antialias:false,alpha:false,powerPreference:'high-performance'})}catch(e){}
  if(!gl)return;
  var sh=function(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);return o};
  var pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return;
  gl.useProgram(pr);
  var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  var l=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,2,gl.FLOAT,false,0,0);
  var U=this.U={};['a','b','t','time','za','zb','mode','r','sa','sb','m','pt'].forEach(function(n){U[n]=gl.getUniformLocation(pr,n)});
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  this.tex=[0,1].map(function(i){var t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t});
  this.gl=gl;el.classList.add('gl');
  var self=this;this.cv.addEventListener('webglcontextlost',function(e){e.preventDefault();self.gl=null;el.classList.remove('gl');if(self.last)self.fb.src=self.last.src});
}
Stage.prototype.up=function(unit,img){var gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,this.tex[unit]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);this.sz[unit]=[img.naturalWidth,img.naturalHeight]};
Stage.prototype.set=function(img){this.last=img;this.has=true;if(!this.gl){this.fb.src=img.src;return}this.up(this.flip,img);this.t=0};
Stage.prototype.setB=function(img){if(this.gl)this.up(1-this.flip,img)};
Stage.prototype.to=function(img,dur,done){
  var self=this;this.last=img;this.busy=true;
  if(!this.gl){this.fb.classList.add('fade');setTimeout(function(){self.fb.src=img.src;self.fb.classList.remove('fade');setTimeout(function(){self.busy=false;done&&done()},800)},800);return}
  try{this.up(1-this.flip,img)}catch(e){this.busy=false;done&&done();return}
  this.zb=this.za;this.t0=performance.now();this.dur=dur;this.done=done;
};
Stage.prototype.frame=function(now){
  var gl=this.gl;if(!gl||!this.vis||!this.has)return;
  var dpr=Math.min(window.devicePixelRatio||1,2),w=Math.round(this.cv.clientWidth*dpr),hh=Math.round(this.cv.clientHeight*dpr);
  if(!w||!hh)return;
  if(this.cv.width!==w||this.cv.height!==hh){this.cv.width=w;this.cv.height=hh;gl.viewport(0,0,w,hh)}
  var fin=false;
  if(this.busy&&this.t0){var k=clamp((now-this.t0)/this.dur,0,1);this.t=ease(k);if(k>=1)fin=true}
  if(fin){this.flip=1-this.flip;this.t=0;this.za=this.zb;this.t0=0}
  var U=this.U,f=this.flip;
  gl.uniform1i(U.a,f);gl.uniform1i(U.b,1-f);gl.uniform1f(U.t,this.t);gl.uniform1f(U.time,(now/1000)%600);gl.uniform1f(U.za,this.za);gl.uniform1f(U.zb,this.zb);gl.uniform1f(U.mode,this.mode);
  gl.uniform2f(U.r,w,hh);gl.uniform2f(U.sa,this.sz[f][0],this.sz[f][1]);gl.uniform2f(U.sb,this.sz[1-f][0],this.sz[1-f][1]);
  gl.uniform2f(U.m,this.mode<1.5?mouse.x:0,this.mode<1.5?-mouse.y:0);gl.uniform2f(U.pt,this.pt[0],this.pt[1]);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  if(fin){this.busy=false;var d=this.done;this.done=null;d&&d()}
};

/* ---------- kinetic text ---------- */
function ktHTML(t){var n=0;return t.split(' ').map(function(w){return '<span class="w">'+w.split('').map(function(c){return '<span class="c" style="transition-delay:'+((n++)*22)+'ms">'+c+'</span>'}).join('')+'</span>'}).join(' ')}
function ktSet(el,t,now){
  el.classList.add('kt');
  if(now){el.classList.toggle('long',t.length>14);el.innerHTML=ktHTML(t);return}
  el.classList.add('out');
  setTimeout(function(){el.classList.remove('out');el.classList.add('pre');el.classList.toggle('long',t.length>14);el.innerHTML=ktHTML(t);void el.offsetWidth;el.classList.remove('pre')},1250);
}
function swSet(span,t,delay){var w=span.parentNode;setTimeout(function(){w.classList.add('out');setTimeout(function(){w.classList.remove('out');w.classList.add('pre');span.textContent=t;void w.offsetWidth;w.classList.remove('pre')},1000)},delay||0)}

/* ---------- hero ---------- */
var heroSet=['pool','bateen','jumeirah'].map(function(k){return P.filter(function(p){return p.key===k})[0]});
var heroEl=$('#home'),hero=new Stage($('#heroStage'),0),hi=0,hTimer=null,DUR=7000,started=false,hStart=0,intro=0;
function hsrc(p){var m=IM[p.key];return src(small()?(m.th||m.t):(m.wh||m.w))}
var prog=$('#heroProg');
heroSet.forEach(function(p,i){var b=document.createElement('button');b.setAttribute('aria-label','Show '+p.name);b.setAttribute('data-cur','Show');b.innerHTML='<span>'+p.name+'</span><i></i><b>'+pad(i+1)+'</b>';b.onclick=function(){heroGo(i)};prog.appendChild(b)});
prog.style.setProperty('--dur',(DUR/1000)+'s');
function setProg(){$$('button',prog).forEach(function(b,i){b.className='';if(i===hi&&started){void b.offsetWidth;b.className='act'}})}
function heroText(p,now){
  if(now){ktSet($('#heroTitle'),p.name,true);$('#heroType').textContent=p.type;$('#heroPlace').textContent=p.place+', '+p.year.replace('Awarded ','');return}
  ktSet($('#heroTitle'),p.name);swSet($('#heroType'),p.type,100);swSet($('#heroPlace'),p.place+', '+p.year.replace('Awarded ',''),250);
}
function heroQueue(){clearTimeout(hTimer);hTimer=setTimeout(function(){heroGo((hi+1)%heroSet.length)},DUR)}
function heroGo(i){
  if(hero.busy||i===hi||!started)return;clearTimeout(hTimer);hero.busy=true;
  var p=heroSet[i];
  loadImg(hsrc(p)).then(function(im){
    hi=i;heroText(p);setProg();$$('button',prog).forEach(function(b){b.className=b.className});
    hero.fb.alt=p.name+' by VSHD Design';
    hero.to(im,2000,function(){hStart=performance.now();heroQueue()});
  },function(){hero.busy=false;heroQueue()});
}
heroText(heroSet[0],true);
$('#heroOpen').onclick=function(){openProject(heroSet[hi].slug)};
document.addEventListener('visibilitychange',function(){if(document.hidden)clearTimeout(hTimer);else if(started&&!hero.busy){setProg();heroQueue()}});

/* ---------- loader ---------- */
var lp=0,lt=0,lNum=$('#loadNum'),lBar=$('#loadBar'),ready=false,minT=performance.now()+2300;
(function lf(){lp+=(lt-lp)*.06;if(lt-lp<.4)lp=lt;lNum.textContent=pad(Math.round(lp));lBar.style.transform='scaleX('+(lp/100).toFixed(3)+')';
  if(lp>=99.6&&ready&&performance.now()>minT){start();return}requestAnimationFrame(lf)})();
function start(){if(started)return;started=true;lNum.textContent='100';intro=performance.now();hStart=intro;document.body.classList.remove('is-loading');setTimeout(function(){setProg();heroQueue()},1500)}
lt=30;
loadImg(hsrc(heroSet[0])).then(function(im){hero.set(im);lt=80;loadImg(hsrc(heroSet[1]));return document.fonts&&document.fonts.ready}).then(function(){lt=100;ready=true},function(){lt=100;ready=true});
setTimeout(function(){lt=100;ready=true},5000);

/* ---------- signature ---------- */
var sig=$('#work'),sigS=new Stage($('#sigStage'),1),si=-1,sigWant=0,sigNav=$('#sigNav'),sigF=0;
function ssrc(p){var m=IM[p.key];return src(small()?m.t:m.w)}
P.forEach(function(p,i){var li=document.createElement('li');li.textContent=p.name;li.setAttribute('data-cur','Go');li.onclick=function(){scrollToY(sig.offsetTop+i*(sig.offsetHeight-window.innerHeight)/(P.length-1))};sigNav.appendChild(li)});
function sigText(p,i,now){
  var set=[['#sigNum',pad(i+1)],['#sigLead',p.lead],['#sigPlace',p.place],['#sigYear',p.year],['#sigType',p.type],['#sigPhoto',p.photo]];
  $$('li',sigNav).forEach(function(l,k){l.classList.toggle('act',k===i)});
  if(now){ktSet($('#sigTitle'),p.name,true);set.forEach(function(s){$(s[0]).textContent=s[1]});$('#sigCount').textContent=pad(i+1);return}
  ktSet($('#sigTitle'),p.name);set.forEach(function(s,k){swSet($(s[0]),s[1],k*70)});setTimeout(function(){$('#sigCount').textContent=pad(i+1)},900);
}
function sigGo(i){
  if(sigS.busy||i===si)return;var p=P[i];
  if(si<0){si=i;sigText(p,i,true);loadImg(ssrc(p)).then(function(im){sigS.set(im)});return}
  sigS.busy=true;
  loadImg(ssrc(p)).then(function(im){si=i;sigText(p,i);sigS.to(im,1900,function(){if(P[i+1])loadImg(ssrc(P[i+1]))})},function(){sigS.busy=false});
}
$('#sigOpen').onclick=function(){if(si>=0)openProject(P[si].slug)};
var sigPrimed=false;

/* ---------- rooms grid ---------- */
var grid=$('#grid'),cards=[];
P.forEach(function(p,i){
  var m=IM[p.key],b=document.createElement('button');b.className='g-card';b.setAttribute('data-cur','View');
  b.innerHTML='<div class="g-img"><div class="g-par"><img loading="lazy" src="'+src(m.c)+'" alt="'+p.name+', '+p.place+', by VSHD Design"></div></div><div class="g-meta"><b>'+p.name+'</b><span>'+pad(i+1)+'</span></div><p class="g-sub">'+p.type+', '+p.place+'</p>';
  b.onclick=function(){openProject(p.slug)};grid.appendChild(b);cards.push({el:b,par:$('.g-par',b),p:p});
});
/* hover: liquid reveal of a second photograph, one shared canvas */
if(fine){
  var hvWrap=document.createElement('div');hvWrap.innerHTML='<img class="fb" alt="" style="display:none"><canvas></canvas>';
  var hv=null,hvCard=null,hvT=0,hvGoal=0,hvCv=$('canvas',hvWrap);
  cards.forEach(function(c){
    c.el.addEventListener('mouseenter',function(e){
      if(!hv){hv=new Stage(hvWrap,2);if(!hv.gl)return}
      if(!hv.gl)return;
      var m=IM[c.p.key];hvCard=c;hvGoal=0;hvT=0;hvCv.classList.remove('on');
      Promise.all([loadImg(src(m.c)),loadImg(src(m.h))]).then(function(a){if(hvCard!==c)return;c.par.appendChild(hvCv);hv.flip=0;hv.set(a[0]);hv.setB(a[1]);hvGoal=1;hvCv.classList.add('on')},function(){});
    });
    c.el.addEventListener('mousemove',function(e){if(hv&&hvCard===c){var r=hvCv.getBoundingClientRect();if(r.width)hv.pt=[(e.clientX-r.left)/r.width,1-(e.clientY-r.top)/r.height]}});
    c.el.addEventListener('mouseleave',function(){if(hvCard===c)hvGoal=0});
  });
}

/* ---------- text fill, index ---------- */
var fill=$('#fill');fill.innerHTML=fill.textContent.trim().split(/\s+/).map(function(w){return '<span>'+w+'</span>'}).join(' ');
var words=$$('span',fill);
$('#indexList').innerHTML=D.index.map(function(n){var s=D.indexLinks[n];return '<li>'+(s?'<a href="#/'+s+'" data-cur="Open">'+n+'</a>':'<span>'+n+'</span>')+'</li>'}).join('');

/* ---------- smooth inertia scroll (fine pointers) ---------- */
var S={t:window.scrollY,c:window.scrollY,run:false};
function maxY(){return document.documentElement.scrollHeight-window.innerHeight}
function blocked(){return document.body.classList.contains('lock')||document.body.classList.contains('menu-open')}
function scrollToY(y){y=clamp(y,0,maxY());if(fine){S.t=y;S.run=true}else window.scrollTo({top:y,behavior:'smooth'})}
if(fine){
  window.addEventListener('wheel',function(e){
    if(e.ctrlKey||blocked())return;e.preventDefault();
    var d=e.deltaY*(e.deltaMode===1?32:e.deltaMode===2?window.innerHeight:1);
    if(!S.run){S.c=S.t=window.scrollY}
    S.t=clamp(S.t+d,0,maxY());S.run=true;
  },{passive:false});
  window.addEventListener('scroll',function(){if(!S.run)S.c=S.t=window.scrollY},{passive:true});
}
document.addEventListener('click',function(e){
  var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;var h=a.getAttribute('href');
  if(h.indexOf('#/')===0){e.preventDefault();openProject(h.slice(2));return}
  var t=h.length>1&&$(h);if(!t)return;e.preventDefault();menu(false);
  if(openSlug)closeSheet();
  scrollToY(t.getBoundingClientRect().top+window.scrollY);
});

/* ---------- main loop ---------- */
var top=$('#top'),wa=$('#wa'),band=$('.band'),bandImg=$('.band-img'),lastY=0,sigProg=$('#sigProg');
var heroVis=true,sigVis=false;
new IntersectionObserver(function(es){heroVis=es[0].isIntersecting},{}).observe(heroEl);
new IntersectionObserver(function(es){sigVis=es[0].isIntersecting;if(sigVis&&!sigPrimed){sigPrimed=true;if(si<0)sigGo(0)}},{rootMargin:'60% 0px 60% 0px'}).observe(sig);
function loop(now){
  if(S.run){S.c+=(S.t-S.c)*.085;if(Math.abs(S.t-S.c)<.4){S.c=S.t;S.run=false}window.scrollTo(0,S.c)}
  var y=window.scrollY,vh=window.innerHeight,hh=heroEl.offsetHeight;
  mouse.x+=(mouse.tx-mouse.x)*.04;mouse.y+=(mouse.ty-mouse.y)*.04;
  /* header, whatsapp */
  if(y!==lastY||now<3000){
    top.classList.toggle('solid',y>60);
    if(y>hh*.6&&y>lastY+3&&!document.body.classList.contains('menu-open'))top.classList.add('hide');else if(y<lastY-3||y<=hh*.6)top.classList.remove('hide');
    wa.classList.toggle('show',y>hh*.8);
    var r=fill.getBoundingClientRect();if(r.bottom>0&&r.top<vh){var pr=clamp((vh*.86-r.top)/(r.height+vh*.36),0,1),n=Math.round(pr*words.length);for(var i=0;i<words.length;i++)words[i].classList.toggle('on',i<n)}
    var b=band.getBoundingClientRect();if(b.bottom>0&&b.top<vh){var k=(b.top+b.height/2-vh/2)/vh;bandImg.style.transform='translate3d(0,'+(-k*9).toFixed(2)+'%,0)'}
    for(var j=0;j<cards.length;j++){var cr=cards[j].el.getBoundingClientRect();if(cr.bottom>-200&&cr.top<vh+200){var ck=(cr.top+cr.height/2-vh/2)/vh;cards[j].par.style.transform='translate3d(0,'+(ck*-7).toFixed(2)+'%,0)'}}
    lastY=y;
  }
  /* hero stage */
  if(heroVis&&!openSlug){
    var ik=intro?clamp((now-intro)/2800,0,1):0,io=1-Math.pow(1-ik,4);
    hero.vis=true;hero.za=1.035+(intro?.045*clamp((now-hStart)/(DUR+2500),0,1):0)+(1-io)*.22;
    if(hero.busy)hero.zb=1.035;
    hero.frame(now);
  }
  /* signature */
  if(sigVis&&!openSlug){
    var total=sig.offsetHeight-vh,sp=clamp((y-sig.offsetTop)/total,0,1),f=sp*(P.length-1),want=Math.round(f);
    sigF+=(f-sigF)*.08;
    if(si>=0&&want!==si&&!sigS.busy)sigGo(want);
    sigProg.style.transform='scaleX('+sp.toFixed(4)+')';
    sigS.za=sigS.zb=1.05+clamp(sigF-(si<0?0:si),-1,1)*.035;
    sigS.frame(now);
  }
  /* card hover */
  if(fine&&hv&&hv.gl&&hvCard){hvT+=(hvGoal-hvT)*.045;if(hvGoal===0&&hvT<.01){hvCv.classList.remove('on');hvCard=null}else{hv.t=Math.max(hvT,.0002);hv.vis=true;hv.frame(now)}}
  /* service float */
  if(fl.on){fl.x+=(cx-fl.x)*.1;fl.y+=(cy-fl.y)*.1;flEl.style.transform='translate3d('+(fl.x+170).toFixed(1)+'px,'+fl.y.toFixed(1)+'px,0)'}
  /* cursor */
  if(fine){rx+=(cx-rx)*.16;ry+=(cy-ry)*.16;ring.style.transform='translate3d('+rx.toFixed(1)+'px,'+ry.toFixed(1)+'px,0)'}
  requestAnimationFrame(loop);
}

/* ---------- reveals ---------- */
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -7% 0px',threshold:.06});
$$('.rv,.clip,.g-card').forEach(function(el){io.observe(el)});
$$('.services li,.awards li,.facts div').forEach(function(el,i){el.style.transitionDelay=(i%9*80)+'ms'});

/* ---------- services image follow ---------- */
var flEl=$('#svcFloat'),flImg=$('#svcImg'),fl={on:false,x:0,y:0};
if(fine){$$('.services li').forEach(function(li){
  li.addEventListener('mouseenter',function(){var u=li.getAttribute('data-img');loadImg(u).then(function(){flImg.src=u});if(!fl.on){fl.x=cx;fl.y=cy}fl.on=true;flEl.classList.add('on')});
  li.addEventListener('mouseleave',function(){flEl.classList.remove('on');setTimeout(function(){if(!flEl.classList.contains('on'))fl.on=false},1000)});
})}

/* ---------- menu ---------- */
var burger=$('#burger');
function menu(o){document.body.classList.toggle('menu-open',o);burger.setAttribute('aria-expanded',o);burger.setAttribute('aria-label',o?'Close menu':'Open menu');$('#menu').setAttribute('aria-hidden',!o)}
burger.onclick=function(){menu(!document.body.classList.contains('menu-open'))};

/* ---------- project sheet ---------- */
var sheet=$('#sheet'),sbody=$('#sheetBody'),sscroll=$('#sheetScroll'),openSlug=null,gal=[],gi=0,sio=null;
function render(p){
  var i=P.indexOf(p),nx=P[(i+1)%P.length],g='',m=IM[p.key];gal=[];
  for(var k=2;k<=p.n;k++){gal.push(src(p.key+'-'+k));g+='<figure data-i="'+(k-2)+'" data-cur="Enlarge"><img src="'+src(p.key+'-'+k)+'" alt="'+p.name+' by VSHD Design, view '+k+'"></figure>'}
  sbody.innerHTML='<div class="pj-hero"><img src="'+src(small()&&p.key!=='bateen'?m.t:m.w)+'" alt="'+p.name+', '+p.place+'"><div class="pj-title"><p class="label">Project '+pad(i+1)+' of '+pad(P.length)+'</p><h2><span>'+p.name+'</span></h2></div></div>'+
  '<div class="pj-meta"><div><span>Location</span>'+p.place+'</div><div><span>Year</span>'+p.year+'</div><div><span>Type</span>'+p.type+'</div><div><span>Photography</span>'+p.photo+'</div></div>'+
  '<div class="pj-text"><p class="pj-lead">'+p.lead+'</p><div class="pj-body">'+p.text.map(function(t){return '<p>'+t+'</p>'}).join('')+'</div></div>'+
  '<div class="pj-gal">'+g+'</div><p class="pj-credit">Design by VSHD Design. Photography by '+p.photo+'.</p>'+
  '<button class="pj-next" data-cur="Next"><img loading="lazy" src="'+src(IM[nx.key].w)+'" alt=""><span>Next project</span><b>'+nx.name+'</b></button>';
  $('.pj-next',sbody).onclick=function(){sheet.classList.remove('open');setTimeout(function(){location.hash='#/'+nx.slug},700)};
  if(sio)sio.disconnect();
  sio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');sio.unobserve(e.target)}})},{root:sscroll,rootMargin:'0px 0px -6% 0px',threshold:.05});
  var col=0;
  $$('.pj-gal figure',sbody).forEach(function(f){
    var im=$('img',f),fn=function(){if(im.naturalWidth>im.naturalHeight)f.classList.add('land')};
    if(im.complete&&im.naturalWidth)fn();else im.addEventListener('load',fn);
    f.onclick=function(){lbOpen(+f.getAttribute('data-i'))};sio.observe(f);
  });
  /* stagger the second portrait of each pair, using known ratios once loaded */
  setTimeout(layoutGal,600);setTimeout(layoutGal,2500);
  sscroll.scrollTop=0;sheet.classList.remove('deep');
}
function layoutGal(){var col=0;$$('.pj-gal figure',sbody).forEach(function(f){if(f.classList.contains('land')){col=0;f.classList.remove('off')}else{f.classList.toggle('off',col===1);col=1-col}})}
function openProject(slug){if(location.hash!=='#/'+slug)location.hash='#/'+slug;else route()}
function route(){
  var m=location.hash.match(/^#\/([a-z0-9-]+)/),p=m&&P.filter(function(x){return x.slug===m[1]})[0];
  if(p){render(p);openSlug=p.slug;void sheet.offsetWidth;sheet.classList.add('open');sheet.setAttribute('aria-hidden','false');document.body.classList.add('lock');document.title=p.name+' | VSHD Design';clearTimeout(hTimer)}
  else if(openSlug){openSlug=null;lbClose();sheet.classList.remove('open');sheet.setAttribute('aria-hidden','true');document.body.classList.remove('lock');document.title='VSHD Design | Architecture and Interior Architecture, Dubai';S.run=false;if(started&&!hero.busy)heroQueue()}
}
function closeSheet(){if(!openSlug)return;history.pushState(null,'',location.pathname+location.search);route()}
$('#sheetX').onclick=closeSheet;
sscroll.addEventListener('scroll',function(){sheet.classList.toggle('deep',sscroll.scrollTop>window.innerHeight*.5)},{passive:true});
window.addEventListener('hashchange',route);window.addEventListener('popstate',route);

/* ---------- lightbox ---------- */
var lb=$('#lb'),lbImg=$('#lbImg');
function lbShow(i){gi=(i+gal.length)%gal.length;lbImg.classList.add('sw-out');loadImg(gal[gi]).then(function(){setTimeout(function(){lbImg.src=gal[gi];lbImg.classList.remove('sw-out')},350)});$('#lbCount').textContent=pad(gi+1)+' / '+pad(gal.length)}
function lbOpen(i){lbImg.removeAttribute('src');lb.classList.add('open');lb.setAttribute('aria-hidden','false');lbShow(i)}
function lbClose(){lb.classList.remove('open');lb.setAttribute('aria-hidden','true')}
$('#lbX').onclick=lbClose;$('#lbPrev').onclick=function(){lbShow(gi-1)};$('#lbNext').onclick=function(){lbShow(gi+1)};
lb.addEventListener('click',function(e){if(e.target===lb)lbClose()});
document.addEventListener('keydown',function(e){
  if(lb.classList.contains('open')){if(e.key==='Escape')lbClose();if(e.key==='ArrowRight')lbShow(gi+1);if(e.key==='ArrowLeft')lbShow(gi-1);return}
  if(e.key==='Escape'){closeSheet();menu(false)}
});

/* ---------- form ---------- */
$('#form').addEventListener('submit',function(e){
  e.preventDefault();var f=e.target,n=f.name.value.trim(),note=$('#formNote');
  if(!n){note.textContent='Please add your name so the studio knows who is writing.';f.name.focus();return}
  var t='Hello VSHD Design,\n\nMy name is '+n+'.\nProject type: '+f.type.value+(f.place.value.trim()?'\nLocation: '+f.place.value.trim():'')+(f.msg.value.trim()?'\n\n'+f.msg.value.trim():'');
  note.textContent='Opening WhatsApp with your message.';
  window.open('https://wa.me/971504515402?text='+encodeURIComponent(t),'_blank','noopener');
});

/* ---------- cursor ---------- */
var dot=$('#curDot'),ring=$('#curRing'),lab=$('#curLab'),cx=-100,cy=-100,rx=-100,ry=-100;
if(fine){
  document.documentElement.classList.add('has-cur');
  window.addEventListener('mousemove',function(e){cx=e.clientX;cy=e.clientY;mouse.tx=cx/window.innerWidth*2-1;mouse.ty=cy/window.innerHeight*2-1;dot.style.transform='translate3d('+cx+'px,'+cy+'px,0)'},{passive:true});
  document.addEventListener('mouseover',function(e){
    var t=e.target.closest&&e.target.closest('[data-cur]'),l=t&&t.getAttribute('data-cur');
    if(l){lab.textContent=l}
    ring.classList.toggle('lab',!!l);document.body.classList.toggle('cur-lab',!!l);
    ring.classList.toggle('big',!l&&!!(e.target.closest&&e.target.closest('a,button,input,select,textarea')));
  });
}
route();
requestAnimationFrame(loop);
})();
