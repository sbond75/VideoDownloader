// https://pptr.dev/#?product=Puppeteer&version=v9.1.1&show=api-working-with-chrome-extensions

const puppeteer = require('puppeteer');
const folderName = 'StreamRecorder/extension_1_3_3_0'; //'my-extension'

(async () => {
  const pathToExtension = require('path').join(__dirname, folderName);
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
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
})();
