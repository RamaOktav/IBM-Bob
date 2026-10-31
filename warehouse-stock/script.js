/* ════════════════════════════════════════════════
   GUDANG HUB — script.js
   Vanilla JavaScript, tanpa library eksternal.
   Fitur: CRUD barang, tag, kategori, stok masuk/keluar,
          filter, sort, log aktivitas, peringatan stok,
          upload gambar, toast notifikasi.
════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────
   STORAGE HELPER
   Membungkus localStorage agar aman dari parse error.
────────────────────────────────────────────── */
const LS = {
  get: key => {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  },
  set: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

/* ──────────────────────────────────────────────
   STATE APLIKASI
   Semua data disimpan di localStorage dengan prefix 'gh_'.
────────────────────────────────────────────── */
let items = LS.get('gh_items') || [];   // Daftar barang
let logs  = LS.get('gh_logs')  || [];   // Log aktivitas
let cats  = LS.get('gh_cats')  || ['Elektronik', 'Peralatan', 'Bahan Baku', 'Produk Jadi', 'Alat Tulis'];
let tags  = LS.get('gh_tags')  || ['fragile', 'impor', 'fast-moving', 'konsumabel'];

/** Simpan seluruh state ke localStorage. */
function save() {
  LS.set('gh_items', items);
  LS.set('gh_logs',  logs);
  LS.set('gh_cats',  cats);
  LS.set('gh_tags',  tags);
}

/* ──────────────────────────────────────────────
   SEED DATA
   Dijalankan sekali saat aplikasi pertama kali dibuka.
────────────────────────────────────────────── */
if (items.length === 0) {
  const seed = [
    { id: 1,  name: 'Laptop ASUS VivoBook 15',        sku: 'ELK-001', category: 'Elektronik',  tags: ['fragile', 'impor'],                location: 'A1-R1', qty: 12, minStock: 3,  note: 'Garansi resmi 2 tahun', img: null },
    { id: 2,  name: 'Mouse Wireless Logitech M185',    sku: 'ELK-002', category: 'Elektronik',  tags: ['fast-moving'],                     location: 'A1-R2', qty: 45, minStock: 10, note: '',                      img: null },
    { id: 3,  name: 'Kertas HVS A4 80gr',             sku: 'ATK-001', category: 'Alat Tulis',  tags: ['konsumabel', 'fast-moving'],       location: 'B2-R1', qty: 8,  minStock: 20, note: 'Per rim',               img: null },
    { id: 4,  name: 'Baut M8 × 30mm (pack 100)',      sku: 'BBK-001', category: 'Bahan Baku',  tags: ['impor'],                          location: 'C3-R4', qty: 0,  minStock: 5,  note: '',                      img: null },
    { id: 5,  name: 'Tinta Printer Epson 664 Hitam',  sku: 'ATK-002', category: 'Alat Tulis',  tags: ['konsumabel'],                     location: 'B2-R2', qty: 5,  minStock: 10, note: '',                      img: null },
    { id: 6,  name: 'Obeng Set Philips 6-pcs',        sku: 'PRL-001', category: 'Peralatan',   tags: [],                                 location: 'D1-R1', qty: 20, minStock: 5,  note: '',                      img: null },
  ];
  items = seed;
  seed.forEach(it => addLog('new', it.name, `Stok awal: ${it.qty}`, 'Admin'));
  save();
}

/* ──────────────────────────────────────────────
   LOG
────────────────────────────────────────────── */
/**
 * Menambah entri log.
 * @param {'in'|'out'|'new'|'edit'|'delete'} type
 * @param {string} itemName
 * @param {string} detail
 * @param {string} [user]
 */
function addLog(type, itemName, detail, user = 'Sistem') {
  logs.unshift({
    id:       Date.now() + Math.random(), // pastikan unik
    time:     new Date().toISOString(),
    type,
    itemName,
    detail,
    user,
  });
  // Batasi log maksimal 2000 entri
  if (logs.length > 2000) logs = logs.slice(0, 2000);
  save();
}

/* ──────────────────────────────────────────────
   TABS
────────────────────────────────────────────── */
/**
 * Ganti tab yang aktif.
 * @param {'stock'|'log'|'categories'} tab
 * @param {HTMLElement} el - tombol tab yang diklik
 */
function switchTab(tab, el) {
  ['stock', 'log', 'categories'].forEach(t => {
    document.getElementById('tab-' + t).style.display = (t === tab) ? '' : 'none';
  });
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });
  el.classList.add('active');
  el.setAttribute('aria-selected', 'true');

  // Render konten tab yang baru aktif
  if (tab === 'log')        renderLog();
  if (tab === 'categories') renderCatTag();
}

