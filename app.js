const grid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortSelect = document.getElementById("sortSelect");
const statusNote = document.getElementById("statusNote");
const emptyState = document.getElementById("emptyState");
const savedCount = document.getElementById("savedCount");
const savedToggle = document.getElementById("savedToggle");
const toast = document.getElementById("toast");
let products = [];
let savedIds = JSON.parse(localStorage.getItem("pricepulse-saved") || "[]");
let showSavedOnly = false;
let toastTimer;

document.getElementById("year").textContent = new Date().getFullYear();
updateSavedCount();

function money(value) {
  return "₹" + Number(value).toLocaleString("en-IN");
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function updateSavedCount() {
  savedCount.textContent = savedIds.length;
}
async function loadProducts() {
  grid.innerHTML = '<div class="loading">Finding products…</div>';
  const params = new URLSearchParams({
    q: searchInput.value.trim(),
    category: categoryFilter.value,
    sort: sortSelect.value
  });
  try {
    const response = await fetch("/api/products?" + params.toString());
    if (!response.ok) throw new Error("Could not load");
    const data = await response.json();
    products = data.products || [];
    statusNote.innerHTML = '<span class="status-dot"></span> ' + escapeHtml(data.message || "Product results loaded.");
    renderProducts();
  } catch (error) {
    grid.innerHTML = '<div class="loading">Could not load products. Please restart the server and refresh.</div>';
  }
}
function renderProducts() {
  let visible = products;
  if (showSavedOnly) visible = visible.filter(p => savedIds.includes(p.id));
  emptyState.hidden = visible.length !== 0;
  grid.style.display = visible.length ? "grid" : "none";
  if (!visible.length) return;
  grid.innerHTML = visible.map(product => {
    const offers = [...product.offers].sort((a,b) => Number(a.price)-Number(b.price));
    const best = offers[0];
    return `<article class="product-card">
      <div class="product-image-wrap">
        <img class="product-image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.style.display='none'">
        <span class="category-pill">${escapeHtml(product.category)}</span>
        <button class="save-product ${savedIds.includes(product.id) ? "saved" : ""}" data-save="${escapeHtml(product.id)}" aria-label="Save ${escapeHtml(product.name)}">${savedIds.includes(product.id) ? "♥" : "♡"}</button>
      </div>
      <div class="product-info">
        <h3>${escapeHtml(product.name)}</h3>
        <div class="lowest-label">LOWEST SAMPLE PRICE FROM</div>
        <div class="lowest-price">${money(best.price)} <small>/ demo</small></div>
        <div class="offer-list">${offers.map((offer,index) => `<div class="offer-row ${index===0?"best":""}">
          <span class="offer-store">${escapeHtml(offer.store)}</span><strong>${money(offer.price)}</strong>
        </div>`).join("")}</div>
        <div class="offer-actions"><button data-compare="${escapeHtml(product.id)}">Compare</button><a href="${escapeHtml(best.url)}" target="_blank" rel="noopener noreferrer">Check store ↗</a></div>
      </div>
    </article>`;
  }).join("");
}
grid.addEventListener("click", event => {
  const saveButton = event.target.closest("[data-save]");
  if (saveButton) {
    const id = saveButton.dataset.save;
    savedIds = savedIds.includes(id) ? savedIds.filter(x => x !== id) : [...savedIds, id];
    localStorage.setItem("pricepulse-saved", JSON.stringify(savedIds));
    updateSavedCount();
    renderProducts();
    notify(savedIds.includes(id) ? "Product saved to your list." : "Product removed from saved list.");
    return;
  }
  const compareButton = event.target.closest("[data-compare]");
  if (compareButton) {
    const product = products.find(p => p.id === compareButton.dataset.compare);
    if (!product) return;
    const sorted = [...product.offers].sort((a,b) => a.price-b.price);
    const gap = sorted[sorted.length-1].price - sorted[0].price;
    notify(`Sample price difference: ${money(gap)}. Prices are illustrative, not live.`);
  }
});
document.getElementById("searchForm").addEventListener("submit", event => {
  event.preventDefault();
  showSavedOnly = false;
  savedToggle.classList.remove("active");
  loadProducts();
  document.getElementById("explore").scrollIntoView({behavior:"smooth"});
});
document.querySelectorAll("[data-query]").forEach(button => button.addEventListener("click", () => {
  searchInput.value = button.dataset.query;
  showSavedOnly = false;
  loadProducts();
  document.getElementById("explore").scrollIntoView({behavior:"smooth"});
}));
categoryFilter.addEventListener("change", loadProducts);
sortSelect.addEventListener("change", loadProducts);
savedToggle.addEventListener("click", () => {
  showSavedOnly = !showSavedOnly;
  savedToggle.classList.toggle("active", showSavedOnly);
  renderProducts();
  document.getElementById("explore").scrollIntoView({behavior:"smooth"});
  if (showSavedOnly) notify("Showing your saved products.");
});
document.getElementById("clearSearch").addEventListener("click", () => {
  searchInput.value = "";
  categoryFilter.value = "All";
  sortSelect.value = "relevance";
  showSavedOnly = false;
  savedToggle.classList.remove("active");
  loadProducts();
});
loadProducts();
