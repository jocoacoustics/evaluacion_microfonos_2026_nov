/* PAPIRO v0.2.0 · 12 figuras: axes visibles, redimensionamiento real,
 * trazas Plotly locales y un espacio propio para cada caption. */
document.addEventListener('DOMContentLoaded', async () => {
  const node = document.getElementById('papiro-figures');
  if (!node) return;
  const figures = JSON.parse(node.textContent || '{}');
  if (typeof Plotly === 'undefined') {
    document.querySelectorAll('.chart-loading').forEach(el => {
      el.textContent = 'No se cargó Plotly. Verifica assets/plotly.min.js';
    });
    return;
  }
  const configs = new Map();
  const opts = {
    responsive: true, displayModeBar: true, displaylogo: false,
    scrollZoom: false, doubleClick: 'reset+autosize',
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleSpikelines'],
    toImageButtonOptions: {format:'png', filename:'papiro-figura', scale:2}
  };
  function sizedLayout(id) {
    const payload=figures[id];
    const el=document.getElementById(id);
    const shell=el?.closest('.plotly-shell');
    const w=Math.max(280, Math.round(shell?.clientWidth || 640));
    const h=Math.max(310, Math.round(shell?.clientHeight || 420));
    const compact=w<490;
    const spec=payload.layout||{};
    const margin=Object.assign({l:96,r:60,t:75,b:90},spec.margin||{});
    if (compact) {
      margin.l=Math.max(65,Math.min(margin.l,78));
      margin.r=Math.max(26,Math.min(margin.r,45));
      margin.t=Math.max(54,Math.min(margin.t,68));
      margin.b=Math.max(79,Math.min(margin.b,90));
    }
    return Object.assign({},spec,{
      width:w,height:h,autosize:false,
      margin,plot_bgcolor:'#fff',paper_bgcolor:'#fff',
      font:{family:'Arial, Helvetica, sans-serif',size:compact?10:12,color:'#34342c'},
      hoverlabel:{font:{family:'Arial, Helvetica, sans-serif',size:12}}
    });
  }
  const ready=[];
  for (const [id, payload] of Object.entries(figures)) {
    const el=document.getElementById(id);
    if (!el) continue;
    const loading=document.getElementById('loading-'+id.replace('plot-',''));
    try {
      const layout=sizedLayout(id);
      await Plotly.newPlot(el,payload.data,layout,opts);
      configs.set(id,layout);
      ready.push(id);
      el.classList.add('plotly-ready');
      if (loading) loading.remove();
      el.dispatchEvent(new CustomEvent('papiro:ready',{bubbles:true}));
    } catch(err) {
      if (loading) loading.textContent='No se pudo representar la figura: '+err.message;
      console.error('Papiro: figura no dibujada',id,err);
    }
  }
  document.querySelectorAll('.chart-reset').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      const id=btn.dataset.plot;
      const el=document.getElementById(id);
      if (!el?.classList.contains('plotly-ready')) return;
      const layout=sizedLayout(id);
      await Plotly.react(el,figures[id].data,layout,opts);
      configs.set(id,layout);
      btn.classList.add('just-reset');
      setTimeout(()=>btn.classList.remove('just-reset'),600);
    });
  });
  // El contenedor manda sobre la altura de Plotly: corrige el problema de
  // figura 06 (antes 790 px dentro de una caja CSS de solo 410 px).
  let resizeFrame=0;
  function fitAll() {
    if(resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame=requestAnimationFrame(async()=>{
      resizeFrame=0;
      for (const id of ready) {
        const el=document.getElementById(id);
        if (!el) continue;
        const now=sizedLayout(id);
        const prev=configs.get(id);
        if (!prev || now.width!==prev.width || now.height!==prev.height) {
          try {
            await Plotly.relayout(el,{width:now.width,height:now.height});
            configs.set(id,Object.assign({},prev||{}, {width:now.width,height:now.height}));
          } catch(err) {console.warn('Papiro: resize omitido',id,err);}
        }
      }
    });
  }
  if (typeof ResizeObserver!=='undefined') {
    const observer=new ResizeObserver(fitAll);
    ready.forEach(id=>{
      const shell=document.getElementById(id)?.closest('.plotly-shell');
      if(shell)observer.observe(shell);
    });
  }
  window.addEventListener('resize',fitAll,{passive:true});
});
