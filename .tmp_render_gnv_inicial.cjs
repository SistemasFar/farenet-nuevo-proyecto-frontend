const { chromium } = require('playwright');
const path = require('path');

const sourceDir = 'C:\\Users\\Sistemas2\\Desktop\\farenet nuevo proyecto\\farenetBackend\\.tmp_gnv_inicial_reference';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const name of ['gnv-inicial-final', 'gnv-inicial-preview', 'gnv-inicial-long']) {
      const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
      await page.goto(`file:///${path.join(sourceDir, `${name}.html`).replace(/\\/g, '/')}`, { waitUntil: 'load' });
      await page.emulateMedia({ media: 'print' });
      await page.pdf({
        path: path.join(sourceDir, `${name}.pdf`),
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });
      const metrics = await page.evaluate(() => ({
        bodyScrollHeight: document.body.scrollHeight,
        bodyScrollWidth: document.body.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        pageWidth: document.querySelector('.documento-certificado')?.getBoundingClientRect().width,
        pageHeight: document.querySelector('.documento-certificado')?.getBoundingClientRect().height,
        positions: Object.fromEntries([
          ['header', '.header-sub'],
          ['title', '.title'],
          ['certNum', '.cert-num'],
          ['company', '.company-name'],
          ['certifica', '.certifica-hdr'],
          ['intro', '.intro-certificacion'],
          ['vehicleTable', 'table.data-table'],
          ['componentIntro', '.componentes-intro'],
          ['componentTable', '.comp-table'],
          ['conversionIntro', '.conversion-intro'],
          ['conversionTable', '.conversion-table'],
          ['certification', '.certificacion-final'],
          ['observationsTitle', '.observaciones-titulo'],
          ['observations', '.obs-sec'],
          ['observationFirst', '.obs-paragraph'],
          ['observationSecond', '.obs-paragraph + .obs-paragraph'],
          ['footer', '.footer-date']
        ].map(([key, selector]) => {
          const rect = document.querySelector(selector)?.getBoundingClientRect();
          return [key, rect ? { top: rect.top, bottom: rect.bottom, height: rect.height } : null];
        }))
      }));
      console.log(name, JSON.stringify(metrics));
      await page.close();
    }

    const previewPage = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
    await previewPage.goto(`file:///${path.join(sourceDir, 'gnv-inicial-preview.html').replace(/\\/g, '/')}`, { waitUntil: 'load' });
    const screenMetrics = await previewPage.evaluate(() => {
      const pageRect = document.querySelector('.documento-certificado')?.getBoundingClientRect();
      return {
        viewportWidth: window.innerWidth,
        left: pageRect?.left,
        right: pageRect?.right,
        width: pageRect?.width,
        centerDelta: pageRect ? ((pageRect.left + pageRect.right) / 2) - (window.innerWidth / 2) : null
      };
    });
    console.log('preview-screen', JSON.stringify(screenMetrics));
    await previewPage.screenshot({ path: path.join(sourceDir, 'gnv-inicial-preview-screen.png'), fullPage: true });
    await previewPage.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
