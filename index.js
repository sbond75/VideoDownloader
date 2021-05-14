// https://pptr.dev/#?product=Puppeteer&version=v9.1.1&show=api-working-with-chrome-extensions

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const puppeteer = require('puppeteer');
const folderName = 'StreamRecorder/extension_1_3_3_0'; //'my-extension'

// readline //

// const readline = require('readline').createInterface({
//   input: process.stdin,
//   output: process.stdout
// })

// https://stackoverflow.com/questions/43638105/how-to-get-synchronous-readline-or-simulate-it-using-async-in-nodejs
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin , output: process.stdout });

const getLine = (function () {
    const getLineGen = (async function* () {
        for await (const line of rl) {
            yield line;
        }
    })();
    return async () => ((await getLineGen.next()).value);
})();

// //

// https://stackoverflow.com/questions/47095019/how-to-use-array-prototype-filter-with-async //
const asyncFilter = async (arr, predicate) => {
    const results = await Promise.all(arr.map(predicate));

    return arr.filter((_v, index) => results[index]);
}
// Example:
/*
const arr = [1, 2, 3, 4, 5];

function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

const asyncFilter = async (arr, predicate) => {
    const results = await Promise.all(arr.map(predicate));

    return arr.filter((_v, index) => results[index]);
}

const asyncRes = await asyncFilter(arr, async (i) => {
    await sleep(10);
    return i % 2 === 0;
});

console.log(asyncRes);
*/

// //

// https://gist.github.com/Atinux/fd2bcce63e44a7d3addddc166ce93fb2 //
const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}
// Example:
/*
const start = async () => {
  await asyncForEach([1, 2, 3], async (num) => {
    await waitFor(50)
    console.log(num)
  })
  console.log('Done')
}

start()
*/

const assert = require('assert');

// //

// Lib //
var runKaltura = async function(page) {
  // Wait for the results page to load and display the results.
  const sel = "iframe.d2l-iframe";
  const frameHandle = await page.waitForSelector(sel); //await page.$(sel); //page.$("iframe[id='frame1']"); // https://chercher.tech/puppeteer/iframes-puppeteer
  assert(frameHandle != null);
  const frame = await frameHandle.contentFrame();
  assert(frame != null);
  const resultsSelector = '.item_link';
  await frame.waitForSelector(resultsSelector);
  //await page.waitForSelector(resultsSelector);
  const res = await frame.$$(resultsSelector); // CSS selector ( https://stackoverflow.com/questions/62803807/selector-syntax-in-puppeteer )
  //console.log("done: " + res);
  console.log(res.length);
  // Remove video times from the results list (see `notes/Screen Shot 2021-05-13 at 11.44.36 AM`)
  // Broken: doesn't actually filter? Or does it asynchronously..: //
  // const result = await res.filter(async function(jsHandle) {
  //   const e = jsHandle.asElement();
  //   const children = await e.$$eval('*', nodes => nodes); // `$$eval('*')` gets all child elements  //element.children.length > 0
  //   //console.log(children);
  //   //console.log(children.length);
  //   return children.length > 0;
  // });
  // //
  const result = await asyncFilter(res, async function(jsHandle) {
    const e = jsHandle.asElement();
    const children = await e.$$eval('*', nodes => nodes); // `$$eval('*')` gets all child elements  //element.children.length > 0
    //console.log(children);
    //console.log(children.length);
    return children.length > 0;
  });
  console.log(result.length);

  // Click each link
  await asyncForEach(result, async function(elementHandle) {
    // https://pocketadmin.tech/en/puppeteer-open-link-in-new-tab/
    const newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));  // declare promise
    await elementHandle.click({button : "middle"});       // click middle button, link open in a new tab
    const page2 = await newPagePromise;                   // declare new tab, now you can work with it
    await page2.bringToFront();                           // make the tab active

    // Grab the video after the page loads from the above click.
    const sel = `#kplayer_ifp`; // Grab the element (in this case, it should be an iframe) with this id.        //`iframe[class*="d2l-iframe"]`; // https://stackoverflow.com/questions/21222375/css-selector-for-attribute-names-based-on-a-wildcard : {"
    // E[foo*="bar"]
    // an E element whose "foo" attribute value contains the substring "bar"
    // "}
    const frameHandle = await page2.waitForSelector(sel);
    const frame = await frameHandle.contentFrame();
    const resultsSelector = 'a.icon-play';
    const res = await frame.waitForSelector(resultsSelector);
    //const resArray = await frame.$$(resultsSelector);
    // Push play
    //await frame.click(resultsSelector);
    await res.click({delay: 200}); // TODO: doesn't play inline and does weird stuff

    // Download video
    
    // Close tab
    await page2.close();
  });

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
}
// //

