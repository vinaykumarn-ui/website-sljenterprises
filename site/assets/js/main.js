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

// Enquiry form: opens the visitor's email app with the details filled in
const form = document.getElementById('enquiry-form');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const lines = [
      `Name: ${data.get('name')}`,
      `Phone: ${data.get('phone')}`,
      `Company / Location: ${data.get('company') || '-'}`,
      `Product: ${data.get('product')}`,
      `Quantity: ${data.get('quantity') || '-'}`,
      '',
      data.get('message') || '',
    ];
    const subject = `Enquiry: ${data.get('product')} - ${data.get('name')}`;
    window.location.href =
      `mailto:info@sljenterprises.com?cc=prashanths123@gmail.com` +
      `&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    form.querySelector('.form__note').hidden = false;
  });
}