/* ──────────────────────────────────────────────
   STATS CARDS
────────────────────────────────────────────── */
/** Render 4 kartu statistik di bagian atas. */
function renderStats() {
  const total    = items.length;
  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
  const empty    = items.filter(i => i.qty === 0).length;
  const lowStock = items.filter(i => i.qty > 0 && i.qty < i.minStock).length;
  const alertCount = empty + lowStock;

  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card stat-blue">
      <div class="label">Total SKU</div>
      <div class="value">${total.toLocaleString('id')}</div>
      <div class="sub">jenis barang terdaftar</div>
    </div>
    <div class="stat-card stat-green">
      <div class="label">Total Stok</div>
      <div class="value">${totalQty.toLocaleString('id')}</div>
      <div class="sub">unit keseluruhan</div>
    </div>
    <div class="stat-card stat-red">
      <div class="label">Stok Habis</div>
      <div class="value">${empty}</div>
      <div class="sub">perlu reorder segera</div>
    </div>
    <div class="stat-card stat-orange">
      <div class="label">Stok Rendah</div>
      <div class="value">${lowStock}</div>
      <div class="sub">di bawah batas minimum</div>
    </div>
  `;

  // Update alert badge navbar & banner
  updateAlertUI(alertCount, empty, lowStock);
}

/** Update tampilan peringatan (badge navbar + banner). */
function updateAlertUI(alertCount, empty, lowStock) {
  const badge     = document.getElementById('alertBadge');
  const badgeCnt  = document.getElementById('alertBadgeCount');
  const banner    = document.getElementById('alertBanner');
  const bannerTxt = document.getElementById('alertBannerText');

  if (alertCount > 0) {
    badge.style.display    = 'inline-flex';
    badgeCnt.textContent   = alertCount;
    banner.style.display   = 'flex';

    const parts = [];
    if (empty    > 0) parts.push(`${empty} barang stok habis`);
    if (lowStock > 0) parts.push(`${lowStock} barang stok rendah`);
    bannerTxt.textContent = parts.join(' dan ') + '. Segera lakukan penambahan stok.';
  } else {
    badge.style.display  = 'none';
    banner.style.display = 'none';
  }
}

/** Filter tabel ke item bermasalah saat tombol banner diklik. */
function filterToAlerts() {
  document.getElementById('filterStock').value = 'empty';
  // Jika tab log aktif, kembali ke tab stok dulu
  const stockTab = document.querySelector('.tab');
  switchTab('stock', stockTab);
  renderTable();
  // Scroll ke tabel
  document.getElementById('tab-stock').scrollIntoView({ behavior: 'smooth' });
}

/* ──────────────────────────────────────────────
   SORT & FILTER
────────────────────────────────────────────── */
let sortKey = '';     // '' | 'name' | 'qty'
let sortDir = 'asc';  // 'asc' | 'desc'

/** Toggle sort berdasarkan kolom. */
function toggleSort(key) {
  sortDir = (sortKey === key && sortDir === 'asc') ? 'desc' : 'asc';
  sortKey = key;
  updateSortHeaders();
  renderTable();
}

/** Update tampilan header kolom yang sedang diurutkan. */
function updateSortHeaders() {
  ['name', 'qty'].forEach(k => {
    const th    = document.getElementById('th-' + k);
    const arrow = document.getElementById('arrow-' + k);
    if (!th || !arrow) return;
    if (sortKey === k) {
      th.classList.add('sort-active');
      arrow.textContent = sortDir === 'asc' ? '↑' : '↓';
    } else {
      th.classList.remove('sort-active');
      arrow.textContent = '↕';
    }
  });
}

/** Kembalikan daftar item yang sudah difilter dan diurutkan. */
function getFiltered() {
  const q     = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const cat   = document.getElementById('filterCategory')?.value  || '';
  const stock = document.getElementById('filterStock')?.value     || '';
  const tag   = document.getElementById('filterTag')?.value       || '';

  let result = items.filter(item => {
    // Filter pencarian: nama, sku, atau tag mengandung kata kunci
    if (q) {
      const inName = item.name.toLowerCase().includes(q);
      const inSku  = (item.sku || '').toLowerCase().includes(q);
      const inTags = (item.tags || []).join(' ').toLowerCase().includes(q);
      if (!inName && !inSku && !inTags) return false;
    }
    // Filter kategori
    if (cat && item.category !== cat) return false;
    // Filter status stok
    if (stock === 'empty' && item.qty !== 0) return false;
    if (stock === 'low'   && !(item.qty > 0 && item.qty < item.minStock)) return false;
    if (stock === 'ok'    && (item.qty === 0 || item.qty < item.minStock)) return false;
    // Filter tag
    if (tag && !(item.tags || []).includes(tag)) return false;
    return true;
  });

  // Urutkan jika ada sortKey
  if (sortKey) {
    result = [...result].sort((a, b) => {
      const va = sortKey === 'qty' ? a.qty : a.name.toLowerCase();
      const vb = sortKey === 'qty' ? b.qty : b.name.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }
  return result;
}

/* ──────────────────────────────────────────────
   STOCK TABLE
────────────────────────────────────────────── */
/** Kembalikan class CSS untuk warna angka stok. */
function stockClass(item) {
  if (item.qty === 0)                            return 'stock-empty';
  if (item.qty > 0 && item.qty < item.minStock)  return 'stock-low';
  return 'stock-ok';
}

/** Kembalikan kelas baris tabel berdasarkan kondisi stok. */
function stockRowClass(item) {
  if (item.qty === 0)                           return 'row-empty';
  if (item.qty > 0 && item.qty < item.minStock) return 'row-low';
  return '';
}

/** Kembalikan HTML indikator status stok. */
function stockStatusHtml(item) {
  if (item.qty === 0) {
    return `<span class="stock-dot empty"></span>
            <span class="${stockClass(item)}">${item.qty}</span>`;
  }
  if (item.qty < item.minStock) {
    return `<span class="stock-dot low"></span>
            <span class="${stockClass(item)}">${item.qty}</span>`;
  }
  return `<span class="stock-dot ok"></span>
          <span class="${stockClass(item)}">${item.qty}</span>`;
}

/** Render seluruh tabel stok berdasarkan filter aktif. */
function renderTable() {
  const filtered = getFiltered();
  const tbody    = document.getElementById('stockTableBody');

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty">
            <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M20 7l-8-4-8 4m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-8 4-8-4"/>
            </svg>
            <p>Tidak ada barang yang sesuai filter.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    // Gambar atau placeholder ikon SVG
    const imgHtml = item.img
      ? `<img src="${item.img}" alt="${escHtml(item.name)}" />`
      : `<svg class="item-img-placeholder" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
           <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-8 4-8-4"/>
         </svg>`;

    const tagHtml = (item.tags || [])
      .map(t => `<span class="tag">${escHtml(t)}</span>`)
      .join('');

    return `
      <tr class="${stockRowClass(item)}">
        <td>
          <div class="item-info">
            <div class="item-img">${imgHtml}</div>
            <div>
              <div class="item-name">${escHtml(item.name)}</div>
              <div class="item-code">${escHtml(item.sku || '—')}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-blue">${escHtml(item.category)}</span></td>
        <td class="hide-sm">
          <div class="tags">${tagHtml || '<span class="tag" style="opacity:.4">—</span>'}</div>
        </td>
        <td class="hide-md">
          <span style="color:var(--muted)">${escHtml(item.location || '—')}</span>
        </td>
        <td>
          <div class="stock-cell">
            <div style="display:flex;align-items:center;gap:6px;min-width:52px;font-weight:800;font-size:15px;">
              ${stockStatusHtml(item)}
            </div>
            <div class="stock-actions">
              <button class="stock-btn plus"  title="Tambah 1 unit" onclick="quickAdj(${item.id}, 1)">+</button>
              <button class="stock-btn minus" title="Kurangi 1 unit" onclick="quickAdj(${item.id}, -1)">−</button>
            </div>
          </div>
        </td>
        <td>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">
            <button class="btn-icon primary" title="Lihat detail" onclick="viewItem(${item.id})">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </button>
            <button class="btn-icon primary" title="Kelola stok masuk/keluar" onclick="openAdjust(${item.id})">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
            </button>
            <button class="btn-icon" title="Edit data barang" onclick="openEdit(${item.id})">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button class="btn-icon danger" title="Hapus barang" onclick="deleteItem(${item.id})">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

/** Isi ulang dropdown filter kategori (jaga nilai yang dipilih). */
function populateCategoryFilter() {
  const sel     = document.getElementById('filterCategory');
  const current = sel.value;
  sel.innerHTML = '<option value="">Semua Kategori</option>' +
    cats.map(c => `<option value="${escAttr(c)}" ${c === current ? 'selected' : ''}>${escHtml(c)}</option>`).join('');
}

/** Isi ulang dropdown filter tag. */
function populateTagFilter() {
  const sel     = document.getElementById('filterTag');
  const current = sel.value;
  sel.innerHTML = '<option value="">Semua Tag</option>' +
    tags.map(t => `<option value="${escAttr(t)}" ${t === current ? 'selected' : ''}>${escHtml(t)}</option>`).join('');
}

/* ──────────────────────────────────────────────
   QUICK +/- (satu unit langsung dari tabel)
────────────────────────────────────────────── */
/**
 * Tambah/kurangi stok langsung dari tombol + / - di tabel.
 * @param {number} id
 * @param {1|-1} delta
 */
function quickAdj(id, delta) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  const newQty = Math.max(0, item.qty + delta);
  if (newQty === item.qty) {
    toast('Stok sudah 0, tidak bisa dikurangi lagi.', 'warning');
    return;
  }
  const type = delta > 0 ? 'in' : 'out';
  addLog(type, item.name, `${delta > 0 ? '+' : ''}${delta} unit (aksi cepat)`, 'Operator');
  item.qty = newQty;
  save();
  renderTable();
  renderStats();
  toast(`${delta > 0 ? '+1' : '-1'} stok — ${item.name}`, 'success');
}