// Config //

// All pages to download
const pages = [
  {url: "https://brightspace.vanderbilt.edu/d2l/common/dialogs/quickLink/quickLink.d2l?ou=269291&type=lti&rcode=vanderbiltprod-14704&srcou=6606&launchFramed=1&framedName=Media+Gallery" , type: "kaltura"}
];


const testMode = false; //true;
// //

// Make "global" variables, for testing in the REPL:
var browser = null;
var page = null;

(async () => {
  try {
    const pathToExtension = require('path').join(__dirname, folderName);
    /*const*/ browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        `--whitelisted-extension-id=iogidnfllpdhagebkblkgbfijkbkjdmm`,
        // https://stackoverflow.com/questions/65049531/puppeteer-iframe-contentframe-returns-null :
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      userDataDir: require('path').join(__dirname, 'UserData') // For saving session cookies after logging in (so you don't have to keep entering your Brightspace passwor, except after a long time), etc. across sessions ( https://stackoverflow.com/questions/60695684/how-can-i-keep-the-account-session-logged-in )
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


    if (!testMode) {
      // Log into Brightspace
      page = await browser.newPage();
      await page.goto('https://brightspace.vanderbilt.edu/d2l/home');
      const prompt = `Log into Brightspace, then press enter: `;
      // readline.question(prompt, input => {
      //   //console.log(`${input}!`)
      //   readline.close()
      // })
      console.log(prompt);
      await getLine();
      console.log("Running...");
      
      // Go through each URL given
      //await page.waitForNavigation(); // Wait for previous thing to load
      await asyncForEach(pages, async function(specifier) {
        console.log("Processing", specifier);
        await page.goto(specifier.url);
        await runKaltura(page);
      });
    }
    if (testMode) {
      page = await browser.newPage();
      const fname = 'Media Gallery - EECE 2112-01 Circuits I (2021S).html';
      await page.goto("file://" + require('path').join(__dirname, fname)); // __dirname is the current/working directory
      await runKaltura(page);
    }


    //console.log(UNITS);
  /*} catch (error) {
    // Rethrow the error:
    // https://www.bennadel.com/blog/2831-rethrowing-errors-in-javascript-and-node-js.htm
    console.log( "Error caught and rethrown:", error.message );
    // In JavaScript, there is no special "rethrow" keyword. You simply throw() the
    // error that you caught. This will maintain the original stacktrace recorded by
    // the error as you "pass it back up" the call-stack.
    throw( error );
  }*/
  } finally {
    // Open a REPL ( https://nodejs.org/api/repl.html )
    //while (true) {
    //eval(
      
    const repl = require('repl');
      
    // start repl on stdin
    var ctx = repl.start("prompt> ").context;
    ctx.browser = browser; // https://nodejs.org/api/repl.html#repl_global_and_local_scope : {"
    // The default evaluator provides access to any variables that exist in the global scope. It is possible to expose a variable to the REPL explicitly by assigning it to the context object associated with each REPLServer:
    // const repl = require('repl');
    // const msg = 'message';
    // 
    // repl.start('> ').context.m = msg;
    // "}
    ctx.page = page; // Current browser page
    
    //}
  }
})();
