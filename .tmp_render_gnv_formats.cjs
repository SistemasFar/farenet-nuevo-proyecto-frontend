const { chromium } = require('playwright');
const path = require('path');

const backendRoot = 'C:\\Users\\Sistemas2\\Desktop\\farenet nuevo proyecto\\farenetBackend';
const jobs = [
  { dir: '.tmp_gnv_inicial_reference', name: 'gnv-inicial-final' },
  { dir: '.tmp_gnv_inicial_reference', name: 'gnv-inicial-preview' },
  { dir: '.tmp_gnv_inicial_reference', name: 'gnv-inicial-long' },
  { dir: '.tmp_gnv_anual_reference', name: 'gnv-anual-final' },
  { dir: '.tmp_gnv_anual_reference', name: 'gnv-anual-preview' },
  { dir: '.tmp_gnv_anual_reference', name: 'gnv-anual-long' }
];

const selectors = {
  header: '.header-sub',
  title: '.title',
  certNum: '.cert-num',
  company: '.company-name',
  certifica: '.certifica-hdr',
  intro: '.certifica-p',
  vehicleTable: 'table.data-table',
  verificationTitle: '.verif-title',
  verificationList: '.verif-list',
  conclusion: '.conclusion',
  observations: '.obs-sec',
  footer: '.footer-date'
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const job of jobs) {
      const sourceDir = path.join(backendRoot, job.dir);
      const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
      const url = `file:///${path.join(sourceDir, `${job.name}.html`).replace(/\\/g, '/')}`;
      await page.goto(url, { waitUntil: 'load' });
      await page.emulateMedia({ media: 'print' });
      await page.pdf({
        path: path.join(sourceDir, `${job.name}.pdf`),
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });
      const metrics = await page.evaluate((selectorMap) => {
        const positions = {};
        for (const [key, selector] of Object.entries(selectorMap)) {
          const rect = document.querySelector(selector)?.getBoundingClientRect();
          positions[key] = rect ? { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
        }
        const pageRect = document.querySelector('.documento-certificado')?.getBoundingClientRect();
        return {
          bodyScrollHeight: document.body.scrollHeight,
          bodyScrollWidth: document.body.scrollWidth,
          documentHeight: document.documentElement.scrollHeight,
          pageRect: pageRect ? { top: pageRect.top, left: pageRect.left, right: pageRect.right, bottom: pageRect.bottom, width: pageRect.width, height: pageRect.height } : null,
          positions
        };
      }, selectors);
      console.log(job.name, JSON.stringify(metrics));
      await page.close();
    }

    for (const job of jobs.filter((item) => item.name.endsWith('-preview'))) {
      const sourceDir = path.join(backendRoot, job.dir);
      const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
      await page.goto(`file:///${path.join(sourceDir, `${job.name}.html`).replace(/\\/g, '/')}`, { waitUntil: 'load' });
      const screen = await page.evaluate(() => {
        const rect = document.querySelector('.documento-certificado')?.getBoundingClientRect();
        return { viewportWidth: window.innerWidth, left: rect?.left, right: rect?.right, centerDelta: rect ? ((rect.left + rect.right) / 2) - window.innerWidth / 2 : null };
      });
      console.log(`${job.name}-screen`, JSON.stringify(screen));
      await page.screenshot({ path: path.join(sourceDir, `${job.name}-screen.png`), fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
