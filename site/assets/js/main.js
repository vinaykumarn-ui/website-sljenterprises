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

// Document viewer: pole drawings, Bureau Veritas test report, CESC approval.
// Test figures are from the Bureau Veritas test sheets (ref. IND.B.7.25.306DT);
// `page` is the page of that PDF with the pole's test sheet.
const BV_REPORT = 'docs/bureau-veritas-test-report.pdf';
const POLES = {
  'pscc-8-200': { name: 'PSCC pole', size: '8 m · 200 kg', drawing: 'drawing-pscc-8m-200kg', page: 11, sr: '200004',
    test: ['500 kg (2.5 × working load)', '350 kg', '400 kg', '53.1 cm', '4.3 cm'] },
  'pscc-9-200': { name: 'PSCC pole', size: '9 m · 200 kg', drawing: 'drawing-pscc-9m-200kg', page: 13, sr: '200006',
    test: ['500 kg (2.5 × working load)', '350 kg', '400 kg', '58.7 cm', '4.8 cm'] },
  'pscc-9-300': { name: 'PSCC pole', size: '9 m · 300 kg', drawing: 'drawing-pscc-9m-300kg', page: 15, sr: '200005',
    test: ['600 kg (2.0 × working load)', '360 kg', '420 kg', '48.7 cm', '4.6 cm'] },
  'pscc-11-365': { name: 'PSCC pole', size: '11 m · 365 kg', drawing: 'drawing-pscc-11m-365kg', page: 19, sr: '200010',
    test: ['913 kg (2.5 × working load)', '547 kg', '639 kg', '54.8 cm', '4.8 cm'] },
  'rcc-8-115': { name: 'RCC pole', size: '8 m · 115 kg', drawing: 'drawing-rcc-8m-115kg', page: 7, sr: '200103',
    test: ['288 kg (2.5 × working load)', '173 kg', '201 kg', '49.4 cm', '4.5 cm'] },
  'rcc-9-145': { name: 'RCC pole', size: '9 m · 145 kg', drawing: 'drawing-rcc-9m-145kg', page: 9, sr: '200105',
    test: ['363 kg (2.5 × working load)', '254 kg', '290 kg', '52.9 cm', '4.8 cm'] },
  'spun-11-500': { name: 'PSCC spun pole', size: '11 m · 500 kg', drawing: 'drawing-spun-11m-500kg', page: 17, sr: '200120',
    test: ['1000 kg (2.0 × working load)', '600 kg', '700 kg', '48.7 cm', '4.7 cm'] },
};
const DOCS = {
  bv: { kicker: 'Test report', title: 'Bureau Veritas transverse strength test', file: BV_REPORT, preview: 'bureau-veritas-test-report',
    info: [['Tested by', 'Bureau Veritas (India) Pvt. Ltd.'], ['Date of test', '22.04.2025'], ['Reference', 'IND.B.7.25.306DT'],
      ['Poles', 'RCC 8 m, 9 m · PSCC 8 m, 9 m, 11 m · PSC spun 11 m'], ['Standards', 'IS 785, IS 1678, IS 2905'],
      ['Result', 'Performed satisfactorily; conforms to BESCOM, GESCOM, MESCOM, CESC, HESCOM and KPTCL specifications']] },
  bescom: { kicker: 'Vendor approval', title: 'BESCOM vendor approval', file: 'docs/bescom-vendor-approval-2026.pdf', preview: 'bescom-vendor-approval-2026',
    info: [['Issued by', 'Bangalore Electricity Supply Company Ltd. (Quality Standard &amp; Safety)'], ['Date', '18.07.2026'],
      ['Valid up to', '24.04.2030, subject to revalidation once in 2 years'], ['Approved', 'All 7 pole types'],
      ['For', 'Electrification in the BESCOM area, including self-execution, turnkey and action plan works and purchase orders']] },
  zed: { kicker: 'Certificate', title: 'MSME ZED Bronze certificate', file: 'docs/zed-certificate-bronze.pdf', preview: 'zed-certificate-bronze',
    info: [['Issued by', 'Ministry of Micro, Small &amp; Medium Enterprises'], ['Scheme', 'MSME Sustainable (ZED) Certification Scheme'],
      ['Level', 'ZED Bronze'], ['Unit', 'Dabaspet, Nelamangala Taluk'], ['Issued on', '15.11.2026'],
      ['Validity', 'Three years from the date of issue'], ['Certificate No.', '15112026_1083984']] },
  cesc: { kicker: 'Vendor approval', title: 'CESC Mysore vendor approval', file: 'docs/cesc-vendor-approval-2026.pdf', preview: 'cesc-vendor-approval-2026',
    info: [['Issued by', 'Chamundeshwari Electricity Supply Corporation Ltd., Mysuru'], ['Date', '27.03.2026'],
      ['Valid up to', 'March 2028'], ['Approved', 'All 7 pole types'],
      ['For', 'Electrification of layouts, turnkey projects, buildings and HT installations in the CESC area']] },
};

