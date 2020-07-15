const { webperfscore, defaultAudits } = require('webperfscore');
const {
  extractDataFromPerformanceMetrics,
} = require('./helper');
const puppeteer = require('puppeteer');
const speedline = require('speedline-core');
const NETWORK_PRESETS = require('./network');
const testing = require('./testing');
const iphone = puppeteer.devices['iPhone 8'];
const android = puppeteer.devices['Nexus 10'];

module.exports = async ({
  url = '',
  network = NETWORK_PRESETS.WiFi,
  platform = 'ios',
  timeout = 30000,
} = {}) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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

  await page.setDefaultTimeout(timeout);

  // 删除userAgent 防止出现唤起app调用，非必填
  await page.setUserAgent('');
  // await page.setCacheEnabled(false);

  // Set throttling property
  await client.send('Network.emulateNetworkConditions', network);
  await client.send('Performance.enable');
  const performances = [];

  // 重定向时间计算
  let redirectStartTime = 0;
  let redirectCount = 0;
  let redirectTime = 0;
  // let maxRedirectCount = 0;
  // let maxRedirectTime = 0;

  const requests = [];

  // 请求拦截
  await page.setRequestInterception(true);
  page.on('request', request => {
    // console.log('GOT NEW REQUEST', request.url());
    requests.push(request.url());

    redirectStartTime = + new Date();
    request.continue();
  });
  page.on('requestfailed', (request, response) => {
    let failureText = request.failure().errorText;
    // console.log('GOT NEW FAIL', failureText, request.url(), request.response() ? request.response().status() : 200);
    requests.push(failureText);
  });
  page.on('response', response => {
    // console.log('GOT NEW RESPONSE', response.status());
    requests.push(response.status());

    if (response.status() === 302) {
      redirectTime += (+new Date()) - redirectStartTime;
      redirectCount++;
    }
  });
  const setDirect = () => {
    performances[performances.length - 1].redirectTime = redirectTime;
    performances[performances.length - 1].redirectCount = redirectCount;
    redirectStartTime = 0;
    redirectTime = 0;
    redirectCount = 0;
  }

  try {
    for (let i = 0; i < 2; i++) {
      performances.push(await doTest(page, client, url));
      setDirect();
    }

    testing.log(requests.join('<br />'));

    // // 为了拿到弱网的302跳转
    // await client.send('Network.emulateNetworkConditions', NETWORK_PRESETS.GPRS);
    // await page.setCacheEnabled(false);
    // for (let i = 0; i < 4; i++) {
    //   performances.push(await doTest(page, client, url));
    //   setDirect();
    // }
    // performances.forEach((performance) => {
    //   performance.redirectCount += maxRedirectCount;
    //   performance.redirectTime += maxRedirectTime;
    // });

    await browser.close();
  } catch (error) {
    await browser.close();
    throw error;
  }

  if (!performances.length) {
    throw new Error('performances 为空，数据异常，请重新发起测试');
  }

  return performances.splice(0, 2);
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

  // fix https://apps.apple.com/cn/app/id982906456 这种网站会读取错误，做了缓存特殊处理
  if (performance.firstMeaningfulPaint < 0) {
    performance.firstMeaningfulPaint = performance.firstContentfulPaint;
  }

  // speedIndex
  // const trace = await speedline('trace.json', {
  //   timeOrigin: performance.timeOrigin,
  // });
  // performance.speedIndex = trace.speedIndex;

  // score
  const result = webperfscore({
    'first-contentful-paint': performance.firstContentfulPaint,
    'first-meaningful-paint': performance.firstMeaningfulPaint,
    // 'speed-index': performance.speedIndex,
    'fully-loaded': performance.domComplete - performance.timeOrigin,
  }, {
    score: 10,
    audits: (() => {
      const audits = [].concat(defaultAudits);

      audits.splice(2, 1);

      audits[1].weight = 3;
      audits[2].weight = 5;

      return audits;
    })(),
  });

  performance.score = result.score; // 分值

  // await page.screenshot({ path: 'example.png' });
  return performance;
}