// https://pptr.dev/#?product=Puppeteer&version=v9.1.1&show=api-working-with-chrome-extensions

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const puppeteer = require('puppeteer');
const folderName = 'StreamRecorder/extension_1_3_3_0'; //'my-extension'

(async () => {
  const pathToExtension = require('path').join(__dirname, folderName);
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      `--whitelisted-extension-id=iogidnfllpdhagebkblkgbfijkbkjdmm`
    ],
  });
  const targets = await browser.targets();
  const backgroundPageTarget = targets.find(
    (target) => target.type() === 'background_page'
  );
  const backgroundPage = await backgroundPageTarget.page();
  // Test the background page as you would any other page.
  //await browser.close();
  
  // Can use AutoHotkey to communicate with nodejs via stdin if needed, then evaluate js code from stdin once we reach a line containing `[[eval]]` for example.
  
  //console.log(backgroundPage);

  
  // const target = await new Promise(resolve => {
  //     var targets = browser.targets();
  //     const target = targets.find(target => target.type() === 'background_page' && target.url().endsWith('_generated_background_page.html'));
  //     if (target)
  //       return resolve(target);
  //     const listener = target => {
  //       if (target.type() === 'background_page' && target.url().endsWith('background.html')) {
  //         browser.removeListener('targetcreated', listener);
  //         browser.removeListener('targetchanged', listener);
  //         resolve(target);
  //       }
  //     };
  //     browser.on('targetcreated', listener);
  //     browser.on('targetchanged', listener);
  //   });
  //   var backgroundPage = await target.page();
  //   console.log(backgroundPage);
  //   await backgroundPage.reload();
  //   await backgroundPage.evaluateHandle(() => {
  //     window.createPanel();
  //     console.log(window);
  //   });


  /* // [doesn't work:] //
  // https://stackoverflow.com/questions/48089670/detect-and-test-chrome-extension-using-puppeteer :
  // Can we navigate to a chrome-extension page? YES!
const page = await browser.newPage();
  await page.goto('chrome-extension://iogidnfllpdhagebkblkgbfijkbkjdmm/background.html');
  // click buttons, test UI elements, etc.
  */

  /* // https://pptr.dev/#?product=Puppeteer&version=v9.1.1&show=api-pageevaluatepagefunction-args
  const bodyHandle = await page.$('body');
  const html = await page.evaluate((body) => body.innerHTML, bodyHandle);
  */
  //console.log(WebExtensions.browserAction.onClicked);
  ///await sleep(6000);
  ///console.log(await backgroundPage.evaluate("WebExtensions.browserAction.onClicked"));


  // Works!: https://github.com/puppeteer/puppeteer/issues/2486 : //
  
  // load a page from which to click browser action, make it the active tab
  const someOtherPage = await browser.newPage()
  await someOtherPage.goto('https://google.com')
  await someOtherPage.bringToFront()
  
  // evaluate chrome object in context of background page:
  const extBackgroundPage = backgroundPage;
  await extBackgroundPage.evaluate(() => {
    chrome.tabs.query({ active: true }, tabs => {
      chrome.browserAction.onClicked.dispatch(tabs[0]);
    })
  })

  // //



  
  //console.log(UNITS);
})();
