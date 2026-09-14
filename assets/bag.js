/* Journey Bag — ONE guest's own lines (Owner, 14 Sep 2026): the authenticated
 * guest's selections, quantity one each, one total. The bag icon opens the
 * CART (cart.html); the sticky bar's VIEW goes to Review & Send when steps
 * 01–05 are complete and to the first missing item otherwise. */
(function(){
function authed(){try{var a=JSON.parse(localStorage.getItem('siyl.auth')||'null');return !!(a&&a.guestId&&a.bearer)}catch(e){return false}}
window.SIYL_BAG={
authed:authed,
get:function(){try{return JSON.parse(localStorage.getItem('siyl.bag')||'[]')}catch(e){return[]}},
set:function(b){localStorage.setItem('siyl.bag',JSON.stringify(b));this.badge();
try{document.dispatchEvent(new CustomEvent('siyl:bag'))}catch(e){}},
add:function(it){var b=this.get(),f=b.find(function(x){return x.id===it.id});
if(f){f.qty+=(it.qty||1)}else{it.qty=it.qty||1;b.push(it)}this.set(b);return f?f.qty:it.qty},
/* put: insert or REPLACE the line with the same id (variant switch) — keeps qty */
put:function(it){var b=this.get(),i=b.findIndex(function(x){return x.id===it.id});
if(i>=0){it.qty=it.qty||b[i].qty||1;b[i]=it}else{it.qty=it.qty||1;b.push(it)}this.set(b)},
has:function(id){return this.get().some(function(x){return x.id===id})},
remove:function(id){this.set(this.get().filter(function(x){return x.id!==id}))},
qty:function(id,d){var b=this.get(),f=b.find(function(x){return x.id===id});
if(f){f.qty=Math.max(1,f.qty+d);this.set(b)}},
total:function(){return this.get().reduce(function(t,x){return t+(x.price||0)*x.qty},0)},
/* display-only: thumbnails for bag lines persisted before the transport imagery existed */
THUMBS:{train:'assets/images/transport/train-no25-srt-train.jpg',mu9632:'assets/images/transport/mu9632-business-1.jpg',c642:'assets/images/transport/c642-train-snow-mountain.jpg','return':'assets/images/transport/mu5924-economy-cabin-1.jpg'},
thumb:function(x){return x.img||this.THUMBS[x.id]||''},
/* the badge counts the authenticated guest's own cart lines — nothing else */
badge:function(){var n=authed()?this.get().length:0,el=document.querySelector('[data-bag-badge]');
if(el){var was=el.textContent;el.textContent=n>0?n:'';el.style.display=n>0?'flex':'none';if(was!==el.textContent&&n>0){el.classList.remove('bb-tick');void el.offsetWidth;el.classList.add('bb-tick')}}}};
/* RETIRED PRODUCTS. C86 replaces C642 and MU9646 replaces MU9632 by Owner
 * order; the class and the amount are unchanged. A journey chosen before the
 * change keeps its place — the line is renamed, never dropped. */
(function(){var M={c642:{id:'c86',name:'C86 · Kunming → Lijiang'},
                   mu9632:{id:'mu9646',name:'MU9646 · Vientiane → Kunming'}};
var b=window.SIYL_BAG.get(),hit=false;
b.forEach(function(x){var m=M[x.id];if(m){x.id=m.id;x.name=m.name;hit=true}});
if(hit)window.SIYL_BAG.set(b)})();
document.addEventListener('DOMContentLoaded',function(){window.SIYL_BAG.badge()})})();

/* One engine, one total: the sticky Journey bar, the header badge, Your Journey,
 * Your Costs and Review & Send all read SIYL_BAG.total() — nothing recalculates. */
(function(){var B=window.SIYL_BAG;
B.money=function(n){return 'USD '+n.toLocaleString('en-US')};
B.bar=function(){
if(document.querySelector('.jbar'))return;
var css=document.createElement('style');
css.textContent='.jbar{position:fixed;left:0;right:0;bottom:0;z-index:55;background:#FCFAF6;border-top:1px solid #DAD9D7;padding:12px 20px calc(12px + env(safe-area-inset-bottom));display:none;transform:translateY(100%);transition:transform .26s cubic-bezier(.4,0,.2,1)}'+
'.jbar.on{display:block}.jbar.in{transform:none}body.jbar-on{padding-bottom:78px}'+
'.jb-t{transition:opacity .2s}.jb-t.tick{opacity:.35}'+
'@media (prefers-reduced-motion:reduce){.jbar,.jb-t{transition:none}}'+
'.jb-in{max-width:640px;margin:0 auto;display:flex;align-items:baseline;gap:12px}'+
'.jb-l{font-size:10px;letter-spacing:2.2px;text-transform:uppercase;color:#6B6964}'+
'.jb-t{font-family:"PP Editorial Old",serif;font-size:19px;margin-left:auto}'+
'.jb-a{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#313131;text-decoration:none;border-bottom:1px solid #313131;padding:6px 0 3px;margin-left:16px}';
document.head.appendChild(css);
var el=document.createElement('div');el.className='jbar';
el.innerHTML='<div class="jb-in"><span class="jb-l">Your Journey</span><span class="jb-t"></span><a class="jb-a" href="review.html" data-bag-view>View</a></div>';
document.body.appendChild(el);
/* VIEW respects the sequential flow: Review & Send when it may be entered, else the first missing item */
function dest(){var G=window.SIYL_GUEST;return (G&&G.nextHref)?G.nextHref():'review.html'}
function sync(){var n=B.authed()?B.get().length:0,t=el.querySelector('.jb-t'),v=B.money(B.total());
if(t.textContent!==v){t.classList.add('tick');t.textContent=v;setTimeout(function(){t.classList.remove('tick')},200)}
el.querySelector('[data-bag-view]').setAttribute('href',dest());
var on=n>0;el.classList.toggle('on',on);document.body.classList.toggle('jbar-on',on);
if(on)requestAnimationFrame(function(){el.classList.add('in')});else el.classList.remove('in')}
document.addEventListener('siyl:bag',sync);document.addEventListener('siyl:guest',sync);document.addEventListener('siyl:temple',sync);document.addEventListener('siyl:seats',sync);document.addEventListener('siyl:units',sync);document.addEventListener('siyl:auth',sync);document.addEventListener('siyl:signout',sync);sync()};
})();