/* ──────────────────────────────────────────────
   DETAIL BARANG (VIEW MODAL)
────────────────────────────────────────────── */
/** Buka modal detail barang. */
function viewItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  const sc      = stockClass(item);
  const tagHtml = (item.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join(' ');
  const imgHtml = item.img
    ? `<img src="${item.img}" style="width:100%;max-height:200px;object-fit:cover;border-radius:10px;margin-bottom:18px;" alt="${escAttr(item.name)}" />`
    : `<div style="background:var(--surface2);border-radius:10px;height:110px;display:flex;align-items:center;justify-content:center;margin-bottom:18px;border:1px solid var(--border);">
         <svg width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24" style="opacity:.25;" aria-hidden="true">
           <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-8 4-8-4"/>
         </svg>
       </div>`;

  // Indikator kondisi stok
  let stockAlertHtml = '';
  if (item.qty === 0) {
    stockAlertHtml = `<div style="background:var(--danger-light);color:var(--danger);border:1.5px solid var(--danger);border-radius:7px;padding:8px 12px;font-size:12px;font-weight:700;margin-top:12px;">
      Stok habis — segera lakukan penambahan stok.
    </div>`;
  } else if (item.qty < item.minStock) {
    stockAlertHtml = `<div style="background:var(--warning-light);color:var(--warning);border:1.5px solid var(--warning);border-radius:7px;padding:8px 12px;font-size:12px;font-weight:700;margin-top:12px;">
      Stok rendah — di bawah batas minimum (${item.minStock} unit).
    </div>`;
  }

  document.getElementById('viewModalContent').innerHTML = `
    <h2 id="viewModalHeading" style="font-size:17px;font-weight:800;margin-bottom:4px;">${escHtml(item.name)}</h2>
    <div style="color:var(--muted);font-size:12px;margin-bottom:16px;">${escHtml(item.sku || 'Tanpa kode SKU')}</div>
    ${imgHtml}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
      <div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Kategori</div>
        <span class="badge badge-blue">${escHtml(item.category)}</span>
      </div>
      <div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Lokasi Rak</div>
        <span style="font-weight:600">${escHtml(item.location || '—')}</span>
      </div>
      <div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Stok Saat Ini</div>
        <span style="font-size:24px;font-weight:800;" class="${sc}">${item.qty}</span>
      </div>
      <div>
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Minimum Stok</div>
        <span style="font-weight:600">${item.minStock}</span>
      </div>
    </div>
    ${tagHtml
        ? `<div style="margin-bottom:12px;">
             <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">Tag</div>
             <div class="tags">${tagHtml}</div>
           </div>`
        : ''}
    ${item.note
        ? `<div style="background:var(--surface2);border-radius:7px;padding:10px 12px;font-size:13px;color:var(--muted);border:1px solid var(--border);margin-bottom:4px;">${escHtml(item.note)}</div>`
        : ''}
    ${stockAlertHtml}
    <div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap;">
      <button class="btn btn-primary btn-sm" onclick="closeModal('viewModal');openAdjust(${item.id})">Kelola Stok</button>
      <button class="btn btn-outline btn-sm" onclick="closeModal('viewModal');openEdit(${item.id})">Edit Data</button>
    </div>
  `;
  openModal('viewModal');
}

