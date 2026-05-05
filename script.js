/* ═══════════════════════════════════════════
   Unified Site — Filter, Search, Draggable Header, Bio Panel & Scroll
   Mode detection: personal (jinmorhee.net) / lab (destectic.net)
   ═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ─── Mode Detection ───
  const siteMode = document.body.getAttribute('data-mode') || 'personal';
  const isLab = siteMode === 'lab';

  // Show/hide mode-specific filter buttons
  document.querySelectorAll('.filter-personal').forEach(b => {
    b.style.display = isLab ? 'none' : '';
  });
  document.querySelectorAll('.filter-lab').forEach(b => {
    b.style.display = isLab ? '' : 'none';
  });

  // Hide cards not for current mode
  document.querySelectorAll('.card[data-lab-only]').forEach(c => {
    if (!isLab) c.classList.add('hidden');
  });
  document.querySelectorAll('.card[data-personal-only]').forEach(c => {
    if (isLab) c.classList.add('hidden');
  });

  // ─── Utility ───
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // Category attribute name depends on mode
  const catAttr = isLab ? 'catLab' : 'catPersonal';

  // ─── Filter & Search ───
  const filterBtns = document.querySelectorAll('.filter-btn:not([style*="display: none"])');
  const allFilterBtns = document.querySelectorAll('.filter-btn');
  const searchInput = document.getElementById('search');
  const allCards = document.querySelectorAll('.card');
  const noResults = document.getElementById('noResults');
  const grid = document.getElementById('grid');

  let currentFilter = 'all';
  let currentSearch = '';
  let savedHeaderPos = null;

  allFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      allFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      applyFilters();
      enterFilterMode();
    });
  });

  let timeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      currentSearch = searchInput.value.toLowerCase().trim();
      applyFilters();
      if (currentSearch !== '') {
        enterFilterMode();
      }
    }, 150);
  });

  // ─── Filter-active mode: toggle body class + move header ───
  // Active when ANY filter button (including "All") is clicked or search is used.
  // Returns to default (news visible, centered) ONLY when "News" tab is clicked.
  function enterFilterMode() {
    const hdr = document.querySelector('.float-header');
    if (document.body.classList.contains('filter-active')) return; // already active

    resolveHeaderTransform();
    savedHeaderPos = {
      x: parseInt(hdr.style.left, 10) || 0,
      y: parseInt(hdr.style.top, 10) || 0
    };

    // Close bio if open
    const bp = document.getElementById('bioPanel');
    if (bp && bp.classList.contains('open')) {
      bp.classList.remove('open');
      document.getElementById('newsTicker').classList.remove('hidden');
    }

    document.body.classList.add('filter-active');

    // Wait for news-bio-wrap to collapse, then move header to bottom-right
    setTimeout(() => {
      hdr.style.transition = 'top 0.5s ease, left 0.5s ease';
      const targetX = window.innerWidth - hdr.offsetWidth - 20;
      const targetY = window.innerHeight - hdr.offsetHeight - 20;
      setHeaderPos(targetX, Math.max(0, targetY));
      setTimeout(() => { hdr.style.transition = ''; }, 550);
    }, 420);
  }

  function leaveFilterMode() {
    const hdr = document.querySelector('.float-header');
    if (!document.body.classList.contains('filter-active')) return; // already default

    document.body.classList.remove('filter-active');

    // Restore header position
    setTimeout(() => {
      if (savedHeaderPos) {
        hdr.style.transition = 'top 0.5s ease, left 0.5s ease';
        setHeaderPos(savedHeaderPos.x, savedHeaderPos.y);
        setTimeout(() => { hdr.style.transition = ''; }, 550);
        savedHeaderPos = null;
      }
    }, 50);
  }

  function applyFilters() {
    // ─── FLIP Step 1: Record OLD positions of currently visible cards ───
    const oldPositions = new Map();
    allCards.forEach(card => {
      if (!card.classList.contains('hidden')) {
        oldPositions.set(card, card.getBoundingClientRect());
      }
    });

    // ─── Step 2: Determine which cards match ───
    const toShow = [];
    const toHide = [];
    let visible = 0;

    allCards.forEach(card => {
      // Skip cards not for current mode
      if (!isLab && card.hasAttribute('data-lab-only')) return;
      if (isLab && card.hasAttribute('data-personal-only')) return;

      const categories = (card.dataset[catAttr] || '').split(' ');
      const text = card.textContent.toLowerCase();
      const matchFilter = (currentFilter === 'all') || categories.includes(currentFilter);
      const matchSearch = (currentSearch === '') || text.includes(currentSearch);

      if (matchFilter && matchSearch) {
        if (card.classList.contains('hidden')) toShow.push(card);
        visible++;
      } else {
        if (!card.classList.contains('hidden')) toHide.push(card);
      }
    });

    // ─── Step 3: Fade out cards that should hide ───
    toHide.forEach(card => {
      card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.85)';
    });

    // ─── Step 4: After fade-out, update DOM and FLIP animate ───
    setTimeout(() => {
      // Actually hide them
      toHide.forEach(card => {
        card.classList.add('hidden');
        card.style.transition = '';
        card.style.opacity = '';
        card.style.transform = '';
      });

      // Show new cards (invisible initially)
      toShow.forEach(card => {
        card.classList.remove('hidden');
        card.style.opacity = '0';
        card.style.transform = 'scale(0.85)';
      });

      // ─── FLIP Step 5: Record NEW positions ───
      const newPositions = new Map();
      allCards.forEach(card => {
        if (!card.classList.contains('hidden')) {
          newPositions.set(card, card.getBoundingClientRect());
        }
      });

      // ─── FLIP Step 6: Animate from old to new ───
      requestAnimationFrame(() => {
        allCards.forEach(card => {
          if (card.classList.contains('hidden')) return;

          const newRect = newPositions.get(card);
          const oldRect = oldPositions.get(card);

          if (oldRect && newRect) {
            // Card was visible before and after — fly to new position
            const dx = oldRect.left - newRect.left;
            const dy = oldRect.top - newRect.top;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
              card.style.transition = 'none';
              card.style.transform = `translate(${dx}px, ${dy}px)`;
              card.style.opacity = '1';
              requestAnimationFrame(() => {
                card.style.transition = 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease';
                card.style.transform = '';
              });
            }
          } else {
            // Card is newly appearing — fade + scale in
            card.style.transition = 'none';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.85)';
            requestAnimationFrame(() => {
              card.style.transition = 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease';
              card.style.opacity = '1';
              card.style.transform = '';
            });
          }
        });

        // Clean up inline styles after animation
        setTimeout(() => {
          allCards.forEach(card => {
            card.style.transition = '';
            card.style.opacity = '';
            card.style.transform = '';
          });
        }, 500);
      });

      noResults.style.display = visible === 0 ? 'block' : 'none';
    }, 250); // Wait for fade-out to finish
  }

  // ═══════════════════════════════════════════
  //  BIO PANEL TOGGLE
  // ═══════════════════════════════════════════

  const bioToggle = document.getElementById('bioToggle');
  const newsToggle = document.getElementById('newsToggle');
  const bioPanel = document.getElementById('bioPanel');
  const header = document.querySelector('.float-header');
  const newsTicker = document.getElementById('newsTicker');

  // ─── Auto-cycling news ticker (continuous scroll) with featured pinning ───
  const newsItems = Array.from(newsTicker.querySelectorAll('.news-item'));
  const CYCLE_INTERVAL = 6000; // 6s pause between rolls
  let tickerInterval = null;

  // Separate featured from regular news
  const featuredItems = newsItems.filter(el => el.dataset.featured === 'true');
  const regularItems = newsItems.filter(el => el.dataset.featured !== 'true');
  const featuredHTML = featuredItems.map(el => el.outerHTML);
  const regularHTML = regularItems.map(el => el.outerHTML);
  // Preserve original HTML of ALL news items (hoisted for expand view)
  const allNewsHTML = newsItems.map(el => el.outerHTML);

  if (newsItems.length > 0) {
    let newsIndex = 0;

    // Preserve the expand button before clearing
    const expandBtnEl = newsTicker.querySelector('.news-expand-btn');
    newsTicker.innerHTML = '';
    if (expandBtnEl) newsTicker.appendChild(expandBtnEl);

    // Create pinned featured container
    if (featuredHTML.length > 0) {
      const featuredWrap = document.createElement('div');
      featuredWrap.className = 'news-featured-wrap';
      featuredHTML.forEach(h => featuredWrap.insertAdjacentHTML('beforeend', h));
      newsTicker.appendChild(featuredWrap);
    }

    // Create clip wrapper + inner for scrolling regular items
    const clipWrap = document.createElement('div');
    clipWrap.className = 'news-ticker-scroll-clip';
    newsTicker.appendChild(clipWrap);
    const inner = document.createElement('div');
    inner.className = 'news-ticker-inner';
    clipWrap.appendChild(inner);

    // Put regular items in so they flow continuously
    for (let i = 0; i < regularHTML.length; i++) {
      inner.insertAdjacentHTML('beforeend', regularHTML[i]);
    }
    newsIndex = regularHTML.length;

    let isAnimating = false;

    // Only cycle if more than 1 regular item
    if (regularHTML.length > 1) {
      tickerInterval = setInterval(() => {
        if (isAnimating) return;
        const items = inner.querySelectorAll('.news-item');
        if (items.length === 0) return;

        isAnimating = true;

        // Measure how far to shift: first item height + gap
        const firstItem = items[0];
        const gap = parseFloat(getComputedStyle(inner).gap) || 0;
        const shift = firstItem.offsetHeight + gap;

        // Enable transition, slide everything up
        inner.classList.add('animating');
        inner.style.transform = `translateY(-${shift}px)`;

        // After transition ends: snap back, swap items
        const onEnd = () => {
          inner.removeEventListener('transitionend', onEnd);

          // Disable transition for instant reset
          inner.classList.remove('animating');
          inner.style.transform = 'translateY(0)';

          // Remove top item
          firstItem.remove();

          // Append next regular item at bottom
          const nextHTML = regularHTML[newsIndex % regularHTML.length];
          newsIndex++;
          inner.insertAdjacentHTML('beforeend', nextHTML);

          isAnimating = false;
        };

        inner.addEventListener('transitionend', onEnd);
      }, CYCLE_INTERVAL);
    }
  }

  // ─── Helper: show News view ───
  function showNews() {
    bioPanel.classList.remove('open');
    bioToggle.classList.remove('active');
    newsTicker.classList.remove('hidden');
    newsToggle.classList.add('active');
  }

  // ─── Helper: show Bio view ───
  function showBio() {
    newsTicker.classList.add('hidden');
    newsToggle.classList.remove('active');
    bioPanel.classList.add('open');
    bioToggle.classList.add('active');
  }

  // ─── Helper: close both (back to news as default) ───
  function closeAll() {
    bioPanel.classList.remove('open');
    bioToggle.classList.remove('active');
    newsTicker.classList.remove('hidden');
    newsToggle.classList.remove('active');
  }

  // Default state: News is visible
  newsToggle.classList.add('active');

  // ─── News toggle → return to default state ───
  newsToggle.addEventListener('click', (e) => {
    e.stopPropagation();

    // Reset filter to 'all' and clear search
    currentFilter = 'all';
    currentSearch = '';
    searchInput.value = '';
    filterBtns.forEach(b => b.classList.remove('active'));
    // Activate the "All" filter button visually
    filterBtns.forEach(b => { if (b.dataset.filter === 'all') b.classList.add('active'); });
    applyFilters();

    // Leave filter-active mode (restore center position, show news)
    leaveFilterMode();
    showNews();
  });

  // ─── Bio toggle ───
  bioToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (bioPanel.classList.contains('open')) {
      showNews(); // toggle off → back to news
    } else {
      showBio();
    }
  });

  document.addEventListener('click', (e) => {
    if (!bioPanel.contains(e.target) && !bioToggle.contains(e.target) &&
        !newsToggle.contains(e.target) && !newsTicker.contains(e.target) &&
        bioPanel.classList.contains('open')) {
      showNews();
    }
  });

  // ═══════════════════════════════════════════
  //  DETAIL MODAL
  // ═══════════════════════════════════════════

  const modalOverlay = document.getElementById('modalOverlay');
  const modalContent = document.getElementById('modalContent');
  const modalClose = document.getElementById('modalClose');
  const modalTag = document.getElementById('modalTag');
  const modalTitle = document.getElementById('modalTitle');
  const modalDate = document.getElementById('modalDate');
  const modalBody = document.getElementById('modalBody');
  const modalMedia = document.getElementById('modalMedia');
  const modalRelatedLinks = document.getElementById('modalRelatedLinks');

  // Load post data from embedded JSON
  let postData = {};
  try {
    const dataEl = document.getElementById('postData');
    if (dataEl) postData = JSON.parse(dataEl.textContent);
  } catch (e) { console.warn('No post data found'); }

  function openModal(postId) {
    const data = postData[postId];
    if (!data) return;
    modalTag.textContent = isLab ? (data.tag_lab || data.tag || '') : (data.tag_personal || data.tag || '');
    // Title with optional status badge
    if (data.status) {
      modalTitle.innerHTML = escapeHtml(data.title) + ' <span class="modal-status-badge">' + escapeHtml(data.status) + '</span>';
    } else {
      modalTitle.textContent = data.title;
    }
    modalDate.textContent = data.date;

    // Render related links below date
    modalRelatedLinks.innerHTML = '';
    if (data.related_links && data.related_links.length > 0) {
      data.related_links.forEach(rl => {
        const a = document.createElement('a');
        a.href = rl.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'modal-rel-link';
        a.textContent = rl.label;
        modalRelatedLinks.appendChild(a);
      });
    }

    // Clear previous content
    modalBody.innerHTML = '';
    modalMedia.innerHTML = '';

    // Render content_blocks in order (text + media interleaved)
    const blocks = data.content_blocks || [];
    const container = modalBody; // Use modalBody as the single container

    if (blocks.length > 0) {
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.type === 'heading') {
          const h = document.createElement('h3');
          h.className = 'modal-section-heading';
          h.textContent = block.text;
          container.appendChild(h);
        } else if (block.type === 'text') {
          // Split text into paragraphs
          const paragraphs = block.text.split('\n').filter(p => p.trim());
          paragraphs.forEach(pText => {
            const p = document.createElement('p');
            p.className = 'modal-text-block';
            p.innerHTML = pText;
            container.appendChild(p);
          });
        } else if (block.type === 'video') {
          const wrap = document.createElement('div');
          wrap.className = 'modal-media-item';
          const iframe = document.createElement('iframe');
          iframe.src = block.src + '?autoplay=1&loop=1&title=0&byline=0&portrait=0';
          iframe.allow = 'autoplay; fullscreen; picture-in-picture';
          iframe.allowFullscreen = true;
          wrap.appendChild(iframe);
          container.appendChild(wrap);
        } else if (block.type === 'image' && block.small && i + 1 < blocks.length && blocks[i + 1].type === 'text') {
          // Small image: side-by-side layout (image left, text right)
          const row = document.createElement('div');
          row.className = 'modal-media-row';
          const imgWrap = document.createElement('div');
          imgWrap.className = 'modal-media-row-img';
          const img = document.createElement('img');
          img.src = 'imgs/' + block.src;
          img.alt = block.caption || '';
          img.loading = 'lazy';
          imgWrap.appendChild(img);
          if (block.caption) {
            const cap = document.createElement('div');
            cap.className = 'modal-media-caption';
            cap.textContent = block.caption;
            imgWrap.appendChild(cap);
          }
          row.appendChild(imgWrap);
          // Consume next text block
          i++;
          const textBlock = blocks[i];
          const textWrap = document.createElement('div');
          textWrap.className = 'modal-media-row-text';
          const paragraphs = textBlock.text.split('\n').filter(p => p.trim());
          paragraphs.forEach(pText => {
            const p = document.createElement('p');
            p.className = 'modal-text-block';
            p.innerHTML = pText;
            textWrap.appendChild(p);
          });
          row.appendChild(textWrap);
          container.appendChild(row);
        } else if (block.type === 'image') {
          const wrap = document.createElement('div');
          wrap.className = 'modal-media-item';
          const img = document.createElement('img');
          img.src = 'imgs/' + block.src;
          img.alt = block.caption || '';
          img.loading = 'lazy';
          wrap.appendChild(img);
          if (block.caption) {
            const cap = document.createElement('div');
            cap.className = 'modal-media-caption';
            cap.textContent = block.caption;
            wrap.appendChild(cap);
          }
          container.appendChild(wrap);
        }
      }
    } else if (data.thumbnail) {
      // Fallback: just show thumbnail
      const wrap = document.createElement('div');
      wrap.className = 'modal-media-item';
      const img = document.createElement('img');
      img.src = 'imgs/' + data.thumbnail;
      img.alt = data.title;
      wrap.appendChild(img);
      container.appendChild(wrap);
    }

    // "View original" removed — link is now shown as a related_link button
    modalOverlay.classList.add('open');
    modalContent.scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    // Stop all playing videos by removing iframes
    modalBody.querySelectorAll('iframe').forEach(iframe => {
      iframe.src = '';
    });
  }

  // Card click → open modal
  allCards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const postId = card.dataset.postId;
      if (postId) openModal(postId);
    });
  });

  // News ticker item click → open same modal
  newsTicker.addEventListener('click', (e) => {
    const item = e.target.closest('.news-item[data-post-id]');
    if (item) {
      const postId = item.getAttribute('data-post-id');
      if (postId) openModal(postId);
    }
  });

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
    if (e.key === 'Escape' && header.classList.contains('news-expanded')) collapseNews();
  });

  // ═══════════════════════════════════════════
  //  EXPANDED NEWS VIEW (header grows to fill screen)
  // ═══════════════════════════════════════════

  const newsExpandBtn = document.getElementById('newsExpandBtn');
  let preExpandPos = null;

  function expandNews() {
    // Save current position before expanding
    resolveHeaderTransform();
    preExpandPos = {
      x: parseInt(header.style.left, 10) || 0,
      y: parseInt(header.style.top, 10) || 0
    };

    // Clear ALL inline styles so CSS class can take full control
    header.style.top = '';
    header.style.left = '';
    header.style.right = '';
    header.style.bottom = '';
    header.style.width = '';
    header.style.height = '';
    header.style.maxWidth = '';
    header.style.transform = '';
    header.style.transition = '';

    // Hide featured wrap (items go into the grid too)
    const featWrap = newsTicker.querySelector('.news-featured-wrap');
    if (featWrap) featWrap.style.display = 'none';

    // Rebuild ticker with ALL items (featured first, then regular)
    const inner = newsTicker.querySelector('.news-ticker-inner');
    if (inner && allNewsHTML.length > 0) {
      inner.innerHTML = '';
      allNewsHTML.forEach(html => {
        inner.insertAdjacentHTML('beforeend', html);
      });
      // Stop animation while expanded
      inner.classList.remove('animating');
      inner.style.transform = 'none';
    }

    // Pause auto-cycling
    if (tickerInterval) clearInterval(tickerInterval);

    header.classList.add('news-expanded');
    // Change button icon to collapse (↙)
    newsExpandBtn.innerHTML = '&#x2199;';
    newsExpandBtn.title = 'Collapse news';
  }

  function collapseNews() {
    newsExpandBtn.innerHTML = '&#x2197;';
    newsExpandBtn.title = 'Expand news';

    // Step 1: Capture current expanded rect
    const expandedRect = header.getBoundingClientRect();

    // Step 2: Measure collapsed height using an offscreen clone (avoids touching real header)
    const clone = header.cloneNode(true);
    clone.classList.remove('news-expanded');
    clone.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;max-width:500px;width:500px;height:auto;top:-9999px;left:-9999px;transform:none;';
    document.body.appendChild(clone);
    const collapsedHeight = clone.offsetHeight;
    clone.remove();

    // Step 3: Remove class, immediately freeze at expanded size with inline styles
    header.classList.remove('news-expanded');
    header.style.maxWidth = expandedRect.width + 'px';
    header.style.width = expandedRect.width + 'px';
    header.style.height = expandedRect.height + 'px';
    header.style.top = expandedRect.top + 'px';
    header.style.left = expandedRect.left + 'px';
    header.style.transform = 'none';
    header.style.overflow = 'hidden';

    // Force browser to commit the above layout
    void header.offsetHeight;

    // Step 4: Set transition + target values → browser animates
    header.style.transition = 'width 0.45s ease, height 0.45s ease, top 0.45s ease, left 0.45s ease, max-width 0.45s ease';
    header.style.maxWidth = '500px';
    header.style.width = '500px';
    header.style.height = collapsedHeight + 'px';
    if (preExpandPos) {
      header.style.top = preExpandPos.y + 'px';
      header.style.left = preExpandPos.x + 'px';
    }

    // Step 5: After transition completes, clean up
    const onDone = () => {
      header.removeEventListener('transitionend', onDone);
      header.style.transition = '';
      header.style.maxWidth = '';
      header.style.width = '';
      header.style.height = '';
      header.style.overflow = '';
      if (preExpandPos) {
        setHeaderPos(preExpandPos.x, preExpandPos.y);
        preExpandPos = null;
      }

      // Restore featured wrap + restart cycling regular items only
      const featWrap = newsTicker.querySelector('.news-featured-wrap');
      if (featWrap) featWrap.style.display = '';

      const inner = newsTicker.querySelector('.news-ticker-inner');
      if (inner) {
        inner.innerHTML = '';
        inner.style.transform = 'translateY(0)';
        regularHTML.forEach(html => {
          inner.insertAdjacentHTML('beforeend', html);
        });
        restartTicker();
      }
    };
    header.addEventListener('transitionend', onDone);
  }

  function restartTicker() {
    if (tickerInterval) clearInterval(tickerInterval);
    if (regularHTML.length <= 1) return;

    let newsIdx = regularHTML.length;
    let isAnim = false;
    const inner = newsTicker.querySelector('.news-ticker-inner');

    tickerInterval = setInterval(() => {
      if (isAnim || header.classList.contains('news-expanded')) return;
      const items = inner.querySelectorAll('.news-item');
      if (items.length === 0) return;
      isAnim = true;
      const firstItem = items[0];
      const gap = parseFloat(getComputedStyle(inner).gap) || 0;
      const shift = firstItem.offsetHeight + gap;
      inner.classList.add('animating');
      inner.style.transform = `translateY(-${shift}px)`;
      const onEnd = () => {
        inner.removeEventListener('transitionend', onEnd);
        inner.classList.remove('animating');
        inner.style.transform = 'translateY(0)';
        firstItem.remove();
        const nextHTML = regularHTML[newsIdx % regularHTML.length];
        newsIdx++;
        inner.insertAdjacentHTML('beforeend', nextHTML);
        isAnim = false;
      };
      inner.addEventListener('transitionend', onEnd);
    }, CYCLE_INTERVAL);
  }

  newsExpandBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (header.classList.contains('news-expanded')) {
      collapseNews();
    } else {
      expandNews();
    }
  });

  // ═══════════════════════════════════════════
  //  HORIZONTAL SCROLL via Mouse Wheel
  // ═══════════════════════════════════════════

  grid.addEventListener('wheel', (e) => {
    if (e.target.closest('.float-header')) return;
    e.preventDefault();
    // Support both vertical and horizontal wheel/trackpad
    // Vertical: deltaY positive = scroll down = go right
    // Horizontal: deltaX used as-is
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : -e.deltaY;
    grid.scrollLeft += delta * 2.5;
  }, { passive: false });

  // ═══════════════════════════════════════════
  //  DRAGGABLE FLOATING HEADER
  // ═══════════════════════════════════════════

  let isDragging = false;
  let dragStartX, dragStartY;
  let headerStartX, headerStartY;

  // Convert transform-based centering to explicit top/left once
  function resolveHeaderTransform() {
    if (header.dataset.resolved) return;
    const rect = header.getBoundingClientRect();
    header.style.top = rect.top + 'px';
    header.style.left = rect.left + 'px';
    header.style.bottom = 'auto';
    header.style.right = 'auto';
    header.style.transform = 'none';
    header.dataset.resolved = '1';
  }

  function getHeaderPos() {
    const rect = header.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  }

  function setHeaderPos(x, y) {
    const w = header.offsetWidth;
    // Keep header within horizontal bounds
    x = Math.max(0, Math.min(window.innerWidth - w, x));
    // Vertical: don't let top go above screen; allow extending below if header is tall
    y = Math.max(0, Math.min(window.innerHeight - 60, y));
    header.style.top = y + 'px';
    header.style.left = x + 'px';
    header.style.bottom = 'auto';
    header.style.right = 'auto';
    header.style.transform = 'none';
  }

  // Mouse
  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('a, button, input, .bio-text')) return;
    resolveHeaderTransform(); // clear CSS centering transform on first drag
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const pos = getHeaderPos();
    headerStartX = pos.x;
    headerStartY = pos.y;
    header.style.cursor = 'grabbing';
    header.style.transition = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    setHeaderPos(headerStartX + e.clientX - dragStartX, headerStartY + e.clientY - dragStartY);
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    header.style.cursor = 'grab';
    header.style.transition = '';
  });

  // Touch
  header.addEventListener('touchstart', (e) => {
    if (e.target.closest('a, button, input, .bio-text')) return;
    resolveHeaderTransform(); // clear CSS centering transform on first drag
    isDragging = true;
    const t = e.touches[0];
    dragStartX = t.clientX;
    dragStartY = t.clientY;
    const pos = getHeaderPos();
    headerStartX = pos.x;
    headerStartY = pos.y;
    header.style.transition = 'none';
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const t = e.touches[0];
    setHeaderPos(headerStartX + t.clientX - dragStartX, headerStartY + t.clientY - dragStartY);
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    header.style.transition = '';
  });

  // Keep in viewport on resize
  window.addEventListener('resize', () => {
    if (header.dataset.resolved) {
      // Already using explicit positioning — re-clamp
      setHeaderPos(parseInt(header.style.left, 10) || 0, parseInt(header.style.top, 10) || 0);
    } else {
      // Still CSS-centered — re-center via transform (no action needed),
      // but check if it went out of view
      const rect = header.getBoundingClientRect();
      if (rect.right > window.innerWidth || rect.left < 0 || rect.top < 0) {
        resolveHeaderTransform();
        setHeaderPos(
          Math.max(0, Math.min(window.innerWidth - header.offsetWidth, rect.left)),
          Math.max(0, rect.top)
        );
      }
    }
  });

});
