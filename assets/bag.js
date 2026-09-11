/* Journey Bag — one persistent client bag for the open shop. */
(function(){window.SIYL_BAG={
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
badge:function(){var n=this.get().length,el=document.querySelector('[data-bag-badge]');
if(el){el.textContent=n>0?n:'';el.style.display=n>0?'flex':'none'}}};
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
css.textContent='.jbar{position:fixed;left:0;right:0;bottom:0;z-index:55;background:#FCFAF6;border-top:1px solid #DAD9D7;padding:12px 20px calc(12px + env(safe-area-inset-bottom));display:none}'+
'.jbar.on{display:block}body.jbar-on{padding-bottom:78px}'+
'.jb-in{max-width:640px;margin:0 auto;display:flex;align-items:baseline;gap:12px}'+
'.jb-l{font-size:10px;letter-spacing:2.2px;text-transform:uppercase;color:#6B6964}'+
'.jb-t{font-family:"PP Editorial Old",serif;font-size:19px;margin-left:auto}'+
'.jb-a{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#313131;text-decoration:none;border-bottom:1px solid #313131;padding:6px 0 3px;margin-left:16px}';
document.head.appendChild(css);
var el=document.createElement('div');el.className='jbar';
el.innerHTML='<div class="jb-in"><span class="jb-l">Your Journey</span><span class="jb-t"></span><a class="jb-a" href="your-journey.html">View</a></div>';
document.body.appendChild(el);
function sync(){var n=B.get().length;
el.querySelector('.jb-t').textContent=B.money(B.total());
el.classList.toggle('on',n>0);document.body.classList.toggle('jbar-on',n>0)}
document.addEventListener('siyl:bag',sync);sync()};
})();