/* ──────────────────────────────────────────────
   CRUD: TAMBAH / EDIT BARANG
────────────────────────────────────────────── */
let currentImgData = null; // base64 gambar yang sedang di-upload

/** Buka modal untuk menambah barang baru. */
function openAddModal() {
  document.getElementById('itemModalTitle').textContent = 'Tambah Barang Baru';
  document.getElementById('editId').value = '';
  currentImgData = null;
  clearImgPreview();
  ['f_name', 'f_sku', 'f_location', 'f_tags', 'f_note'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('f_qty').value      = 0;
  document.getElementById('f_minstock').value = 5;
  populateCategorySelect();
  openModal('itemModal');
}

/** Buka modal edit untuk barang yang sudah ada. */
function openEdit(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  document.getElementById('itemModalTitle').textContent = 'Edit Barang';
  document.getElementById('editId').value      = id;
  document.getElementById('f_name').value      = item.name;
  document.getElementById('f_sku').value       = item.sku  || '';
  document.getElementById('f_location').value  = item.location || '';
  document.getElementById('f_tags').value      = (item.tags || []).join(', ');
  document.getElementById('f_qty').value       = item.qty;
  document.getElementById('f_minstock').value  = item.minStock;
  document.getElementById('f_note').value      = item.note || '';

  currentImgData = item.img || null;
  populateCategorySelect(item.category);

  if (item.img) {
    document.getElementById('imgPreview').src          = item.img;
    document.getElementById('imgPreview').style.display      = 'block';
    document.getElementById('imgPlaceholder').style.display  = 'none';
  } else {
    clearImgPreview();
  }
  openModal('itemModal');
}

/** Isi dropdown kategori di form modal. */
function populateCategorySelect(selected = '') {
  const sel   = document.getElementById('f_category');
  sel.innerHTML = '<option value="">-- Pilih Kategori --</option>' +
    cats.map(c => `<option value="${escAttr(c)}" ${c === selected ? 'selected' : ''}>${escHtml(c)}</option>`).join('');
}

/** Simpan barang (tambah baru atau perbarui yang sudah ada). */
function saveItem() {
  const name     = document.getElementById('f_name').value.trim();
  const category = document.getElementById('f_category').value;

  // Validasi wajib
  if (!name)     return toast('Nama barang wajib diisi.', 'error');
  if (!category) return toast('Kategori wajib dipilih.', 'error');

  const sku      = document.getElementById('f_sku').value.trim();
  const location = document.getElementById('f_location').value.trim();
  const note     = document.getElementById('f_note').value.trim();
  const qty      = Math.max(0, parseInt(document.getElementById('f_qty').value)      || 0);
  const minStock = Math.max(0, parseInt(document.getElementById('f_minstock').value) || 0);
  const tagArr   = document.getElementById('f_tags').value
    .split(',').map(t => t.trim()).filter(Boolean);

  const editId = document.getElementById('editId').value;

  if (editId) {
    // ── UPDATE ──
    const item    = items.find(i => i.id == editId);
    const oldQty  = item.qty;
    Object.assign(item, { name, sku, category, location, tags: tagArr, qty, minStock, note, img: currentImgData });
    addLog('edit', name, `Data diperbarui. Stok: ${oldQty} → ${qty}`, 'Admin');
    toast('Data barang berhasil diperbarui.', 'success');
  } else {
    // ── CREATE ──
    const newItem = {
      id: Date.now(),
      name, sku, category, location,
      tags: tagArr, qty, minStock, note,
      img: currentImgData,
    };
    items.push(newItem);
    addLog('new', name, `Barang baru ditambahkan. Stok awal: ${qty}`, 'Admin');
    toast('Barang berhasil ditambahkan.', 'success');
  }

  save();
  closeModal('itemModal');
  renderTable();
  renderStats();
  populateCategoryFilter();
  populateTagFilter();
}

/* ──────────────────────────────────────────────
   CRUD: HAPUS BARANG
────────────────────────────────────────────── */
/** Hapus barang berdasarkan id. */
function deleteItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  if (!confirm(`Hapus barang "${item.name}"?\nTindakan ini tidak dapat dibatalkan.`)) return;

  addLog('delete', item.name, `Stok terakhir: ${item.qty}`, 'Admin');
  items = items.filter(i => i.id !== id);
  save();
  renderTable();
  renderStats();
  populateCategoryFilter();
  populateTagFilter();
  toast(`"${item.name}" telah dihapus.`, 'success');
}

