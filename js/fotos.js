/**
 * Marina & Fernando - Fotos page
 * Upload + gallery for the photo-upload-service backend.
 */

(function () {
  'use strict';

  // =========================================================
  // CONFIG
  // - CLOUD_URL: the Hetzner VM (primary).
  // - PC_URL: the home PC, an identical replica (fallback).
  //   One fast health probe decides which one serves this page load, so the
  //   site keeps working when the VM is off.
  // - EVENT: album slug. Photos for this event are stored separately.
  // =========================================================
  const CLOUD_URL = 'https://nube-fotos.tailfe106b.ts.net';
  const PC_URL = 'https://desktop-udmt3js.tailfe106b.ts.net';

  const backend = window.PhotoBackend.create({
    cloudUrl: CLOUD_URL,
    pcUrl: PC_URL,
    timeoutMs: 2000,
    onSelect: (base) => console.info('[fotos] backend:', base)
  });

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
  const selectedFilePreviews = new Map();
  let currentPage = 0;
  const PAGE_SIZE = 6;

  let currentPhotos = [];
  let lightboxIndex = 0;
  let totalCount = 0;
  let hasMore = false;
  let lightboxLoading = false;
  let lightboxStatus = '';
  let lightboxImageRequest = 0;
  let touchStartX = null;
  let touchMoved = false;

  function resolveUrl(path) {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return backend.getBase() + path;
  }

  // Start the health probe now: the page keeps painting while it resolves.
  backend.select();

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
      let previewUrl = selectedFilePreviews.get(file);
      if (!previewUrl) {
        previewUrl = URL.createObjectURL(file);
        selectedFilePreviews.set(file, previewUrl);
      }
      thumb.src = previewUrl;
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
    const [removedFile] = selectedFiles.splice(index, 1);
    revokeSelectedPreview(removedFile);
    renderFileList();
  }

  function revokeSelectedPreview(file) {
    const previewUrl = selectedFilePreviews.get(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      selectedFilePreviews.delete(file);
    }
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
      const resp = await backend.withBackend((base) =>
        fetch(`${base}/api/upload`, {
          method: 'POST',
          body: formData
        })
      );
      const data = await resp.json();

      if (data.success && data.uploaded > 0) {
        statusMsg.textContent = data.message || 'Las fotos se subieron correctamente.';
        statusMsg.className = 'status-msg success';
        cameraInput.value = '';
        galleryInput.value = '';
        selectedFiles.forEach(revokeSelectedPreview);
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

  function fetchPage(page) {
    return backend.withBackend(async (base) => {
      const resp = await fetch(
        `${base}/api/photos?event=${encodeURIComponent(EVENT)}&page=${page}&size=${PAGE_SIZE}`
      );
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return resp.json();
    });
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
        const loader = document.createElement('div');
        loader.className = 'loader';
        loader.innerHTML = '<div class="loader-spin"></div>';
        item.appendChild(loader);

        const img = document.createElement('img');
        img.alt = photo.originalName || 'Foto';
        img.loading = 'lazy';
        img.style.cursor = 'pointer';
        img.addEventListener('load', () => {
          img.classList.add('loaded');
          loader.remove();
        }, { once: true });
        img.addEventListener('error', () => loader.remove(), { once: true });
        img.addEventListener('click', () => {
          lightboxStatus = '';
          lightboxIndex = idx;
          updateLightbox();
          lightbox.classList.add('active');
        });
        item.appendChild(img);
        img.src = resolveUrl(photo.thumbnail);
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
  function resolveFullUrl(photo) {
    if (!photo) return '';
    const full = photo.url || photo.image || photo.full || photo.original;
    if (full) return resolveUrl(full);
    return resolveUrl(photo.thumbnail);
  }

  function preloadFullImage(photo) {
    const url = resolveFullUrl(photo);
    if (url) {
      const image = new Image();
      image.src = url;
    }
  }

  function showLightboxPhoto(photo) {
    const requestId = ++lightboxImageRequest;
    const thumbnailUrl = resolveUrl(photo.thumbnail);
    const fullUrl = resolveFullUrl(photo);

    lightboxImg.alt = photo.originalName || 'Foto';
    lightboxImg.style.opacity = '1';
    lightboxImg.src = thumbnailUrl || fullUrl || '';

    if (!fullUrl || !thumbnailUrl || fullUrl === thumbnailUrl) return;

    const fullImage = new Image();
    fullImage.onload = async () => {
      if (typeof fullImage.decode === 'function') {
        try {
          await fullImage.decode();
        } catch (_) {
          // onload confirms the source is available; let the visible image decode it.
        }
      }
      if (requestId === lightboxImageRequest) {
        lightboxImg.src = fullUrl;
      }
    };
    fullImage.onerror = () => {
      if (requestId === lightboxImageRequest) {
        lightboxStatus = 'No se pudo cargar la foto en alta calidad.';
        lightboxCount.textContent = lightboxStatus;
      }
    };
    fullImage.src = fullUrl;
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

    showLightboxPhoto(photo);
    lightboxCount.textContent = lightboxStatus || (totalCount > 0
      ? `${currentPage * PAGE_SIZE + lightboxIndex + 1} / ${totalCount}`
      : '');

    lightboxPrev.disabled = lightboxLoading || (currentPage === 0 && lightboxIndex === 0);
    lightboxNext.disabled = lightboxLoading || (!hasMore && lightboxIndex === currentPhotos.length - 1);

    if (lightboxIndex + 1 < currentPhotos.length) {
      preloadFullImage(currentPhotos[lightboxIndex + 1]);
    }
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

  function closeLightbox() {
    lightboxImageRequest++;
    lightbox.classList.remove('active');
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (touchMoved) {
      touchMoved = false;
      return;
    }
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') {
      closeLightbox();
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

  // =========================================================
  // Ambient animations (leaves)
  // =========================================================
  // Runs exactly once, on load. The floral corners are deliberately NOT
  // animated: they are positioned with a CSS transform (scaleX(-1) on the
  // right one) and gsap rewrites the whole transform property, which drops
  // the mirror and leaves the corner out of place.
  let ambientStarted = false;

  function initAmbientAnimations() {
    if (ambientStarted || typeof gsap === 'undefined') return;
    ambientStarted = true;

    document.querySelectorAll('.leaf').forEach((leaf, i) => {
      gsap.to(leaf, {
        y: '+=25',
        x: '+=10',
        rotation: i % 2 === 0 ? '+=8' : '-=8',
        duration: 4 + i * 0.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      });
    });
  }

  initAmbientAnimations();
  loadGallery();
})();
