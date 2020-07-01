const { webperfscore } = require('webperfscore');
const {
  extractDataFromPerformanceMetrics,
} = require('./helper');
const puppeteer = require('puppeteer');
const speedline = require('speedline-core');
const NETWORK_PRESETS = require('./network');
const iphone = puppeteer.devices['iPhone 8'];
const android = puppeteer.devices['Nexus 10'];

module.exports = async ({
  url = '',
  network = NETWORK_PRESETS.WiFi,
  platform = 'ios',
  timeout = 10000,
} = {}) => {
  const browser = await puppeteer.launch({
    headless: true,
    // headless: false,
    // devtools: true,
    // defaultViewport: {
    //   isMobile: true,
    //   deviceScaleFactor: 2,
    //   width: 375,
    //   height: 667,
    // }
  });
  const page = await browser.newPage();
  await page.emulate(platform === 'ios' ? iphone : android);
  const client = await page.target().createCDPSession();

  page.setDefaultTimeout(timeout);
  // await page.setCacheEnabled(false);

  // Set throttling property
  await client.send('Network.emulateNetworkConditions', network);
  await client.send('Performance.enable');
  const performances = [];

  try {
    performances.push(await doTest(page, client, url));
    performances.push(await doTest(page, client, url));
    await browser.close();
  } catch (error) {
    await browser.close();
    throw error;
  }

  return performances;
};

async function doTest(page, client, url) {
  await page.tracing.start({ path: 'trace.json', screenshots: true });

  await page.goto(url, {
    // waitUntil: 'networkidle0',
    // waitUntil: 'networkidle2',
  });

  await page.tracing.stop();

  const performance = await page.evaluate(() => {
    const performance = window.performance;
    const timing = performance.timing;
    const firstPaint = performance.getEntriesByName('first-paint')[0];
    const firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0];
    const navigation = performance.getEntriesByType('navigation')[performance.getEntriesByType('navigation').length - 1];

    return {
      timeOrigin: performance.timeOrigin,
      transferSize: navigation.transferSize,
      domCount: document.getElementsByTagName("*").length,

      responseStart: timing.responseStart,
      responseEnd: timing.responseEnd,

      redirectCount: performance.navigation.redirectCount,
      redirectTime: timing.redirectEnd - timing.redirectStart,

      connectStart: timing.connectStart,
      connectEnd: timing.connectEnd,

      domComplete: timing.domComplete,
      domLoading: timing.domLoading,

      loadEventEnd: timing.loadEventEnd,
      domContentLoadedEventEnd: timing.domContentLoadedEventEnd,

      firstPaint: firstPaint.startTime,
      firstContentfulPaint: firstContentfulPaint.startTime,

      // 后期计算
      firstMeaningfulPaint: undefined,
      speedIndex: undefined,
    };
  });

  // FirstMeaningfulPaint
  await page.waitFor(1000);
  const performanceMetrics = await client.send('Performance.getMetrics');
  const {
    FirstMeaningfulPaint,
  } = extractDataFromPerformanceMetrics(
    performanceMetrics,
    'FirstMeaningfulPaint'
  );
  performance.firstMeaningfulPaint = FirstMeaningfulPaint;

  // speedIndex
  const trace = await speedline('trace.json', {
    timeOrigin: performance.timeOrigin,
  });
  performance.speedIndex = trace.speedIndex;

  // score
  const result = webperfscore({
    'first-contentful-paint': performance.firstContentfulPaint,
    'first-meaningful-paint': performance.firstMeaningfulPaint,
    'speed-index': performance.speedIndex,
    'fully-loaded': performance.domComplete - performance.timeOrigin,
  });
   
  performance.score = result.score; // 分值

  // await page.screenshot({ path: 'example.png' });
  return performance;
}