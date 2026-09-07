/* Journey Bag — one persistent client bag for the open shop. */
(function(){window.SIYL_BAG={
get:function(){try{return JSON.parse(localStorage.getItem('siyl.bag')||'[]')}catch(e){return[]}},
set:function(b){localStorage.setItem('siyl.bag',JSON.stringify(b));this.badge()},
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
document.addEventListener('DOMContentLoaded',function(){window.SIYL_BAG.badge()})})();
