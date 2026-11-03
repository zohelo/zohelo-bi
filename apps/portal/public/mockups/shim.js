(function(){
  class DCLogic { constructor(){ this.props = {}; this.state = {}; } setState(){} forceUpdate(){} }
  window.DCLogic = DCLogic;
  function get(o, p){ return p.split('.').reduce((a,k)=>a==null?undefined:a[k], o); }
  function fill(str, scope){ return str.replace(/\{\{\s*([\w.$]+)\s*\}\}/g, (m,p)=>{ const v = get(scope,p); return v==null?'':String(v); }); }
  function expand(node, scope){
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) { child.nodeValue = fill(child.nodeValue, scope); continue; }
      if (child.nodeType !== 1) continue;
      const tag = child.tagName.toLowerCase();
      if (tag === 'sc-for') {
        const m = /\{\{\s*([\w.$]+)\s*\}\}/.exec(child.getAttribute('list')||''); const list = m ? get(scope, m[1]) || [] : [];
        const as = child.getAttribute('as') || 'item'; const frag = document.createDocumentFragment();
        list.forEach((it,i)=>{ const tpl = child.cloneNode(true); const s = Object.assign({}, scope, {[as]: it, $index: i}); expand(tpl, s); while (tpl.firstChild) frag.appendChild(tpl.firstChild); });
        child.replaceWith(frag); continue;
      }
      for (const a of Array.from(child.attributes)) if (a.value.includes('{{')) child.setAttribute(a.name, fill(a.value, scope));
      expand(child, scope);
    }
  }
  window.addEventListener('DOMContentLoaded', ()=>{
    const src = document.querySelector('script[data-dc-script]').textContent;
    const Comp = new Function(src + '; return Component;')(); const c = new Comp(); const vals = c.renderVals();
    const x = document.querySelector('x-dc'); const helmet = x.querySelector('helmet');
    if (helmet) { while (helmet.firstChild) document.head.appendChild(helmet.firstChild); helmet.remove(); }
    expand(x, vals); x.style.display = 'block'; document.body.dataset.ready = '1';
  });
})();
