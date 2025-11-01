<script>
// ===== MENU SETUP =====
const btn = document.getElementById('menuBtn');
const drop = document.getElementById('menuDrop');

btn.addEventListener('click', () => drop.classList.toggle('hidden'));
document.addEventListener('click', (e) => {
  if (!btn.contains(e.target) && !drop.contains(e.target)) drop.classList.add('hidden');
});

document.getElementById('year').textContent = new Date().getFullYear();

// ===== FETCH PRODUCTS (Cloudflare only) =====
async function fetchProducts() {
  // Try both likely Cloudflare worker routes
  const endpoints = ['/fetchProducts', '/api/fetchProducts'];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
      if (res.ok) return res.json();
    } catch (err) {
      console.warn(`Fetch failed for ${url}`, err);
    }
  }
  return { items: [] };
}

// ===== HELPERS =====
function fmtPrice(value) {
  const n = Number(value);
  return isFinite(n) ? `$${n.toFixed(2)}` : value || '';
}

function card(p) {
  const img = p.image || '';
  const title = p.title || 'Untitled';
  const why = p.why || '';
  const price = p.price ? fmtPrice(p.price) : '';
  const url = p.url || '#';
  const cat = p.category || '';
  const hook = p.hook || '';

  return `
    <article class="group rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden hover:border-neutral-700 transition" data-cat="${cat}">
      <a href="${url}" target="_blank" rel="noopener" class="block">
        <div class="aspect-[4/3] bg-neutral-800 overflow-hidden">
          ${img ? `<img src="${img}" alt="" class="h-full w-full object-cover group-hover:opacity-95">`
                 : `<div class="h-full w-full grid place-items-center text-neutral-600">No Image</div>`}
        </div>
      </a>
      <div class="p-4 space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold leading-tight line-clamp-2">${title}</h3>
          ${price ? `<span class="ml-3 rounded-md bg-neutral-800 px-2 py-0.5 text-xs">${price}</span>` : ``}
        </div>
        ${hook ? `<p class="text-sm text-neutral-300 line-clamp-2">${hook}</p>` : ``}
        ${why ? `<p class="text-sm text-neutral-400 line-clamp-2">${why}</p>` : ``}
        <div class="flex items-center justify-between pt-1">
          ${cat ? `<span class="text-xs text-neutral-400">${cat}</span>` : ``}
          <a href="${url}" target="_blank" rel="noopener" class="text-xs text-blue-400 hover:underline">Buy →</a>
        </div>
      </div>
    </article>`;
}

// ===== MAIN =====
(async () => {
  const grid = document.getElementById('grid');
  const { items = [] } = await fetchProducts();

  if (!items.length) {
    grid.innerHTML = '<p class="text-neutral-500">No products yet. Check your Notion integration.</p>';
    return;
  }

  // Build product cards
  grid.innerHTML = items.map(card).join('');

  // Build dynamic menu from unique categories
  const cats = [...new Set(items.map(i => i.category).filter(Boolean))];
  const menuHTML = cats.map(c => 
    `<a href="#" data-cat="${c}" class="block px-3 py-2 text-sm hover:bg-neutral-800">${c}</a>`
  ).join('') + `
    <a href="#about" class="block px-3 py-2 text-sm hover:bg-neutral-800 border-t border-neutral-800">About</a>`;

  drop.innerHTML = menuHTML;

  // Filter cards by category
  drop.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-cat]');
    if (!link) return;
    e.preventDefault();
    const cat = link.dataset.cat;
    document.querySelectorAll('#grid article').forEach(card => {
      card.style.display = (card.dataset.cat === cat || !cat) ? '' : 'none';
    });
    drop.classList.add('hidden');
  });
})();
</script>
