/* Nexora storefront interactions: catalogue, i18n, cart, wishlist, product cards and demo checkout. */
(function(){
  'use strict';
  const products = window.NEXORA_PRODUCTS || [];
  const dictionaries = window.NEXORA_I18N || {};
  const extra = {
    uk:{quizBudgetQuestion:'Який бюджет тобі комфортний?',budgetLow:'До 3 000 ₴',budgetMid:'3 000–10 000 ₴',budgetHigh:'Понад 10 000 ₴'},
    en:{quizBudgetQuestion:'What budget works for you?',budgetLow:'Up to ₴3,000',budgetMid:'₴3,000–10,000',budgetHigh:'Over ₴10,000'},
    pl:{quizBudgetQuestion:'Jaki budżet Ci odpowiada?',budgetLow:'Do 3 000 ₴',budgetMid:'3 000–10 000 ₴',budgetHigh:'Powyżej 10 000 ₴'}
  };
  Object.keys(extra).forEach(lang=>Object.assign(dictionaries[lang]||{},extra[lang]));
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => Array.from(root.querySelectorAll(selector));
  const store = {language: safeGet('nexora-language') || 'uk', category:'all', search:'', sort:'featured', favoritesOnly:false, quizGoal:null, cart: safeJSON('nexora-cart', []), favorites: safeJSON('nexora-favorites', [])};
  const categories = [
    {id:'all',label:'catAll',symbol:'⌘'}, {id:'audio',label:'catAudio',symbol:'♫'}, {id:'mobile',label:'catMobile',symbol:'▯'},
    {id:'computers',label:'catComputers',symbol:'⌑'}, {id:'wearables',label:'catWearables',symbol:'◷'}, {id:'accessories',label:'catAccessories',symbol:'✣'},
    {id:'creative',label:'catCreative',symbol:'◉'}, {id:'gaming',label:'catGaming',symbol:'⌁'}
  ];
  function safeGet(key){try{return localStorage.getItem(key)}catch(e){return null}}
  function safeJSON(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return Array.isArray(value)?value:fallback}catch(e){return fallback}}
  function persist(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){/* storage can be unavailable in private contexts */}}
  function t(key){return (dictionaries[store.language]&&dictionaries[store.language][key]) || (dictionaries.uk&&dictionaries.uk[key]) || key}
  function localized(item,key){return (item[key]&&item[key][store.language]) || (item[key]&&item[key].uk) || ''}
  function formatPrice(value){return new Intl.NumberFormat(store.language==='pl'?'pl-PL':store.language==='en'?'en-GB':'uk-UA',{maximumFractionDigits:0}).format(value)+' ₴'}
  function productById(id){return products.find(p=>p.id===id)}
  function imagePath(product){return 'assets/products/'+product.art+'.svg'}
  function tagText(tag){return tag==='hit'?t('tagHit'):tag==='new'?t('tagNew'):tag==='sale'?t('tagSale'):tag==='popular'?t('tagPopular'):''}
  function categoryText(id){const item=categories.find(c=>c.id===id);return item?t(item.label):t('catAll')}
  function cartQuantity(){return store.cart.reduce((sum,item)=>sum+item.qty,0)}
  function cartSubtotal(){return store.cart.reduce((sum,item)=>{const p=productById(item.id);return sum+(p?p.price*item.qty:0)},0)}
  function showToast(message,mark='✓'){
    const toast=document.createElement('div');toast.className='toast';toast.innerHTML='<span class="toast-mark"></span><span class="toast-message"></span>';
    $('.toast-mark',toast).textContent=mark;$('.toast-message',toast).textContent=message;$('#toastRegion').appendChild(toast);
    window.setTimeout(()=>{toast.classList.add('out');window.setTimeout(()=>toast.remove(),260)},2900);
  }
  function safeText(value){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
  function applyTranslations(){
    document.documentElement.lang=store.language;
    $('#languageSelect').value=store.language;
    $$('[data-i18n]').forEach(el=>{const key=el.dataset.i18n;if(t(key)!==key){el.textContent=t(key)}});
    $$('[data-i18n-placeholder]').forEach(el=>{const key=el.dataset.i18nPlaceholder;if(t(key)!==key)el.placeholder=t(key)});
    $$('[data-i18n-title]').forEach(el=>{el.title=t(el.dataset.i18nTitle)});
    document.title=store.language==='en'?'Nexora — technology that inspires':store.language==='pl'?'Nexora — technologia, która inspiruje':'Nexora — технології, що надихають';
    $('#globalSearch').value=store.search;
    renderCategories();renderFilters();renderProducts();renderCart();
    if(store.quizGoal){store.quizGoal=null;resetQuiz()}
  }
  function renderCategories(){
    const grid=$('#categoryGrid');if(!grid)return;
    grid.innerHTML=categories.slice(1).map(c=>`<button class="category-tile ${store.category===c.id?'selected':''}" data-category="${c.id}"><span class="category-symbol">${c.symbol}</span><span class="category-label">${safeText(t(c.label))}</span></button>`).join('');
  }
  function renderFilters(){
    const list=$('#filterList');if(!list)return;
    list.innerHTML=categories.map(c=>`<button class="filter-chip ${store.category===c.id?'active':''}" data-filter="${c.id}">${safeText(t('filter'+c.id[0].toUpperCase()+c.id.slice(1)))}</button>`).join('');
  }
  function getVisibleProducts(){
    let list=products.filter(p=>store.category==='all'||p.category===store.category);
    if(store.search){const q=store.search.toLocaleLowerCase();list=list.filter(p=>[localized(p,'title'),localized(p,'type'),localized(p,'desc'),p.id].join(' ').toLocaleLowerCase().includes(q))}
    if(store.favoritesOnly)list=list.filter(p=>store.favorites.includes(p.id));
    if(store.sort==='price-up')list.sort((a,b)=>a.price-b.price);
    else if(store.sort==='price-down')list.sort((a,b)=>b.price-a.price);
    else if(store.sort==='rating')list.sort((a,b)=>b.rating-a.rating);
    return list;
  }
  function renderProducts(){
    const grid=$('#productGrid');if(!grid)return;
    const list=getVisibleProducts();
    $('#resultsCount').textContent=list.length+' '+t('resultsUnit');
    $('#emptyState').classList.toggle('hidden',list.length!==0);
    grid.classList.toggle('hidden',list.length===0);
    grid.innerHTML=list.map((p,index)=>{
      const tag=tagText(p.tag);
      return `<article class="product-card" style="animation-delay:${Math.min(index,8)*35}ms" data-product-card="${p.id}">
        <div class="product-media" data-view-product="${p.id}" tabindex="0" role="button" aria-label="${safeText(t('quickView'))}: ${safeText(localized(p,'title'))}"><img src="${imagePath(p)}" alt="${safeText(localized(p,'title'))}" loading="lazy">${tag?`<span class="product-tag ${p.tag==='new'?'tag-new':p.tag==='sale'?'tag-sale':''}">${safeText(tag)}</span>`:''}<button class="favorite-button ${store.favorites.includes(p.id)?'is-favorite':''}" data-favorite="${p.id}" aria-label="${safeText(store.favorites.includes(p.id)?t('removedFavorite'):t('addedFavorite'))}" title="${safeText(store.favorites.includes(p.id)?t('removedFavorite'):t('addedFavorite'))}"><svg viewBox="0 0 24 24"><path d="M20.8 8.7c0 5-8.8 11-8.8 11s-8.8-6-8.8-11A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z"/></svg></button></div>
        <div class="product-info"><div class="product-category">${safeText(localized(p,'type'))}</div><h3 class="product-title" data-view-product="${p.id}" tabindex="0">${safeText(localized(p,'title'))}</h3><p class="product-desc">${safeText(localized(p,'desc'))}</p><div class="product-rating"><span class="rating-star">★</span><strong>${p.rating.toFixed(1)}</strong><span class="rating-count">(${p.reviews})</span></div><div class="product-price-line"><span class="product-price">${formatPrice(p.price)}</span>${p.oldPrice?`<span class="old-price">${formatPrice(p.oldPrice)}</span>`:''}</div><div class="product-actions"><button class="add-to-cart" data-add-cart="${p.id}">＋ &nbsp;${safeText(t('buy'))}</button><button class="quick-view" data-view-product="${p.id}" aria-label="${safeText(t('quickView'))}" title="${safeText(t('quickView'))}">↗</button></div></div></article>`;
    }).join('');
  }
  function setCategory(category){store.category=category;store.favoritesOnly=false;$('#favoritesToggle').classList.remove('active');renderCategories();renderFilters();renderProducts();}
  function addToCart(id,qty=1){
    const p=productById(id);if(!p)return;
    const row=store.cart.find(x=>x.id===id);if(row)row.qty=Math.min(99,row.qty+qty);else store.cart.push({id,qty});
    persist('nexora-cart',store.cart);renderCart();showToast(t('addedToCart')+' '+localized(p,'title'),'✓');
  }
  function changeQty(id,amount){const item=store.cart.find(x=>x.id===id);if(!item)return;item.qty+=amount;if(item.qty<=0)store.cart=store.cart.filter(x=>x.id!==id);if(item.qty>99)item.qty=99;persist('nexora-cart',store.cart);renderCart()}
  function removeCartItem(id){store.cart=store.cart.filter(x=>x.id!==id);persist('nexora-cart',store.cart);renderCart();showToast(t('removedFromCart'),'−')}
  function renderCart(){
    const count=cartQuantity();$('#cartCount').textContent=count;$('#drawerCount').textContent='('+count+')';
    const empty=store.cart.length===0;$('#cartEmpty').classList.toggle('hidden',!empty);$('#cartSummary').classList.toggle('hidden',empty);
    $('#cartItems').innerHTML=store.cart.map(item=>{const p=productById(item.id);if(!p)return '';return `<div class="cart-row"><img src="${imagePath(p)}" alt="${safeText(localized(p,'title'))}"><div><div class="cart-row-title">${safeText(localized(p,'title'))}</div><div class="cart-row-meta">${safeText(localized(p,'type'))}</div><div class="cart-row-price">${formatPrice(p.price*item.qty)}</div><div class="quantity-control"><button data-qty="-1" data-id="${p.id}" aria-label="−">−</button><span>${item.qty}</span><button data-qty="1" data-id="${p.id}" aria-label="+">+</button></div></div><button class="remove-item" data-remove-cart="${p.id}" aria-label="Remove">×</button></div>`}).join('');
    const subtotal=cartSubtotal(),shipping=subtotal>=3000?0:(subtotal===0?0:60),total=subtotal+shipping;
    $('#cartSubtotal').textContent=formatPrice(subtotal);$('#cartShipping').textContent=shipping===0?t('shippingIncluded'):formatPrice(shipping);$('#cartTotal').textContent=formatPrice(total);
    $('#freeShippingNote').textContent=subtotal===0?'':subtotal>=3000?t('shippingIncluded')+' — '+t('shippingCost').toLocaleLowerCase():t('shippingFreeLeft')+' '+formatPrice(3000-subtotal);
    $('#checkoutMiniSummary').innerHTML=store.cart.map(item=>{const p=productById(item.id);return p?`<div class="mini-summary-item"><img src="${imagePath(p)}" alt=""><div><strong>${safeText(localized(p,'title'))} × ${item.qty}</strong><small>${formatPrice(p.price*item.qty)}</small></div></div>`:''}).join('');
  }
  function openCart(){closeModal();$('#siteOverlay').classList.add('open');$('#cartDrawer').classList.add('open');$('#cartDrawer').setAttribute('aria-hidden','false');document.body.classList.add('locked')}
  function closeCart(){ $('#siteOverlay').classList.remove('open');$('#cartDrawer').classList.remove('open');$('#cartDrawer').setAttribute('aria-hidden','true');if(!$('.modal-wrap:not(.hidden)'))document.body.classList.remove('locked') }
  function openModal(id){closeCart();$$('.modal-wrap').forEach(el=>el.classList.add('hidden'));const modal=$('#'+id);if(modal){modal.classList.remove('hidden');document.body.classList.add('locked')}}
  function closeModal(){ $$('.modal-wrap').forEach(el=>el.classList.add('hidden'));if(!$('#cartDrawer').classList.contains('open'))document.body.classList.remove('locked') }
  function openProductModal(id){
    const p=productById(id);if(!p)return;const features=p.features[store.language]||p.features.uk;
    $('#productModalContent').innerHTML=`<div class="product-modal-content"><div class="product-modal-image"><img src="${imagePath(p)}" alt="${safeText(localized(p,'title'))}"></div><div class="product-modal-copy"><div class="product-category">${safeText(localized(p,'type'))}</div><h2>${safeText(localized(p,'title'))}</h2><div class="product-rating"><span class="rating-star">★</span><strong>${p.rating.toFixed(1)}</strong><span class="rating-count">(${p.reviews})</span></div><p>${safeText(localized(p,'long'))}</p><h4>${safeText(t('productSpecs'))}</h4><ul class="modal-specs">${features.map(f=>`<li>${safeText(f)}</li>`).join('')}</ul><div class="modal-buy-row"><strong class="modal-price">${formatPrice(p.price)}</strong><button class="button button-primary" data-add-cart="${p.id}">${safeText(t('buy'))} <span>↗</span></button></div></div></div>`;
    openModal('productModal');
  }
  function openCheckout(){if(store.cart.length===0){showToast(t('cartEmptyTitle'),'!');return}closeCart();$('#checkoutForm').classList.remove('hidden');$('#checkoutSuccess').classList.add('hidden');openModal('checkoutModal')}
  function toggleFavorite(id){const had=store.favorites.includes(id);store.favorites=had?store.favorites.filter(x=>x!==id):[...store.favorites,id];persist('nexora-favorites',store.favorites);renderProducts();showToast(t(had?'removedFavorite':'addedFavorite'),had?'−':'♡');if(store.favoritesOnly)renderProducts()}
  function resetQuiz(){store.quizGoal=null;$('#quizStep')?.remove();$('#quizQuestions').classList.remove('hidden');$('#quizResult').classList.add('hidden');$('#quizProgressBar').style.width='50%';$('#quizCard [data-i18n="quizStep"]')?.replaceChildren(document.createTextNode(t('quizStep')));$('#quizQuestions h3').textContent=t('quizQuestion1');$('#quizOptions').innerHTML=[['music','♫','quizMusic'],['work','⌘','quizWork'],['gaming','⌁','quizGaming'],['content','◉','quizContent']].map(([v,icon,key])=>`<button class="quiz-option" data-quiz="${v}"><span class="quiz-option-icon">${icon}</span><span>${safeText(t(key))}</span><span class="option-arrow">↗</span></button>`).join('')}
  function showBudgetStep(goal){
    store.quizGoal=goal;$('#quizProgressBar').style.width='100%';$('.quiz-progress span').textContent=store.language==='en'?'STEP 2 OF 2':store.language==='pl'?'KROK 2 Z 2':'КРОК 2 З 2';$('#quizQuestions h3').textContent=t('quizBudgetQuestion');
    const choices=[['low','budgetLow','↓'],['mid','budgetMid','↔'],['high','budgetHigh','↑']];$('#quizOptions').innerHTML=choices.map(([v,key,icon])=>`<button class="quiz-option" data-budget="${v}"><span class="quiz-option-icon">${icon}</span><span>${safeText(t(key))}</span><span class="option-arrow">↗</span></button>`).join('');
  }
  function showQuizResult(budget){
    const goal=store.quizGoal;let candidates=products.filter(p=>p.quiz.includes(goal));if(!candidates.length)candidates=products.slice();
    if(budget==='low'){const lower=candidates.filter(p=>p.price<=3000);if(lower.length)candidates=lower}
    else if(budget==='mid'){const mid=candidates.filter(p=>p.price>3000&&p.price<=10000);if(mid.length)candidates=mid}
    else if(budget==='high'){const high=candidates.filter(p=>p.price>10000);if(high.length)candidates=high}
    const p=candidates.sort((a,b)=>b.rating-a.rating)[0]||products[0];$('#quizQuestions').classList.add('hidden');$('#quizResult').classList.remove('hidden');
    $('#quizResult').innerHTML=`<span class="eyebrow-small">NEXORA SMART PICKER / 02</span><h3>${safeText(t('quizResultTitle'))}</h3><p>${safeText(t('quizResultCopy'))}</p><div class="quiz-result-product"><img src="${imagePath(p)}" alt="${safeText(localized(p,'title'))}"><div><strong>${safeText(localized(p,'title'))}</strong><small>${safeText(localized(p,'type'))}</small><span class="mini-price">${formatPrice(p.price)}</span></div></div><div class="quiz-actions"><button class="button button-primary" data-quiz-add="${p.id}">${safeText(t('quizAdd'))} ↗</button><button class="quiz-back" id="quizAgain">↺ ${safeText(t('quizTryAgain'))}</button></div>`;
  }
  function setLanguage(language){if(!dictionaries[language])return;store.language=language;try{localStorage.setItem('nexora-language',language)}catch(e){}applyTranslations()}
  function doSearch(query){store.search=query.trim();if(store.search)store.category='all';renderProducts();renderCategories();renderFilters()}

  // Global interactions use delegation so re-rendered product cards remain functional.
  document.addEventListener('click',event=>{
    const add=event.target.closest('[data-add-cart]');if(add){event.preventDefault();addToCart(add.dataset.addCart);return}
    const favorite=event.target.closest('[data-favorite]');if(favorite){event.stopPropagation();toggleFavorite(favorite.dataset.favorite);return}
    const view=event.target.closest('[data-view-product]');if(view){if(event.target.closest('[data-favorite]'))return;openProductModal(view.dataset.viewProduct);return}
    const filter=event.target.closest('[data-filter]');if(filter){store.search='';$('#globalSearch').value='';setCategory(filter.dataset.filter);return}
    const cat=event.target.closest('[data-category]');if(cat){store.search='';$('#globalSearch').value='';setCategory(cat.dataset.category);$('#catalog').scrollIntoView({behavior:'smooth'});return}
    const qty=event.target.closest('[data-qty]');if(qty){changeQty(qty.dataset.id,Number(qty.dataset.qty));return}
    const remove=event.target.closest('[data-remove-cart]');if(remove){removeCartItem(remove.dataset.removeCart);return}
    const budget=event.target.closest('[data-budget]');if(budget){showQuizResult(budget.dataset.budget);return}
    const quiz=event.target.closest('[data-quiz]');if(quiz){showBudgetStep(quiz.dataset.quiz);return}
    const quizAdd=event.target.closest('[data-quiz-add]');if(quizAdd){addToCart(quizAdd.dataset.quizAdd);return}
    if(event.target.closest('#quizAgain')){resetQuiz();return}
    if(event.target.closest('[data-close-modal]')){closeModal();return}
  });
  $$('.product-card [data-view-product]').forEach(el=>el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openProductModal(el.dataset.viewProduct)}}));
  $('#languageSelect').addEventListener('change',e=>setLanguage(e.target.value));
  $('#cartToggle').addEventListener('click',openCart);$('#cartClose').addEventListener('click',closeCart);$('#siteOverlay').addEventListener('click',closeCart);$('#continueShopping').addEventListener('click',()=>{closeCart();$('#catalog').scrollIntoView({behavior:'smooth'})});$('#checkoutButton').addEventListener('click',openCheckout);
  $('#searchToggle').addEventListener('click',()=>{$('#searchBar').classList.toggle('open');if($('#searchBar').classList.contains('open'))$('#globalSearch').focus()});$('#searchClose').addEventListener('click',()=>{$('#searchBar').classList.remove('open');$('#globalSearch').value='';doSearch('')});$('#globalSearch').addEventListener('input',e=>doSearch(e.target.value));
  $('#sortSelect').addEventListener('change',e=>{store.sort=e.target.value;renderProducts()});$('#resetFilters').addEventListener('click',()=>{store.search='';$('#globalSearch').value='';store.favoritesOnly=false;$('#favoritesToggle').classList.remove('active');setCategory('all');renderProducts()});
  $('#favoritesToggle').addEventListener('click',()=>{store.favoritesOnly=!store.favoritesOnly;$('#favoritesToggle').classList.toggle('active',store.favoritesOnly);store.category='all';renderCategories();renderFilters();renderProducts();$('#catalog').scrollIntoView({behavior:'smooth'});if(store.favoritesOnly&&store.favorites.length===0)showToast(t('emptyTitle'),'♡')});
  $('#mobileMenuToggle').addEventListener('click',()=>$('#mainNav').classList.toggle('open'));$$('#mainNav a').forEach(a=>a.addEventListener('click',()=>$('#mainNav').classList.remove('open')));
  $('#footerOrder').addEventListener('click',()=>{if(store.cart.length)openCheckout();else openCart()});$('#showStory').addEventListener('click',()=>{const lang=store.language;const overlay=document.createElement('div');overlay.className='modal-wrap';overlay.innerHTML=`<div class="modal-backdrop"></div><div class="modal-panel checkout-modal"><button class="icon-button modal-close" aria-label="${safeText(t('close'))}">×</button><div class="eyebrow"><span class="eyebrow-line"></span>NEXORA / STORY</div><h2>${safeText(t('storyTitle'))}</h2><p class="modal-subtitle">${safeText(t('storyCopy'))}</p><div class="feature-stats"><div><strong>01</strong><span>${safeText(t('valueQuality'))}</span></div><div><strong>02</strong><span>${safeText(t('valueCare'))}</span></div><div><strong>03</strong><span>${safeText(t('valueGrowth'))}</span></div></div></div>`;document.body.appendChild(overlay);document.body.classList.add('locked');const close=()=>{overlay.remove();document.body.classList.remove('locked')};$('.modal-close',overlay).addEventListener('click',close);$('.modal-backdrop',overlay).addEventListener('click',close)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeCart();$('#mainNav').classList.remove('open');$('#searchBar').classList.remove('open')}});
  $('#contactForm').addEventListener('submit',e=>{e.preventDefault();const feedback=$('#contactFeedback');feedback.textContent=t('contactSuccess');feedback.classList.remove('hidden');e.currentTarget.reset()});
  $('#newsletterForm').addEventListener('submit',e=>{e.preventDefault();$('#newsletterFeedback').textContent=t('newsletterSuccess');$('#newsletterFeedback').classList.remove('hidden');e.currentTarget.reset()});
  $('#checkoutForm').addEventListener('submit',e=>{
    e.preventDefault();if(!store.cart.length){closeModal();showToast(t('cartEmptyTitle'),'!');return}
    const orderNum='NX-'+new Date().getFullYear()+'-'+String(Date.now()).slice(-6);$('#checkoutForm').classList.add('hidden');$('#checkoutSuccess').classList.remove('hidden');$('#checkoutSuccess').innerHTML=`<h3>${safeText(t('orderSuccessTitle'))}</h3><p>${safeText(t('orderSuccessCopy'))}</p><p><strong>${safeText(t('orderNumber'))}: ${safeText(orderNum)}</strong></p><button class="button button-primary" id="finishOrderButton">${safeText(t('finishOrder'))} ↗</button>`;
    store.cart=[];persist('nexora-cart',store.cart);renderCart();$('#finishOrderButton').addEventListener('click',()=>{closeModal();$('#catalog').scrollIntoView({behavior:'smooth'})});
  });
  $('#backToTop').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
  window.addEventListener('scroll',()=>$('#backToTop').classList.toggle('visible',window.scrollY>450),{passive:true});
  // Stagger section reveals without making content inaccessible if observers are unavailable.
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target)}}),{threshold:.12});$$('.section-heading,.about-copy,.feature-copy,.quiz-intro,.shipping-card,.contact-form').forEach(el=>{el.classList.add('reveal');observer.observe(el)})}
  applyTranslations();renderCart();resetQuiz();
})();