/* ──────────────────────────────────────────────
   ADJUST STOCK MODAL (masuk / keluar)
────────────────────────────────────────────── */
let adjustItemId = null;   // id barang yang sedang di-adjust
let adjustType   = 'in';   // 'in' | 'out'

/** Buka modal penyesuaian stok. */
function openAdjust(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  adjustItemId = id;
  document.getElementById('adjustItemName').textContent = item.name;
  document.getElementById('adjustQty').value   = 1;
  document.getElementById('adjustNote').value  = '';
  document.getElementById('adjustUser').value  = '';
  setAdjustType('in'); // reset ke masuk
  openModal('adjustModal');
}

/** Set tipe penyesuaian (masuk atau keluar). */
function setAdjustType(type) {
  adjustType = type;
  document.getElementById('btnTypeIn').classList.toggle('active',  type === 'in');
  document.getElementById('btnTypeOut').classList.toggle('active', type === 'out');
  document.getElementById('adjustConfirmBtn').textContent =
    type === 'in' ? 'Konfirmasi Masuk' : 'Konfirmasi Keluar';
}

/** Ubah nilai kuantitas di input adjust modal. */
function changeAdjQty(delta) {
  const inp  = document.getElementById('adjustQty');
  inp.value  = Math.max(1, (parseInt(inp.value) || 1) + delta);
}

