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
/* THE ONE TOTAL (Owner, 22 Sep 2026): the guest's own lines, plus the paid stay extension the room engine holds for them —
 * a confirmed cost of this journey, never a preview. Nothing else is added here, and a line is never counted twice. */
total:function(){return this.get().reduce(function(t,x){return t+(x.price||0)*x.qty},0)+this.extensionCost()},
extensionCost:function(){var U=window.SIYL_UNITS,e=U&&U.extension?U.extension():null;return e&&e.confirmed?(Number(e.total)||0):0},
/* display-only: thumbnails for bag lines persisted before the transport imagery existed */
THUMBS:{train:'assets/images/transport/train-no25-srt-train.jpg',mu9632:'assets/images/transport/mu9632-business-1.jpg',c642:'assets/images/transport/c642-train-snow-mountain.jpg','return':'assets/images/transport/mu5924-economy-cabin-1.jpg'},
thumb:function(x){return x.img||this.THUMBS[x.id]||''},
/* the badge counts the authenticated guest's own cart lines — nothing else */
badge:function(){var n=authed()?this.get().length:0,el=document.querySelector('[data-bag-badge]');
if(el){var was=el.textContent;el.textContent=n>0?n:'';el.style.display=n>0?'flex':'none';if(was!==el.textContent&&n>0){el.classList.remove('bb-tick');void el.offsetWidth;el.classList.add('bb-tick')}}}};
/* RETIRED PRODUCTS. C86 replaces C642 and MU9646 replaces MU9632 by Owner
 * order; the class is unchanged and the amount is re-derived from the one
 * pricing source (assets/pricing.js) on load. A journey chosen before the
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
'.jbar.on{display:block}.jbar.in{transform:none}body.jbar-on{padding-bottom:92px}'+
'.jb-t{transition:opacity .2s}.jb-t.tick{opacity:.35}'+
'@media (prefers-reduced-motion:reduce){.jbar,.jb-t{transition:none}}'+
'.jb-in{max-width:640px;margin:0 auto;display:flex;align-items:baseline;gap:12px}'+
'.jb-nav{max-width:640px;margin:0 auto;display:flex;justify-content:flex-end;min-height:0}.jb-nav a,.jb-nav button{font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:#6B6964;text-decoration:none;background:none;border:0;padding:4px 0;cursor:pointer;min-height:24px}.jb-nav a.on{color:#313131}.jb-top{margin-left:auto;color:#313131;visibility:hidden}.jb-top.show{visibility:visible}'+
'.jb-l{font-size:10px;letter-spacing:2.2px;text-transform:uppercase;color:#6B6964}'+
'.jb-t{font-family:"PP Editorial Old",serif;font-size:19px;margin-left:auto}'+
'.jb-a{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#313131;text-decoration:none;border-bottom:1px solid #313131;padding:6px 0 3px;margin-left:16px}';
document.head.appendChild(css);
var el=document.createElement('div');el.className='jbar';
el.innerHTML='<div class="jb-in"><span class="jb-l">My Bag</span><span class="jb-t"></span><a class="jb-a" href="cart.html" data-bag-view>Open My Bag</a></div>'+
 /* the account surfaces (My Trip · My Bag · My Profile · Sign out) live in the sticky header shell (Owner, 18 Sep 2026); this layer is the Bag summary and the way back to the top */
 '<div class="jb-nav"><button type="button" class="jb-top" data-nav="top" aria-label="Back to top">Top ↑</button></div>';
document.body.appendChild(el);
/* the bag opens the bag; Review & Send is reached from there once the steps allow it */
function dest(){return 'cart.html'}
var here=location.pathname.split('/').pop().replace(/\.html$/,'');
el.querySelectorAll('[data-nav]').forEach(function(a){var k=a.getAttribute('data-nav');
  if((k==='trip'&&here==='your-journey')||(k==='bag'&&here==='cart')||(k==='profile'&&here==='profile'))a.classList.add('on');
  if(k==='out')a.addEventListener('click',function(){var I=window.SIYL_INVITE;if(I&&I.leave){I.leave()}else{document.querySelector('[data-access-out]')&&document.querySelector('[data-access-out]').click()}});
  if(k==='top')a.addEventListener('click',function(){window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})})});
function topShow(){var t=el.querySelector('.jb-top');if(t)t.classList.toggle('show',window.scrollY>innerHeight)}
window.addEventListener('scroll',topShow,{passive:true});
function sync(){var n=B.authed()?B.get().length:0,t=el.querySelector('.jb-t'),v=B.money(B.total());
if(t.textContent!==v){t.classList.add('tick');t.textContent=v;setTimeout(function(){t.classList.remove('tick')},200)}
var view=el.querySelector('[data-bag-view]');view.setAttribute('href',dest());if(here==='cart'){view.hidden=true}
/* the bar stands whenever a guest is signed in — an empty bag is a real state (USD 0), and the account access must not vanish with it */
var on=B.authed();el.classList.toggle('on',on);document.body.classList.toggle('jbar-on',on);topShow();
if(on)requestAnimationFrame(function(){el.classList.add('in')});else el.classList.remove('in')}
document.addEventListener('siyl:bag',sync);document.addEventListener('siyl:guest',sync);document.addEventListener('siyl:temple',sync);document.addEventListener('siyl:seats',sync);document.addEventListener('siyl:units',sync);document.addEventListener('siyl:auth',sync);document.addEventListener('siyl:signout',sync);sync()};
})();
