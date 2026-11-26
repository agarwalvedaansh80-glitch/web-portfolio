(() => {
  const WA = '971509729558';
  const f = document.getElementById('cform');
  if (f) f.addEventListener('submit', e => { e.preventDefault(); const d = new FormData(f);
    const msg = `Hello Home Figures, my name is ${d.get('n')}.\nI am interested in: ${d.get('t')}.\n${d.get('m') || ''}`;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener'); });
  const cfg = document.getElementById('cfg'), x = document.getElementById('cfgX');
  if (cfg && x) { const o = document.createElement('button'); o.className = 'btn btn-line btn-sm cfg-open'; o.textContent = 'Personalise'; o.setAttribute('data-cursor', 'Open'); cfg.after(o);
    x.addEventListener('click', () => cfg.classList.add('closed')); o.addEventListener('click', () => cfg.classList.remove('closed')); }
})();