/** Proses konfirmasi penyesuaian stok. */
function confirmAdjust() {
  const qty  = Math.max(1, parseInt(document.getElementById('adjustQty').value)  || 1);
  const note = document.getElementById('adjustNote').value.trim();
  const user = document.getElementById('adjustUser').value.trim() || 'Operator';
  const item = items.find(i => i.id === adjustItemId);
  if (!item) return;

  // Validasi stok keluar tidak boleh melebihi stok tersedia
  if (adjustType === 'out' && qty > item.qty) {
    toast(`Stok tidak cukup! Tersedia: ${item.qty} unit.`, 'error');
    return;
  }

  const prevQty = item.qty;
  item.qty = adjustType === 'in' ? item.qty + qty : item.qty - qty;

  const detail = `${adjustType === 'in' ? '+' : '-'}${qty} unit. ${prevQty} → ${item.qty}.${note ? ' ' + note : ''}`;
  addLog(adjustType, item.name, detail, user);

  save();
  closeModal('adjustModal');
  renderTable();
  renderStats();
  toast(
    adjustType === 'in'
      ? `+${qty} unit masuk — ${item.name}`
      : `-${qty} unit keluar — ${item.name}`,
    'success'
  );
}

/* ──────────────────────────────────────────────
   LOG AKTIVITAS
────────────────────────────────────────────── */
/** Label + warna badge per jenis log. */
const LOG_LABELS = {
  in:     { text: 'Masuk',   cls: 'in'     },
  out:    { text: 'Keluar',  cls: 'out'    },
  new:    { text: 'Baru',    cls: 'new'    },
  edit:   { text: 'Edit',    cls: 'edit'   },
  delete: { text: 'Hapus',   cls: 'delete' },
};

