/* Journey Bag — one persistent client bag for the open shop. */
(function(){window.SIYL_BAG={
get:function(){try{return JSON.parse(localStorage.getItem('siyl.bag')||'[]')}catch(e){return[]}},
set:function(b){localStorage.setItem('siyl.bag',JSON.stringify(b));this.badge()},
add:function(it){var b=this.get(),f=b.find(function(x){return x.id===it.id});
if(f){f.qty+=(it.qty||1)}else{it.qty=it.qty||1;b.push(it)}this.set(b);return f?f.qty:it.qty},
remove:function(id){this.set(this.get().filter(function(x){return x.id!==id}))},
qty:function(id,d){var b=this.get(),f=b.find(function(x){return x.id===id});
if(f){f.qty=Math.max(1,f.qty+d);this.set(b)}},
total:function(){return this.get().reduce(function(t,x){return t+(x.price||0)*x.qty},0)},
badge:function(){var n=this.get().length,el=document.querySelector('[data-bag-badge]');
if(el){el.textContent=n>0?n:'';el.style.display=n>0?'flex':'none'}}};
document.addEventListener('DOMContentLoaded',function(){window.SIYL_BAG.badge()})})();
