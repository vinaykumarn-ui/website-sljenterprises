const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Mobile menu toggle
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('nav');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach((link) =>
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );
}

// Shadow on the header once the page is scrolled
const header = document.querySelector('.header');
const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Current year in footer
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

if ('IntersectionObserver' in window) {
  // Fade sections in as they scroll into view
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll('.section .container > *').forEach((el) => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });

  // Count the key numbers up when they come into view
  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        countObserver.unobserve(entry.target);
        const el = entry.target;
        const target = Number(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const format = (n) => (el.dataset.plain ? String(n) : n.toLocaleString('en-IN')) + suffix;
        if (reduceMotion) return;
        const start = performance.now();
        const duration = 1400;
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          el.textContent = format(Math.round(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll('[data-count]').forEach((el) => countObserver.observe(el));

  // Highlight the menu link for the section on screen
  const links = new Map(
    [...document.querySelectorAll('.nav a[href^="#"]')].map((a) => [a.getAttribute('href').slice(1), a])
  );
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = links.get(entry.target.id);
        if (link) link.classList.toggle('is-active', entry.isIntersecting);
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  links.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) sectionObserver.observe(section);
  });
}

// Product filter tabs
const filterButtons = document.querySelectorAll('.filter button');
filterButtons.forEach((button) =>
  button.addEventListener('click', () => {
    const type = button.dataset.filter;
    filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelectorAll('.pole-card').forEach((card) => {
      card.hidden = type !== 'all' && card.dataset.type !== type;
    });
  })
);

// Gallery lightbox
const lightbox = document.getElementById('lightbox');
if (lightbox) {
  const image = lightbox.querySelector('img');
  const caption = lightbox.querySelector('figcaption');
  const items = [...document.querySelectorAll('.gallery figure')];
  let index = 0;

  const show = (i) => {
    index = (i + items.length) % items.length;
    const img = items[index].querySelector('img');
    image.src = img.currentSrc || img.src;
    image.alt = img.alt;
    caption.textContent = items[index].querySelector('figcaption').textContent;
  };
  const open = (i) => {
    show(i);
    lightbox.showModal();
  };

  items.forEach((item, i) => {
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `View photo: ${item.querySelector('figcaption').textContent}`);
    item.addEventListener('click', () => open(i));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(i);
      }
    });
  });
  lightbox.querySelector('[data-prev]').addEventListener('click', () => show(index - 1));
  lightbox.querySelector('[data-next]').addEventListener('click', () => show(index + 1));
  lightbox.querySelector('[data-close]').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.close();
  });
  lightbox.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
}

// Enquiry form: sends to /api/enquiry on our server. If the server cannot be
// reached it falls back to opening the visitor's email app, pre-filled.
const form = document.getElementById('enquiry-form');
if (form) {
  const started = Date.now();
  const status = form.querySelector('.form__status');
  const button = form.querySelector('button[type="submit"]');

  const showStatus = (text, kind) => {
    status.textContent = text;
    status.dataset.kind = kind;
    status.hidden = false;
  };

  const openMailApp = (data) => {
    const lines = [
      `Name: ${data.name}`,
      `Phone: ${data.phone}`,
      `Email: ${data.email || '-'}`,
      `Company / Location: ${data.company || '-'}`,
      `Product: ${data.product}`,
      `Quantity: ${data.quantity || '-'}`,
      '',
      data.message || '',
    ];
    const subject = `Enquiry: ${data.product} - ${data.name}`;
    window.location.href =
      `mailto:info@sljenterprises.com?cc=prashanths123@gmail.com` +
      `&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    showStatus('Your email app should now open with the enquiry filled in. Please press send there. If nothing opened, call us on 99020 60783.', 'info');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    data.started = started;

    button.disabled = true;
    button.textContent = 'Sending…';
    status.hidden = true;
    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        form.reset();
        showStatus('Thank you! Your enquiry has been sent. We will get back to you soon.', 'success');
      } else if (res.status === 422 || res.status === 429) {
        showStatus(body.error || 'Please check the form and try again.', 'error');
      } else {
        openMailApp(data);
      }
    } catch {
      openMailApp(data);
    } finally {
      button.disabled = false;
      button.textContent = 'Send enquiry';
    }
  });
}
