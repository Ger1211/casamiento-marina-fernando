/**
 * Marina & Fernando - Wedding Invitations
 * Shared JS for both index.html (Civil y Conferencia) and reunion.html (Reunión Íntima)
 */

(function () {
  'use strict';

  // =========================================================
  // 1. URL parameter: ?invitados=Nombre
  // =========================================================
  function getGuestName() {
    const params = new URLSearchParams(window.location.search);
    let val = params.get('invitados');
    if (val && val.trim()) return decodeURIComponent(val).trim();

    const match = window.location.href.match(/[?&]invitados=([^&#]*)/);
    if (match && match[1]) return decodeURIComponent(match[1]).trim();
    return '';
  }

  const guestName = getGuestName();

  if (guestName) {
    const defaultEl = document.getElementById('welcome-default');
    const guestEl = document.getElementById('welcome-guest');
    const guestNameEl = document.getElementById('welcome-guest-name');
    const rsvpName = document.getElementById('r-name');

    if (defaultEl) defaultEl.style.display = 'none';
    if (guestEl) guestEl.style.display = 'block';
    if (guestNameEl) guestNameEl.textContent = guestName;
    if (rsvpName) rsvpName.value = guestName;
  }

  // =========================================================
  // 2. Welcome overlay
  // =========================================================
  const welcome = document.getElementById('welcome');
  const welcomeBtn = document.getElementById('welcome-btn');

  function hideWelcome() {
    if (!welcome) return;
    welcome.classList.add('hidden');
    setTimeout(() => {
      welcome.style.display = 'none';
    }, 950);

    const hero = document.querySelector('.hero');
    if (hero) {
      hero.scrollIntoView({ behavior: 'smooth' });
    }
  }

  if (welcome) {
    welcome.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    welcome.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  }

  if (welcomeBtn) {
    welcomeBtn.addEventListener('click', hideWelcome);
  }

  // =========================================================
  // 3. Countdown
  // =========================================================
  const countdownTarget = document.documentElement.dataset.date;
  const weddingDate = countdownTarget ? new Date(countdownTarget).getTime() : null;

  function updateCountdown() {
    if (!weddingDate) return;

    const now = Date.now();
    const diff = Math.max(0, weddingDate - now);

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    const elDays = document.getElementById('cd-days');
    const elHours = document.getElementById('cd-hours');
    const elMin = document.getElementById('cd-min');
    const elSec = document.getElementById('cd-sec');
    const elLabel = document.getElementById('countdown-label');

    if (elDays) elDays.textContent = String(days).padStart(2, '0');
    if (elHours) elHours.textContent = String(hours).padStart(2, '0');
    if (elMin) elMin.textContent = String(minutes).padStart(2, '0');
    if (elSec) elSec.textContent = String(seconds).padStart(2, '0');

    if (elLabel) {
      elLabel.textContent = `Faltan ${days} días y ${hours} horas`;
    }
  }

  if (weddingDate) {
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  // =========================================================
  // 4. Calendar button
  // =========================================================
  const calendarBtn = document.getElementById('btn-calendar');
  if (calendarBtn) {
    const calTitle = encodeURIComponent(calendarBtn.dataset.title || 'Casamiento Marina & Fernando');
    const calLoc = encodeURIComponent(calendarBtn.dataset.location || '');
    const calDetails = encodeURIComponent(calendarBtn.dataset.details || '');
    const calStart = calendarBtn.dataset.start || '';
    const calEnd = calendarBtn.dataset.end || '';

    calendarBtn.addEventListener('click', () => {
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&dates=${calStart}/${calEnd}&details=${calDetails}&location=${calLoc}`;
      window.open(url, '_blank');
    });
  }

  // =========================================================
  // 5. RSVP form
  // =========================================================
  const form = document.getElementById('rsvp-form');
  const optYes = document.getElementById('opt-yes');
  const optNo = document.getElementById('opt-no');
  const guestsField = document.getElementById('guests-field');
  const restrictionsField = document.getElementById('restrictions-field');
  const submitBtn = document.getElementById('submit-btn');
  const formError = document.getElementById('form-error');

  function setActiveRadio(el) {
    if (optYes) optYes.classList.remove('active');
    if (optNo) optNo.classList.remove('active');
    if (el) el.classList.add('active');
  }

  if (optYes) {
    optYes.addEventListener('click', () => {
      optYes.querySelector('input').checked = true;
      setActiveRadio(optYes);
      if (guestsField) guestsField.style.display = 'block';
      if (restrictionsField) restrictionsField.style.display = 'block';
    });
  }

  if (optNo) {
    optNo.addEventListener('click', () => {
      optNo.querySelector('input').checked = true;
      setActiveRadio(optNo);
      if (guestsField) guestsField.style.display = 'none';
      if (restrictionsField) restrictionsField.style.display = 'none';
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (formError) formError.style.display = 'none';

      const name = document.getElementById('r-name').value.trim();
      const attendEl = document.querySelector('input[name="attend"]:checked');
      if (!name || !attendEl) return;

      const attend = attendEl.value;
      const guests = attend === 'si' ? (document.getElementById('r-guests').value || 1) : 0;
      const restrictionsEl = document.getElementById('r-restrictions');
      const restrictions = restrictionsEl ? restrictionsEl.value.trim() : '';
      const message = document.getElementById('r-msg').value.trim();

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
      }

      const entry = {
        name,
        attend: attend === 'si' ? 'Sí, ahí voy a estar' : 'No voy a poder',
        guests: String(guests),
        restrictions,
        message
      };

      // IDs from the HTML data attributes
      const formId = form.dataset.formId;
      const entryName = form.dataset.entryName;
      const entryAttend = form.dataset.entryAttend;
      const entryGuests = form.dataset.entryGuests;
      const entryRestrictions = form.dataset.entryRestrictions;
      const entryMessage = form.dataset.entryMessage;

      let saved = false;

      if (formId && entryName && entryAttend) {
        const formData = new URLSearchParams();
        formData.append(entryName, entry.name);
        formData.append(entryAttend, entry.attend);
        if (entryGuests) formData.append(entryGuests, entry.guests);
        if (entryRestrictions) formData.append(entryRestrictions, entry.restrictions);
        if (entryMessage) formData.append(entryMessage, entry.message);

        const urls = [
          `https://docs.google.com/forms/u/0/d/e/${formId}/formResponse`,
          `https://docs.google.com/forms/d/e/${formId}/formResponse`,
          `https://docs.google.com/forms/d/${formId}/formResponse`
        ];

        for (const url of urls) {
          try {
            await fetch(url, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: formData.toString()
            });
            saved = true;
            break;
          } catch (err) {
            console.log('Error enviando a', url, err);
          }
        }
      } else {
        // Demo mode: no Google Form configured yet
        saved = true;
        console.log('RSVP demo mode:', entry);
      }

      // Backup in localStorage
      try {
        const key = 'rsvp:' + Date.now() + '_' + name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
        localStorage.setItem(key, JSON.stringify(entry));
      } catch (err) {
        // ignore
      }

      if (saved) {
        form.style.display = 'none';
        const thanks = document.getElementById('rsvp-thanks');
        const thanksText = document.getElementById('thanks-text');
        if (thanks) thanks.style.display = 'block';
        if (thanksText) {
          thanksText.textContent = attend === 'si'
            ? '¡Ya te anotamos! Nos vemos el 5 de diciembre.'
            : 'Gracias por avisarnos, vamos a extrañarte ese día.';
        }
      } else {
        if (formError) formError.style.display = 'block';
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirmar asistencia';
      }
    });
  }

  // =========================================================
  // 6. Copy alias to clipboard
  // =========================================================
  document.querySelectorAll('.alias-copy').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const aliasEl = btn.parentElement.querySelector('.alias-value');
      if (!aliasEl) return;
      const alias = aliasEl.textContent.trim();
      try {
        await navigator.clipboard.writeText(alias);
        const original = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span class="copy-label">Copiado</span>';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = original;
        }, 2000);
      } catch (err) {
        console.log('No se pudo copiar el alias', err);
      }
    });
  });

  // =========================================================
  // 7. Map iframe fade-in
  // =========================================================
  document.querySelectorAll('.map-wrap iframe').forEach((iframe) => {
    const showMap = () => iframe.classList.add('is-loaded');
    iframe.addEventListener('load', showMap);
    // Fallback: mostrar el mapa igual si el evento load ya pasó o tarda
    setTimeout(showMap, 1200);
  });

  // =========================================================
  // 8. GSAP animations
  // =========================================================
  function initAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('GSAP no cargado');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Floating leaves (ambient)
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

    // Floral corners gentle sway (preserve the horizontal flip on the right corner)
    document.querySelectorAll('.floral-corner').forEach((corner, i) => {
      const isRight = i % 2 !== 0;
      gsap.to(corner, {
        rotation: isRight ? '-=3' : '+=3',
        duration: 5 + i,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        transformOrigin: isRight ? 'top left' : 'top right'
      });
    });

    // Eucalyptus subtle float
    document.querySelectorAll('.eucalyptus').forEach((plant, i) => {
      gsap.to(plant, {
        y: '+=15',
        rotation: i % 2 === 0 ? '+=4' : '-=4',
        duration: 6 + i,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      });
    });

    // Scroll reveals
    gsap.utils.toArray('.reveal').forEach((el) => {
      gsap.from(el, {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 82%',
          once: true
        }
      });
    });

    // Itinerary items stagger
    gsap.utils.toArray('.itinerary-item').forEach((item, i) => {
      gsap.from(item, {
        x: -20,
        opacity: 0,
        duration: 0.7,
        delay: i * 0.12,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: item,
          start: 'top 85%',
          once: true
        }
      });
    });

    // Cards
    gsap.utils.toArray('.card').forEach((card) => {
      gsap.from(card, {
        y: 30,
        opacity: 0,
        duration: 0.9,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          once: true
        }
      });
    });
  }

  // Wait for GSAP to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimations);
  } else {
    initAnimations();
  }
})();