const docview = document.getElementById('docview');
if (docview) {
  // Phones and browsers without a built-in PDF viewer get a preview image that opens the PDF instead
  const inlinePdf = navigator.pdfViewerEnabled !== false && !window.matchMedia('(max-width: 860px)').matches;
  const frame = docview.querySelector('iframe');
  const preview = docview.querySelector('.docview__preview');
  const tabs = docview.querySelector('.docview__tabs');
  const info = docview.querySelector('.docview__info');
  const openLink = docview.querySelector('[data-open]');
  const downloadLink = docview.querySelector('[data-download]');
  let current = null;

  const infoList = (rows) =>
    '<dl>' + rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('') + '</dl>';

  const showFile = (file, page, previewName) => {
    const url = page ? `${file}#page=${page}` : file;
    openLink.href = url;
    downloadLink.href = file;
    preview.href = url;
    preview.querySelector('img').src = `assets/img/docs/${previewName}.jpg`;
    frame.hidden = !inlinePdf;
    preview.hidden = inlinePdf;
    if (inlinePdf) frame.src = url;
  };

  const showPoleTab = (tab) => {
    const pole = POLES[current];
    tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    if (tab === 'report') showFile(BV_REPORT, pole.page, 'bureau-veritas-test-report');
    else showFile(`docs/${pole.drawing}.pdf`, null, pole.drawing);
  };

  const open = (id, tab) => {
    current = id;
    const pole = POLES[id];
    if (pole) {
      docview.querySelector('.docview__kicker').textContent = pole.name;
      docview.querySelector('h3').textContent = `${pole.name} ${pole.size}`;
      tabs.hidden = false;
      const [load, noCrack, firstCrack, deflection, residual] = pole.test;
      info.innerHTML =
        '<h4>Bureau Veritas test, 22.04.2025</h4>' +
        infoList([['Test load', load], ['No cracks up to', noCrack], ['First crack at', firstCrack],
          ['Deflection at test load', deflection], ['Residual deflection', `${residual}, all cracks closed`]]) +
        '<h4>Approvals</h4>' +
        infoList([['BESCOM', 'Approved vendor, valid to 24.04.2030'], ['CESC', `Approved vendor, valid to March 2028 (SR ${pole.sr})`]]) +
        '<a class="btn btn--small btn--amber" href="#contact" data-close>Enquire about this pole</a>';
      showPoleTab(tab || 'drawing');
    } else {
      const doc = DOCS[id];
      docview.querySelector('.docview__kicker').textContent = doc.kicker;
      docview.querySelector('h3').textContent = doc.title;
      tabs.hidden = true;
      info.innerHTML = infoList(doc.info);
      showFile(doc.file, null, doc.preview);
    }
    if (!docview.open) docview.showModal();
  };

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-doc]');
    if (trigger && !trigger.closest('#docview')) open(trigger.dataset.doc, trigger.dataset.tab);
  });
  // Pole cards act as buttons
  document.querySelectorAll('.pole-card[data-doc]').forEach((card) => {
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `View drawing and test results: ${POLES[card.dataset.doc].name} ${POLES[card.dataset.doc].size}`);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(card.dataset.doc);
      }
    });
  });
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) showPoleTab(b.dataset.tab);
  });
  docview.addEventListener('click', (e) => {
    if (e.target === docview || e.target.closest('[data-close]')) docview.close();
  });
  docview.addEventListener('close', () => {
    frame.removeAttribute('src');
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
