import { chromium } from 'playwright';

const OUT = process.argv[2];

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2000);

  // Freeze the hero on several frames so we can judge the worst (brightest) one.
  for (const t of [1.2, 5.0, 9.0, 13.0]) {
    await page.evaluate((time) => {
      const v = document.querySelector('.hero-video') as HTMLVideoElement | null;
      if (v) {
        v.pause();
        v.currentTime = time;
      }
    }, t);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/scrim_${String(t).replace('.', '_')}.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  }
  console.log('captured 4 hero frames');
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
