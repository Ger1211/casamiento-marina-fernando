/**
 * Marina & Fernando - Fotos page
 * Upload + gallery for the photo-upload-service backend.
 */

(function () {
  'use strict';

  // =========================================================
  // CONFIG
  // - API_BASE_URL: Tailscale funnel while testing; switch to the
  //   cloud URL on the event day.
  // - EVENT: album slug. Photos for this event are stored separately.
  // =========================================================
  const API_BASE_URL = 'https://desktop-udmt3js.tailfe106b.ts.net';
  const EVENT = 'marina-fernando';

  const cameraInput = document.getElementById('camera-input');
  const galleryInput = document.getElementById('gallery-input');
  const fileList = document.getElementById('file-list');
  const fileCount = document.getElementById('file-count');
  const guestNameInput = document.getElementById('guest-name');
  const submitBtn = document.getElementById('submit-btn');
  const statusMsg = document.getElementById('status-msg');
  const galleryGrid = document.getElementById('gallery-grid');
  const galleryEmpty = document.getElementById('gallery-empty');
  const gallerySub = document.getElementById('gallery-sub');
  const pagination = document.getElementById('pagination');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const pageInfo = document.getElementById('page-info');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const lightboxCount = document.getElementById('lightbox-count');

  let selectedFiles = [];
  let currentPage = 0;
  const PAGE_SIZE = 6;

  let currentPhotos = [];
  let lightboxIndex = 0;
  let totalCount = 0;
  let hasMore = false;
  let lightboxLoading = false;
  let lightboxStatus = '';
  let touchStartX = null;
  let touchMoved = false;

  function resolveUrl(path) {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return API_BASE_URL + path;
  }

  // =========================================================
  // Upload
  // =========================================================
  function handleFileSelect(e) {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length === 0) return;

    selectedFiles = [...selectedFiles, ...newFiles];
    renderFileList();
    statusMsg.textContent = '';
    statusMsg.className = 'status-msg';
  }

  function renderFileList() {
    fileList.innerHTML = '';

    if (selectedFiles.length === 0) {
      fileCount.textContent = '';
      submitBtn.textContent = 'Subir foto';
      submitBtn.disabled = true;
      return;
    }

    selectedFiles.forEach((file, index) => {
      const tag = document.createElement('div');
      tag.className = 'file-tag';

      const thumb = document.createElement('img');
      thumb.className = 'thumb';
      thumb.src = URL.createObjectURL(file);
      tag.appendChild(thumb);

      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = file.name;
      tag.appendChild(name);

      const remove = document.createElement('button');
      remove.className = 'remove';
      remove.innerHTML = '&times;';
      remove.title = 'Quitar ' + file.name;
      remove.addEventListener('click', () => removeFile(index));
      tag.appendChild(remove);

      fileList.appendChild(tag);
    });

    fileCount.textContent = selectedFiles.length === 1
      ? '1 foto seleccionada'
      : selectedFiles.length + ' fotos seleccionadas';
    submitBtn.textContent = selectedFiles.length > 1
      ? 'Subir ' + selectedFiles.length + ' fotos'
      : 'Subir foto';
    submitBtn.disabled = false;
  }

  function removeFile(index) {
    const thumbs = fileList.querySelectorAll('.thumb');
    if (thumbs[index]) URL.revokeObjectURL(thumbs[index].src);
    selectedFiles.splice(index, 1);
    renderFileList();
  }

  cameraInput.addEventListener('change', handleFileSelect);
  galleryInput.addEventListener('change', handleFileSelect);

  submitBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Subiendo...';
    statusMsg.textContent = '';
    statusMsg.className = 'status-msg';

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));
    formData.append('event', EVENT);
    const guestName = guestNameInput.value.trim();
    if (guestName) formData.append('guestName', guestName);

    try {
      const resp = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await resp.json();

      if (data.success && data.uploaded > 0) {
        statusMsg.textContent = data.message || 'Las fotos se subieron correctamente.';
        statusMsg.className = 'status-msg success';
        cameraInput.value = '';
        galleryInput.value = '';
        selectedFiles.forEach((_, i) => {
          const thumb = fileList.querySelectorAll('.thumb')[i];
          if (thumb) URL.revokeObjectURL(thumb.src);
        });
        selectedFiles = [];
        renderFileList();
        guestNameInput.value = '';
        currentPage = 0;
        loadGallery();
      } else {
        statusMsg.textContent = data.message || 'Ocurrió un error al subir la foto.';
        statusMsg.className = 'status-msg error';
      }
    } catch (err) {
      statusMsg.textContent = 'No se pudo conectar con el servidor. Intenta de nuevo.';
      statusMsg.className = 'status-msg error';
    }

    submitBtn.textContent = 'Subir foto';
    submitBtn.disabled = selectedFiles.length === 0;
  });

  // =========================================================
  // Gallery
  // =========================================================
  function showLoadingPlaceholders() {
    galleryGrid.innerHTML = '';
    for (let i = 0; i < PAGE_SIZE; i++) {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.innerHTML = '<div class="loader"><div class="loader-spin"></div></div>';
      galleryGrid.appendChild(item);
    }
  }

  async function fetchPage(page) {
    const resp = await fetch(
      `${API_BASE_URL}/api/photos?event=${encodeURIComponent(EVENT)}&page=${page}&size=${PAGE_SIZE}`
    );
    return resp.json();
  }

  function applyGalleryData(data) {
    currentPhotos = data.photos || [];
    totalCount = data.total || 0;
    hasMore = !!data.hasMore;

    galleryGrid.innerHTML = '';

    if (currentPhotos.length === 0) {
      galleryEmpty.style.display = 'block';
      if (gallerySub) gallerySub.style.display = 'none';
      pagination.style.display = 'none';
      return;
    }

    galleryEmpty.style.display = 'none';
    if (gallerySub) gallerySub.style.display = 'block';
    pagination.style.display = 'flex';

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    pageInfo.textContent = `Página ${currentPage + 1} de ${totalPages}`;
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = !hasMore;

    currentPhotos.forEach((photo, idx) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      if (photo.thumbnail) {
        const img = document.createElement('img');
        img.src = resolveUrl(photo.thumbnail);
        img.alt = photo.originalName || 'Foto';
        img.loading = 'lazy';
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
          lightboxStatus = '';
          lightboxIndex = idx;
          updateLightbox();
          lightbox.classList.add('active');
        });
        item.appendChild(img);
      }
      galleryGrid.appendChild(item);
    });
  }

  async function loadGallery() {
    showLoadingPlaceholders();

    try {
      const data = await fetchPage(currentPage);
      applyGalleryData(data);
    } catch (err) {
      galleryGrid.innerHTML = '';
      galleryEmpty.textContent = 'No se pudo cargar la galería. Verificá tu conexión.';
      galleryEmpty.style.display = 'block';
      if (gallerySub) gallerySub.style.display = 'none';
      pagination.style.display = 'none';
    }
  }

  // =========================================================
  // Lightbox navigation
  // =========================================================
  function resolveLightboxUrl(photo) {
    if (!photo) return '';
    const full = photo.url || photo.image || photo.full || photo.original;
    if (full) return resolveUrl(full);
    return resolveUrl(photo.thumbnail);
  }

  function updateLightbox() {
    const photo = currentPhotos[lightboxIndex];
    if (!photo) {
      lightboxImg.src = '';
      lightboxCount.textContent = lightboxStatus || '';
      lightboxPrev.disabled = true;
      lightboxNext.disabled = true;
      return;
    }

    lightboxImg.src = resolveLightboxUrl(photo);
    lightboxCount.textContent = lightboxStatus || (totalCount > 0
      ? `${currentPage * PAGE_SIZE + lightboxIndex + 1} / ${totalCount}`
      : '');

    lightboxPrev.disabled = lightboxLoading || (currentPage === 0 && lightboxIndex === 0);
    lightboxNext.disabled = lightboxLoading || (!hasMore && lightboxIndex === currentPhotos.length - 1);
  }

  async function navigateLightbox(delta) {
    if (lightboxLoading) return;

    const target = lightboxIndex + delta;
    if (target >= 0 && target < currentPhotos.length) {
      lightboxStatus = '';
      lightboxIndex = target;
      updateLightbox();
      return;
    }

    if (delta > 0 && !hasMore) return;
    if (delta < 0 && currentPage === 0) return;

    const nextPage = currentPage + delta;
    lightboxLoading = true;
    lightboxPrev.disabled = true;
    lightboxNext.disabled = true;
    lightboxImg.style.opacity = '0.4';
    try {
      const data = await fetchPage(nextPage);
      if (!data.photos || data.photos.length === 0) {
        hasMore = false;
        lightboxStatus = 'No hay más fotos.';
        return;
      }
      currentPage = nextPage;
      currentPhotos = data.photos;
      totalCount = data.total || 0;
      hasMore = !!data.hasMore;
      lightboxIndex = delta > 0 ? 0 : currentPhotos.length - 1;
      lightboxStatus = '';
      applyGalleryData(data);
    } catch (err) {
      lightboxStatus = 'No se pudo cargar.';
    } finally {
      lightboxLoading = false;
      lightboxImg.style.opacity = '1';
      updateLightbox();
    }
  }

  prevBtn.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage--;
      loadGallery();
    }
  });

  nextBtn.addEventListener('click', () => {
    currentPage++;
    loadGallery();
  });

  lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
  lightboxNext.addEventListener('click', () => navigateLightbox(1));

  lightboxClose.addEventListener('click', () => lightbox.classList.remove('active'));
  lightbox.addEventListener('click', (e) => {
    if (touchMoved) {
      touchMoved = false;
      return;
    }
    if (e.target === lightbox) lightbox.classList.remove('active');
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') {
      lightbox.classList.remove('active');
    } else if (e.key === 'ArrowLeft') {
      navigateLightbox(-1);
    } else if (e.key === 'ArrowRight') {
      navigateLightbox(1);
    }
  });

  lightbox.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchMoved = false;
  }, { passive: true });

  lightbox.addEventListener('touchmove', () => {
    touchMoved = true;
  }, { passive: true });

  lightbox.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(deltaX) > 40) {
      navigateLightbox(deltaX < 0 ? 1 : -1);
    }
  }, { passive: true });

  loadGallery();
})();