/** Render tabel log aktivitas. */
function renderLog() {
  const q    = (document.getElementById('logSearchInput')?.value || '').toLowerCase();
  const type = document.getElementById('filterLogType')?.value   || '';

  const filtered = logs.filter(l => {
    if (type && l.type !== type)                                             return false;
    if (q && !l.itemName.toLowerCase().includes(q) && !l.detail.toLowerCase().includes(q)) return false;
    return true;
  });

  const tbody = document.getElementById('logTableBody');

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty"><p>Belum ada log aktivitas yang sesuai.</p></div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(l => {
    const label   = LOG_LABELS[l.type] || { text: l.type, cls: '' };
    const dt      = new Date(l.time);
    const dateStr = dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    return `
      <tr>
        <td style="white-space:nowrap;color:var(--muted)">${dateStr} ${timeStr}</td>
        <td><span class="log-badge ${label.cls}">${label.text}</span></td>
        <td style="font-weight:600">${escHtml(l.itemName)}</td>
        <td class="hide-sm" style="color:var(--muted)">${escHtml(l.detail)}</td>
        <td class="hide-md" style="color:var(--muted)">${escHtml(l.user)}</td>
      </tr>`;
  }).join('');
}

/** Hapus semua log setelah konfirmasi. */
function clearLog() {
  if (!confirm('Bersihkan semua log aktivitas?\nTindakan ini tidak dapat dibatalkan.')) return;
  logs = [];
  save();
  renderLog();
  toast('Log aktivitas berhasil dibersihkan.', 'success');
}

/* ──────────────────────────────────────────────
   KATEGORI & TAG
────────────────────────────────────────────── */
/** Render daftar kategori dan tag di tab settings. */
function renderCatTag() {
  // Kategori
  document.getElementById('categoryList').innerHTML =
    cats.length === 0
      ? `<div style="color:var(--muted);font-size:13px;padding:8px 0;">Belum ada kategori.</div>`
      : cats.map((c, i) => `
          <div class="cat-item">
            <span class="cat-item-label badge badge-blue">${escHtml(c)}</span>
            <span class="cat-item-count">${items.filter(it => it.category === c).length} barang</span>
            <button class="btn btn-outline btn-sm" onclick="deleteCategory(${i})" title="Hapus kategori">Hapus</button>
          </div>`).join('');

  // Tag
  document.getElementById('tagList').innerHTML =
    tags.length === 0
      ? `<div style="color:var(--muted);font-size:13px;padding:8px 0;">Belum ada tag.</div>`
      : tags.map((t, i) => `
          <div class="cat-item">
            <span class="cat-item-label tag" style="font-size:12px;">${escHtml(t)}</span>
            <span class="cat-item-count">${items.filter(it => (it.tags || []).includes(t)).length} barang</span>
            <button class="btn btn-outline btn-sm" onclick="deleteTag(${i})" title="Hapus tag">Hapus</button>
          </div>`).join('');
}

/** Tambah kategori baru. */
function addCategory() {
  const v = document.getElementById('newCategoryInput').value.trim();
  if (!v) return toast('Nama kategori tidak boleh kosong.', 'error');
  if (cats.map(c => c.toLowerCase()).includes(v.toLowerCase()))
    return toast('Kategori sudah ada.', 'error');

  cats.push(v);
  document.getElementById('newCategoryInput').value = '';
  save();
  renderCatTag();
  populateCategoryFilter();
  toast(`Kategori "${v}" berhasil ditambahkan.`, 'success');
}

/** Hapus kategori pada indeks tertentu. */
function deleteCategory(i) {
  const name = cats[i];
  const used = items.filter(it => it.category === name).length;
  if (used > 0 && !confirm(`Kategori "${name}" dipakai oleh ${used} barang.\nTetap hapus?`)) return;

  cats.splice(i, 1);
  save();
  renderCatTag();
  populateCategoryFilter();
  toast(`Kategori "${name}" dihapus.`, 'success');
}

