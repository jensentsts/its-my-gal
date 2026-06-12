/* ============================
   幻象物语：阿瓦隆之觉醒 — 交互逻辑
   ============================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // ======== NAVBAR SCROLL ========
  const navbar = document.getElementById('navbar');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    navbar.classList.toggle('scrolled', y > 60);
    lastScroll = y;
  }, { passive: true });

  // ======== MOBILE NAV TOGGLE ========
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('open');
  });

  // Close nav on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });

  // ======== SCROLL REVEAL ========
  const revealEls = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Optional: unobserve after reveal for performance
        // revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px',
  });

  revealEls.forEach(el => revealObserver.observe(el));

  // ======== HERO PARTICLES ========
  const container = document.getElementById('heroParticles');
  if (container) {
    const count = Math.min(60, Math.floor(window.innerWidth / 20));

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = 1.5 + Math.random() * 2.5;
      const x = Math.random() * 100;
      const delay = Math.random() * 20;
      const dur = 12 + Math.random() * 18;
      const drift = (Math.random() - 0.5) * 60;

      p.style.cssText = `
        width: ${size}px; height: ${size}px;
        left: ${x}%;
        bottom: -10px;
        animation-duration: ${dur}s;
        animation-delay: ${delay}s;
        opacity: ${0.2 + Math.random() * 0.4};
        --drift: ${drift}px;
      `;

      // Add horizontal drift via custom property
      container.appendChild(p);
    }
  }

  // ======== PARALLAX ON MOUSE MOVE (desktop only) ========
  const hero = document.getElementById('hero');
  const heroBg = document.getElementById('heroBg');

  if (window.innerWidth > 768) {
    hero.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      heroBg.style.transform = `translate(${x * -15}px, ${y * -10}px)`;
    });
  }

  // ======== GALLERY LIGHTBOX (optional enhancement) ========
  const galleryItems = document.querySelectorAll('.gallery-item');
  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      const bg = item.style.backgroundImage;
      if (!bg) return;
      const url = bg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');

      const overlay = document.createElement('div');
      overlay.className = 'lightbox';
      overlay.innerHTML = `
        <div class="lightbox-bg" style="background-image: url('${url}')"></div>
        <button class="lightbox-close">&times;</button>
      `;

      Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '9999',
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        opacity: '0',
        transition: 'opacity 0.3s ease',
      });

      const bgEl = overlay.querySelector('.lightbox-bg');
      Object.assign(bgEl.style, {
        maxWidth: '90vw',
        maxHeight: '90vh',
        width: 'auto',
        height: 'auto',
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        aspectRatio: 'auto',
        minHeight: '200px',
        minWidth: '300px',
      });

      const close = overlay.querySelector('.lightbox-close');
      Object.assign(close.style, {
        position: 'absolute',
        top: '24px',
        right: '32px',
        background: 'none',
        border: 'none',
        color: '#fff',
        fontSize: '2.5rem',
        cursor: 'pointer',
        padding: '8px',
        lineHeight: '1',
        opacity: '0.6',
        transition: 'opacity 0.3s',
      });

      close.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLightbox();
      });

      overlay.addEventListener('click', closeLightbox);

      function closeLightbox() {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
      }

      document.body.appendChild(overlay);
      // Trigger reflow for transition
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
      });
    });
  });

  // ======== SMOOTH SCROLL FOR ANCHOR LINKS ========
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // ======== CHARACTER CARD INTERACTION ========
  // Subtle tilt effect on character cards
  const charCards = document.querySelectorAll('.char-card');
  if (window.innerWidth > 768) {
    charCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `
          perspective(1000px)
          rotateY(${x * 4}deg)
          rotateX(${y * -4}deg)
          translateY(-8px)
        `;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateY(0) rotateX(0) translateY(0)';
      });
    });
  }

  // ======== ROUTE NODE HOVER GLOW ========
  document.querySelectorAll('.route-node').forEach(node => {
    node.addEventListener('mouseenter', () => {
      const siblings = node.closest('.route-group').querySelectorAll('.route-node');
      siblings.forEach(s => s.style.opacity = '0.7');
      node.style.opacity = '1';
    });
    node.addEventListener('mouseleave', () => {
      const siblings = node.closest('.route-group').querySelectorAll('.route-node');
      siblings.forEach(s => s.style.opacity = '1');
    });
  });

  // ======== COUNTER: total endings display ========
  // Add a small stat bar after the hero
  const statsBar = document.createElement('div');
  statsBar.className = 'hero-stats';
  statsBar.innerHTML = `
    <div class="stat-item">
      <span class="stat-num">19</span>
      <span class="stat-label">章节</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <span class="stat-num">8</span>
      <span class="stat-label">结局</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <span class="stat-num">3</span>
      <span class="stat-label">主角</span>
    </div>
  `;

  Object.assign(statsBar.style, {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '28px',
    marginTop: '32px',
    opacity: '0',
    animation: 'fadeInDown 1s ease 1s forwards',
  });

  document.querySelector('.hero-content').appendChild(statsBar);

  // Inject stat-item styles
  const statStyle = document.createElement('style');
  statStyle.textContent = `
    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .stat-num {
      font-family: 'Noto Serif SC', serif;
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--clr-accent);
      line-height: 1;
    }
    .stat-label {
      font-size: 0.7rem;
      color: var(--clr-text-muted);
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .stat-divider {
      width: 1px;
      height: 32px;
      background: rgba(255,255,255,0.08);
    }
    .lightbox-bg {
      width: 100%;
      height: 100%;
      background-size: contain !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
    }
  `;
  document.head.appendChild(statStyle);

});