/** Tambah tag baru. */
function addTag() {
  const v = document.getElementById('newTagInput').value.trim();
  if (!v) return toast('Nama tag tidak boleh kosong.', 'error');
  if (tags.map(t => t.toLowerCase()).includes(v.toLowerCase()))
    return toast('Tag sudah ada.', 'error');

  tags.push(v);
  document.getElementById('newTagInput').value = '';
  save();
  renderCatTag();
  populateTagFilter();
  toast(`Tag "${v}" berhasil ditambahkan.`, 'success');
}

/** Hapus tag pada indeks tertentu. */
function deleteTag(i) {
  const name = tags[i];
  tags.splice(i, 1);
  save();
  renderCatTag();
  populateTagFilter();
  toast(`Tag "${name}" dihapus.`, 'success');
}

/* ──────────────────────────────────────────────
   IMAGE UPLOAD
────────────────────────────────────────────── */
/** Handle input file gambar dari file picker. */
function handleImgInput(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    toast('Ukuran gambar maksimal 2 MB.', 'error');
    return;
  }
  readImageFile(file);
}

/** Handle drop file gambar ke area drag-and-drop. */
function handleImgDrop(e) {
  e.preventDefault();
  document.getElementById('imgUploadArea').classList.remove('dragover');
  const file = e.dataTransfer?.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    toast('File harus berupa gambar.', 'error');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    toast('Ukuran gambar maksimal 2 MB.', 'error');
    return;
  }
  readImageFile(file);
}

/** Baca file gambar lalu simpan sebagai base64. */
function readImageFile(file) {
  const reader    = new FileReader();
  reader.onload   = ev => {
    currentImgData = ev.target.result;
    showImgPreview(ev.target.result);
  };
  reader.readAsDataURL(file);
}

/** Tampilkan pratinjau gambar di modal. */
function showImgPreview(src) {
  document.getElementById('imgPreview').src          = src;
  document.getElementById('imgPreview').style.display      = 'block';
  document.getElementById('imgPlaceholder').style.display  = 'none';
}

/** Hapus gambar yang sedang dipilih. */
function clearImg() {
  currentImgData = null;
  clearImgPreview();
}

/** Reset UI pratinjau gambar ke kondisi kosong. */
function clearImgPreview() {
  document.getElementById('imgPreview').style.display      = 'none';
  document.getElementById('imgPreview').src                = '';
  document.getElementById('imgPlaceholder').style.display  = '';
  document.getElementById('imgFileInput').value            = '';
}

/* ──────────────────────────────────────────────
   MODAL HELPERS
────────────────────────────────────────────── */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Tutup modal saat klik area backdrop (di luar kotak modal)
document.querySelectorAll('.modal-backdrop').forEach(el => {
  el.addEventListener('click', e => {
    if (e.target === el) el.classList.remove('open');
  });
});

// Tutup modal dengan tombol Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.open').forEach(el => {
      el.classList.remove('open');
    });
  }
});

/* ──────────────────────────────────────────────
   TOAST NOTIFIKASI
────────────────────────────────────────────── */
/**
 * Tampilkan notifikasi sementara.
 * @param {string} msg
 * @param {'success'|'error'|'warning'|''} type
 */
function toast(msg, type = '') {
  const el        = document.createElement('div');
  el.className    = `toast ${type}`;
  el.textContent  = msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ──────────────────────────────────────────────
   SECURITY HELPER
   Sanitasi string sebelum disisipkan ke HTML/atribut.
────────────────────────────────────────────── */
const _div = document.createElement('div');

/** Escape string untuk konten HTML. */
function escHtml(str) {
  _div.textContent = str;
  return _div.innerHTML;
}

/** Escape string untuk nilai atribut HTML (dalam kutip ganda). */
function escAttr(str) {
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ──────────────────────────────────────────────
   INIT
   Panggil setelah DOM siap (script berada di akhir body).
────────────────────────────────────────────── */
(function init() {
  populateCategoryFilter();
  populateTagFilter();
  renderStats();
  renderTable();
})();
