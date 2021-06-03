// Config //

// All pages to download
var pages = [
  {
    url: "https://brightspace.vanderbilt.edu/d2l/common/dialogs/quickLink/quickLink.d2l?ou=269291&type=lti&rcode=vanderbiltprod-14704&srcou=6606&launchFramed=1&framedName=Media+Gallery",
    type: "kaltura",
    skip: true
  },
  {
    url: "https://brightspace.vanderbilt.edu/d2l/common/dialogs/quickLink/quickLink.d2l?ou=269937&type=lti&rcode=vanderbiltprod-849227&srcou=6606&launchFramed=1&framedName=Zoom",
    type: "zoom",
    skip: false
  }
];

// Where to save downloaded video files
const downloadPath = require('path').resolve('./download' // <-- Set this here
                                            );

// Advanced //

// If Zoom, Kaltura, etc. for some reason name two videos the same name, setting this to false will still download them, so set it to false if this is the case. On the other hand, setting it to true will skip them (or any videos that exist on disk with the same name as a download) -- this has the advantage of allowing the downloading program to easily continue where it left off if interrupted, since it will skip each video that was downloaded already once it navigates to its URL.
skipDownloadsIfSameName = true;

// //

// Testing //

// Whether to use a local HTML file for testing instead of `pages` declared above
const testMode = false; //true;

// //

// //



// Based on https://pptr.dev/#?product=Puppeteer&version=v9.1.1&show=api-working-with-chrome-extensions

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const puppeteer = require('puppeteer');
const streamRecorderExtensionFolderName = 'ChromeExtensions/StreamRecorder/extension_1_3_3_0'; //'my-extension'
const modifiedDownloadExtensionFolderName = 'ChromeExtensions/Modified/downloads-overwrite-already-existing-files';

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

// //

const assert = require('assert');
const path = require('path');
const fs = require('fs');
// Verify downloadPath
//const downloadPathDirName = path.dirname(downloadPath);
//if (!fs.stat(
const sanitize = require("sanitize-filename"); // https://www.npmjs.com/package/sanitize-filename

// https://stackoverflow.com/questions/3749231/download-file-using-javascript-jquery //
// If you don't know the name or want to use
// the webserver default set name = ''
async function downloadURL_chromeWithoutWebSecurity(page, uri, name, downloadDir) // Appends the file extension to `name` automatically based on `uri`'s file extension (from the rightmost dot to the end of the string).
{
  // Chrome doesn't use the `download` attribute on `a` elements to override the name of the saved file, so the hack below won't work unless starting Chrome with `--disable-web-security` which disables the "same origin policy" and may cause less secure browsing or something, so I am not using it. This function is here in case it is needed. https://stackoverflow.com/questions/28318017/html5-download-attribute-not-working-when-downloading-from-another-server-even
  await page.evaluate(`
    var link = document.createElement("a");
    // If you don't know the name or want to use
    // the webserver default set name = ''
    link.setAttribute('download', "${name.replace(/"/g, '\\\"') + path.extname(uri)}");
    link.href = "${uri.replace(/"/g, '\\\"')}";` // Escape double quotes from the string (change " to \") ( https://stackoverflow.com/questions/15877778/function-to-escape-quotes-in-javascript )
                      + `
    document.body.appendChild(link);
    link.click();
    link.remove();
  `);
}
// Downloads any file with Chrome using the given async function `downloadFunc`. It then returns the name of the downloaded file, since it expects Chrome to place it in `downloadDir`.
// Precondition: the downloaded file that is downloaded via `downloadFunc` does not end in `.crdownload`.
async function waitForDownload(downloadDir, name, downloadFunc) {
  /*let*/ filesInitiallyInDownloadDir = /*await*/ fs.readdirSync(downloadDir);

  // Start the download
  await downloadFunc();
  
  // Wait for the download to start:
  // Wait for a new file to appear in the download path
  var checkCount = 0;
  while (true) {
    filesInDownloadDir = /*await*/ fs.readdirSync(downloadDir);
    if (filesInDownloadDir.length > filesInitiallyInDownloadDir.length) {
      break;
    }
    if (checkCount % 200 == 0) {
      console.log("Waiting for download of \"" + name + "\" to start (waiting for a new file to appear in \"" + downloadDir + "\")...");
    }
    checkCount = checkCount + 1;
    await sleep(20);
  }

  // Wait for the download to finish:
  // Look for crdownload files in the download path and wait until none remain
  // https://stackoverflow.com/questions/53471235/how-to-wait-for-all-downloads-to-complete-with-puppeteer
  /*var*/ filesInDownloadDir = null;
  // try {
  // } catch (err) {
  //   return resolve("null");
  // }
  var crDownload;
  checkCount = 0;
  do {
    crDownload = false; // Assume false
    filesInDownloadDir = /*await*/ fs.readdirSync(downloadDir);
    await asyncForEach(filesInDownloadDir, async function(file) {
      if (file.endsWith('.crdownload')) { // [done, checked if uri ends in crdownload above]FIXED: This hangs forever if the downloaded file is literally called `<something>.crdownload`! Rare but possible... [now fixed.]
        crDownload = true; // We have a crdownload file
        if (checkCount % 10 == 0) {
          console.log("Waiting for download of \"" + name + "\" to finish (waiting for \"" + file + "\" to go away)...");
        }
        checkCount = checkCount + 1;
        await sleep(1000);
        // if (timer == 0) {
        //   //fs.unlink(path + '/' + noOfFile[i], (err) => {
        //   //});
        //   //return resolve("Success");
        // } else {
        //   //await this.checkFileDownloaded(path, timer);
        // }
      }
      //else if (noOfFile[i] === name)
    });
  } while (crDownload);

  // Get the name of the downloaded file:
  // https://stackoverflow.com/questions/2963281/javascript-algorithm-to-find-elements-in-array-that-are-not-in-another-array
  // Probably slow:
  let x = filesInitiallyInDownloadDir;
  let y = filesInDownloadDir;
  // "// goal is to get rid of values in y if they exist in x"
  /*let*/ newFilesNotInInitialArray = y.filter( function( el ) {
    return x.indexOf( el ) < 0;
  });
  assert(newFilesNotInInitialArray.length == 1);
  // path.basename(uri) may or may not be equal to newFilesNotInInitialArray[0], so we use the actual filename (newFilesNotInInitialArray[0]):
  let downloadedFileName = newFilesNotInInitialArray[0];
  return downloadedFileName;
}
// Appends the file extension to `name` automatically based on the downloaded file's extension.
// Precondition: `name` is a valid file name.
async function downloadURI_withFileMove(page, uri, name, downloadDir) 
{
  console.log(`downloadURI_withFileMove(${page}, ${uri}, ${name}, ${downloadDir})`);
  if (uri.endsWith('.crdownload') || name.endsWith('.crdownload')) {
    // Invalid names for our procedure below, so error out:
    throw 'In this script, file names currently cannot end with .crdownload';
  }
  
  // Instead of `downloadURL_chromeWithoutWebSecurity` using the `download` attribute, we move the downloaded file to the `name` location using the `uri`'s last path component.
  
  // Start the download and wait for the download to complete
  const downloadedFileName = await waitForDownload(downloadDir, name, async () => {
    // Download the file:
    await page.evaluate(`
      var link = document.createElement("a");
      // If you don't know the name or want to use
      // the webserver default set name = ''
      link.setAttribute('download', "");
      link.href = "${uri.replace(/"/g, '\\\"')}";` // Escape double quotes from the string (change " to \") ( https://stackoverflow.com/questions/15877778/function-to-escape-quotes-in-javascript )
                        + `
      document.body.appendChild(link);
      link.click();
      link.remove();
    `);
  });
  
  // Move the file from (`downloadDir`/(`uri`'s last path component)) to (`downloadDir`/`name`):
  const destFile = path.join(downloadDir, name)
        + path.extname(downloadedFileName); /* <-- Appends the file extension with a dot before it */
  if (fs.existsSync(destFile)) {

    const prompt = `File "${destFile}" already exists. Overwrite it (y/n)?: `;
    console.log(prompt);
    const answer = await getLine();
    if (answer.toLowerCase().startsWith('y')) {
      // Yes, overwrite the file
      // (Continue to the below fs.renameSync call)
    }
    else {
      // Skip it
      console.log("Skipping the file.");
      return;
    }
  }
  fs.renameSync(path.join(downloadDir, downloadedFileName), destFile);
}
// Makes Chrome download to `downloadDir`
async function setDownloadPath(downloadDir, createBaseDirectory /* Optional parameter; if true, creates the last path component of `downloadDir` as a single folder. */) {
  // Create destination folder if wanted
  if (createBaseDirectory === true && !fs.existsSync(downloadDir)){ // https://stackoverflow.com/questions/21194934/how-to-create-a-directory-if-it-doesnt-exist-using-node-js
    fs.mkdirSync(downloadDir);
  }
  
  /* // Deprecated to do Page.setDownloadBehavior ( https://github.com/puppeteer/puppeteer/issues/4676 ):
     await videoOnlyPage._client.send('Page.setDownloadBehavior', {
     behavior: 'allow',
     downloadPath: downloadDir
     });
  */
  // Instead:
  const cdpsession = await page.target().createCDPSession();
  await cdpsession.send ("Browser.setDownloadBehavior", {behavior:"allow", downloadPath: downloadDir });
}
// Appends the file extension to `name` automatically.
// Precondition: `name` is a valid file name.
async function downloadURI(page, uri, name, downloadDir, skipIfDownloadedAlready /* Optional parameter; if true, it checks if a file named `name` + URI's file extension exists in `downloadDir` already, and returns without downloading anything if so. By default, it doesn't check for this or skip if downloaded already. */) 
{
  // Create destination folder
  if (!fs.existsSync(downloadDir)){ // https://stackoverflow.com/questions/21194934/how-to-create-a-directory-if-it-doesnt-exist-using-node-js
    fs.mkdirSync(downloadDir);
  }

  // Check if this was downloaded already, if desired
  if (skipIfDownloadedAlready === true) {
    const file = path.join(downloadDir, name) + path.extname(uri);
    if (fs.existsSync(file)) {
      // This was downloaded already
      console.log("Already downloaded \"" + name + "\", skipping");
      return;
      
      // if (fs.statSync(file).isFile()) {
      // }
    }
  }

  // Make Chrome download to `downloadDir`
  await setDownloadPath(downloadDir, false);

  // Download the file
  return await downloadURI_withFileMove(page, uri, name, downloadDir);
}

// Workaround to rename downloaded files once they are downloaded
// https://github.com/puppeteer/puppeteer/issues/4676
// make sure tempDownloadDir is an empty directory
// async function waitForDownload(tempDownloadDir, downloadDir) {
//   let filename;
//   while (!filename || filename.endsWith('.crdownload')) {
//     filename = fs.readdirSync(tempDownloadDir)[0];
//     await new Promise(resolve => setTimeout(resolve, 500));
//   }
//   if (filename !== undefined) {
//     fs.renameSync(path.join(tempDownloadDir, filename), path.join(downloadDir, filename));
//   }
//   return filename;
// };
// //

// Lib //
// Fixed version of waitForSelector that doesn't have the timeout problem described in commit 3f2b95819cbac8ef6e67f6d72ea61583c5e8e4e1 :
var waitForSelector = async function(page, sel, pageDescription /* Optional parameter, can be used to say the variable name/codename of the page */) {
  var retryNumber = 0;
  var res;
  var pageTitle;
  while (true) { // Retry loop
    try {
      // Wait until load
      //await page.waitForNavigation({waitUntil: 'load'});
      pageTitle = await page.title();
      console.log(pageDescription === undefined ? "waitForSelector:" : `waitForSelector ${pageDescription}:`, pageTitle);
      res = await page.waitForSelector(sel,
                                       {timeout: 3000 /* milliseconds */ }
                                      ); // [nvm:] Use a short timeout here because the page should be networkidle2 as seen in the call to page2.waitForNavigation() above, and if we timeout now then we probably have Kaltura giving us the iframe itself as our current browser URL address, like it's inlined.
    } catch (e) {
      if (e instanceof puppeteer.errors.TimeoutError) { // https://stackoverflow.com/questions/52716109/puppeteer-page-waitfornavigation-timeout-error-handling , https://devdocs.io/puppeteer/
        // Handle this exception

        // console.log("Detected no video iframe, the video is probably inlined as the current webpage. Exception was:", e);
        // // Set the frame to the page instead
        // frame = page2;


        // We timed out, and this seems to happen sometimes; maybe it is a bug in Puppeteer.
        retryNumber = retryNumber + 1;
        console.log("Retry number", retryNumber, "for timing out on", sel);
        
        // It seems we can close the page and try again, so we do that:
        // page2.close();
        // await sleep(4000);
        
        continue; // Retry
      }
      else {
        throw e; // let others bubble up
      }
    }
    
    break; // Successful, no need to retry
  }

  return res;
};

// Gets the iframe common to video list Brightspace pages.
var getD2LIFrame = async function(page) {
  // Wait for the results page to load and display the results.
  const sel = "iframe.d2l-iframe";
  const frameHandle = await page.waitForSelector(sel); //await page.$(sel); //page.$("iframe[id='frame1']"); // https://chercher.tech/puppeteer/iframes-puppeteer
  assert(frameHandle != null);
  const frame = await frameHandle.contentFrame();
  assert(frame != null);
  
  return frame;
}
// Downloads all Kaltura videos on the given Brightspace `page` that contains an iframe for the list of Kaltura video thumbnails.
var runKaltura = async function(page) {
  const frame = await getD2LIFrame(page);
  
  var computeVideoList = async function() {
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

    return result;
  }

  // Grab title (example: "EECE 2112-01 Circuits I (2021S)"). (Later, `downloadURI` automatically makes a new folder for it in the downloads folder if needed.)
  const title = await page.title();
  console.log("page:", title);

  // Compute video list
  var result = await computeVideoList();

  // Click each link, and as we go (at the end of the for loop below), update/re-compute the list of results (`result`), since the Kaltura iframe loads more as we go through it.
  var indexIntoResult = 0;
  var i;
  var result;
  //await asyncForEach(result, async function(elementHandle) {
  for (i = 0; i < result.length; i++) {
    var elementHandle = result[i];
    console.log(`-- Downloading video ${i + 1} of the ${result.length} found so far --`);
    
    var retrying = true;
    var retryNumber = 0;
    while (retrying) {
      // https://pocketadmin.tech/en/puppeteer-open-link-in-new-tab/
      var newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));  // declare promise
      await elementHandle.click({button : "middle"});       // click middle button, link open in a new tab
      /*const*/ page2 = await newPagePromise;                   // declare new tab, now you can work with it
      await page2.bringToFront();                           // make the tab active
      //await page2.waitForNavigation({waitUntil: 'domcontentloaded' /*'networkidle2'*/}); // "The promise resolves after navigation has finished" + {"
      // waitUntil <"load"|"domcontentloaded"|"networkidle0"|"networkidle2"|Array> When to consider navigation succeeded, defaults to load. Given an array of event strings, navigation is considered to be successful after all events have been fired. Events can be either:
      // load - consider navigation to be finished when the load event is fired.
      // domcontentloaded - consider navigation to be finished when the DOMContentLoaded event is fired.
      // networkidle0 - consider navigation to be finished when there are no more than 0 network connections for at least 500 ms.
      // networkidle2 - consider navigation to be finished when there are no more than 2 network connections for at least 500 ms.
      // "} ( https://github.com/puppeteer/puppeteer/blob/main/docs/api.md )

      // Grab the video after the page loads from the above click.
      const sel = '#kplayer_ifp'; // Grab the element (in this case, it should be an iframe) with this id.        //`iframe[class*="d2l-iframe"]`; // https://stackoverflow.com/questions/21222375/css-selector-for-attribute-names-based-on-a-wildcard : {"
      // E[foo*="bar"]
      // an E element whose "foo" attribute value contains the substring "bar"
      // "}
      const frameHandle = await waitForSelector(page2, sel, "page2");
      var page2Title = await page2.title();
      const frame = await frameHandle.contentFrame();

      // Get the play button within the iframe:
      // [done]NOTE: for the future, if this has problems, you can use my waitForSelector wrapper instead.
      const resultsSelector = 'a.icon-play';
      var res;
      try {
        res = await frame.waitForSelector(resultsSelector);
      } catch (e) {
        // https://stackoverflow.com/questions/1433558/handling-specific-errors-in-javascript-think-exceptions
        if (e instanceof puppeteer.errors.TimeoutError) {
          // specific error

          // We timed out, and this seems to happen sometimes: the play button doesn't show up. It seems we can close the page and try again, so we do that:
          retryNumber = retryNumber + 1;
          console.log("Retry number", retryNumber, "for timing out on", resultsSelector);
          // If retries are large, fallback on my waitForSelector wrapper:
          if (retryNumber > 2) {
            console.log("Falling back on waitForSelector wrapper");
            res = await waitForSelector(frame, resultsSelector);
          }
          else {
            page2.close();
            await sleep(4000);
            continue; // Retry
          }
        } else {
          throw e; // let others bubble up
        }
      }
      
      //const resArray = await frame.$$(resultsSelector);

      // Push play
      //await frame.click(resultsSelector);
      // We expect this to open a new tab, so we set up a promise for it:
      newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));  // declare promise
      await res.click({delay: 200}); // Note: Doesn't play inline and does weird stuff compared to what regular Chrome does. But this seems to be ok, because it actually exposes the mp4 file as `https://cfvod.kaltura.com/pd/p/1821441/sp/182144100/serveFlavor/entryId/1_0u7l6ro1/v/1/ev/4/flavorId/1_yalya7hc/name/a.mp4` for example (see `notes/Screen Shot 2021-05-13 at 7.02.56 PM`). Then, you can right-click in the black areas around the video and press "Save As..." and get the mp4 file downloaded, so I think I'll use this. The expected Chromium version for this to work is `Version 91.0.4469.0 (Developer Build) (x86_64)` for macOS Catalina 10.15.5 (19F101)
      /*const*/ videoOnlyPage = await newPagePromise;                 // declare new tab, now you can work with it
      await videoOnlyPage.bringToFront();                           // make the tab active
      console.log("videoOnlyPage:", await videoOnlyPage.title());

      // Download video (mp4)      
      // https://www.scrapingbee.com/blog/download-file-puppeteer/
      const destDir = path.join(downloadPath, sanitize(title, {replacement: '_'})); // Sanitize the string to be safe for use as a filename.
      const videosource = await waitForSelector(videoOnlyPage, 'video>source', "videoOnlyPage");
      const videosourceSrc = await (await videosource.getProperty('src')).jsonValue(); // https://stackoverflow.com/questions/49388467/getting-property-from-elementhandle
      await downloadURI(videoOnlyPage, videosourceSrc, sanitize(/*await videoOnlyPage.title()*/ page2Title, {replacement: '_'}), destDir, skipDownloadsIfSameName);

      // Close tabs
      await videoOnlyPage.close();
      await page2.close();
      break; // Done, no need to retry
    }

    // Recompute video list
    result = await computeVideoList();
  }

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


  // // Works!: https://github.com/puppeteer/puppeteer/issues/2486 : //

  // // load a page from which to click browser action, make it the active tab
  // const someOtherPage = await browser.newPage()
  // await someOtherPage.goto('https://google.com')
  // await someOtherPage.bringToFront()

  // // evaluate chrome object in context of background page:
  // const extBackgroundPage = backgroundPage;
  // await extBackgroundPage.evaluate(() => {
  //   chrome.tabs.query({ active: true }, tabs => {
  //     chrome.browserAction.onClicked.dispatch(tabs[0]);
  //   })
  // })

  // // //

  console.log("Done!");
}

var runZoom = async function(page) {
  const frame = await getD2LIFrame(page);

  var clickPreviousMeetings = async function() {
    // Click on the "Previous Meetings" button:
    const button = await frame.waitForXPath("//div[contains(text(), 'Previous Meetings')]"); // https://stackoverflow.com/questions/47407791/how-to-click-on-element-with-text-in-puppeteer           // Nvm this, there might not be innertext for css selectors: await frame.waitForSelector("div[innertext='Previous Meetings']");
    await button.click({delay: 200});
  };
  
  // Click on the "Previous Meetings" button:
  await clickPreviousMeetings();

  var computeVideoList = async function() {
    const resultsXPath = "//a[contains(text(), 'Recording Details')]"; // const resultsSelector = "a[innertext='Recording Details']";
    await frame.waitForXPath(resultsXPath);
    //await page.waitForSelector(resultsSelector);
    const res = await frame.$x(resultsXPath);
    console.log(res.length);
    
    return res;
  };

  // Get page title
  const title = await page.title();

  // Compute video list
  var result = await computeVideoList();

  // Click each link, and as we go (at the end of the for loop below), update/re-compute the list of results (`result`), since the Kaltura iframe loads more as we go through it.
  var indexIntoResult = 0;
  var i;
  var result;
  while (true) {
    //await asyncForEach(result, async function(elementHandle) {
    for (i = 0; i < result.length; i++) {
      var elementHandle = result[i];
      console.log(`-- Downloading video ${i + 1} of the ${result.length} on this page --`);

      // Click on "Recording Details" (middle-clicking to open in a new tab results in a page displaying "The recording does not exist(2237)." ( https://applications.zoom.us/lti/rich/home/recording/detail ))
      await elementHandle.click({delay: 200});

      // Grab each video (there can be multiple), ignoring audio files
      // The div:nth-child here can be changed to cycle through each video or audio element if needed:
      // #integration-recording-detail > div > div > div > div.meeting > div > div.recording > div:nth-child(1) > div > div > div[style*=video] > span
      // #integration-recording-detail > div > div > div > div.meeting > div > div.recording > div:nth-child(2) > div > div > div[style*=audio] > span      // `div[style*=audio]` means the div has an attribute "style" that contains the substring "audio"
      const sel = '#integration-recording-detail > div > div > div > div.meeting > div > div.recording > div > div > div > div[style*=video] > span';
      await frame.waitForSelector(sel);
      const allVideos = await frame.$$(sel); // Tip: to test CSS selectors in Chrome, use Command/Ctrl F and then paste this in (source: https://developers.google.com/web/updates/2015/05/search-dom-tree-by-css-selector ). It goes into iframes too.
      console.log("Number of sub-videos:", allVideos.length);

      // Set download location and create folder if needed
      const destDir = path.join(downloadPath, sanitize(title, {replacement: '_'}));
      await setDownloadPath(destDir, true);
      
      // For each video, click on it. This opens it in a new tab as well.
      var subvideoIndex;
      for (subvideoIndex = 0; subvideoIndex < allVideos.length; subvideoIndex++) {
        var videoElement = allVideos[subvideoIndex];
        if (allVideos.length > 1) {
          console.log(`- Downloading sub-video ${subvideoIndex + 1} of ${allVideos.length} -`);
        }
        
        // We expect this to open a new tab, so we set up a promise for it:
        newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));  // declare promise
        await videoElement.click({delay: 200});
        /*const*/ videoOnlyPage = await newPagePromise;                 // declare new tab, now you can work with it
        await videoOnlyPage.bringToFront();                           // make the tab active
        console.log("videoOnlyPage:", await videoOnlyPage.title());
        
        // First, try to download the video with the download button that Zoom shows. If this fails, run injectedScript.js from zoom-download to re-create the download button and then click it. Either way, we create both buttons in order to at least press the download chat (as newly fabricated subtitles) button.
        var runInjectedScript = async function() {
          // Run injectedScript.js from zoom-download
          const fileContents = fs.readFileSync('./zoom-download-modded.js').toString();
          //fileContents.replace("%PLACEHOLDER_TITLE%",
          await videoOnlyPage.evaluate(fileContents); //+ `\n\ninsertButtons();`); // Insert the buttons from the zoom-download extension
        };
        // (Note: to prevent overwriting existing downloaded files, this requires the `pathToModifiedDownloadExtension` extension to be loaded.)
        var pressCustomDownloadVideoButton = async function() {
          // Click the download video button
          const downloadVideoXPath = "//div[contains(text(), 'Download Video')]";
          const button = await videoOnlyPage.waitForXPath(downloadVideoXPath);
          await button.click();
        };
        var pressCustomDownloadChatButton = async function(downloadedVideoFileName /* Optional parameter. Pass it if we downloaded the video using Zoom's own download video button, because then we can rename the subtitles file to this name without .mp4 and with .srt instead. */) {
          // Click the download chat button
          const downloadSubtitlesXPath = "//*[text()[contains(., 'Download Chat')]]"; // Works for innerhtml ( https://stackoverflow.com/questions/42778006/selenium-xpath-searching-for-element-by-innerhtml )    // Doesn't work for innerhtml stuff since this is `<div class="btn"><i class="zm-icon-download mgr-xs"></i>Download Chat</div>` and not just innertext I think: "//i[contains(text(), 'Download Chat')]"; // "//a[contains(text(), 'Download Chat')]";
          const button = await videoOnlyPage.waitForXPath(downloadSubtitlesXPath);
          //console.log((await button.getProperty('download')).jsonValue()); // Prints `Promise { undefined }`
          //throw "";
          // Get the parent of the button
          const button_parent = (await button.$x('..'))[0]; // Element Parent ( https://stackoverflow.com/questions/52179280/how-do-i-get-parent-and-siblings-of-elementhandle-in-nodejs/52189574#52189574 )
          const subtitleFileName = sanitize(downloadedVideoFileName !== undefined ? downloadedVideoFileName.replace(/.mp4$/ /* <-- Regex to match .mp4 at the end of the string */, '.srt') : await (await button_parent.getProperty('download')).jsonValue(), {replacement: '_'}) + (allVideos.length > 1 ? (subvideoIndex + 1) : ""); // We also append a sub-video index to the subtitles if there are more than one sub-videos
          // Change the button's `download` attribute (which is a file name) to be this sanitized one above
            // NOTE: This xpath doesn't work when used in the page.evaluate(): `const subLink = getElementByXpath("//*[text()[contains(., 'Download Chat')]]").parentNode; // Escape double quotes from the string` or `getElementByXpath("${downloadSubtitlesXPath.replace(/"/g, '\\\"')}").parentNode;`
          // await page.evaluate(`
         //    function getElementByXpath(path) {
         //      return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
         //    }

         //    subLink.download = "${subtitleFileName.replace(/"/g, '\\\"')}"; // Escape double quotes from the string
          // `);
          // Just doing `await button_parent.evaluate((node) => { node.download = subtitleFileName; });` results in `Error: Evaluation failed: ReferenceError: subtitleFileName is not defined`
          await button_parent.evaluate((node, subtitleFileName) => { node.download = subtitleFileName; }, subtitleFileName); // `elementHandle.evaluate` takes a "function to be evaluated in browser context"   // https://pptr.dev/#?product=Puppeteer&version=v10.0.0&show=api-elementhandleevaluatepagefunction-args : demo: `const tweetHandle = await page.$('.tweet .retweets'); expect(await tweetHandle.evaluate((node) => node.innerText)).toBe('10');`
          
          // // Verify filename
          // if (subtitleFileName.endsWith('.crdownload')) {
          //   // Invalid names for our procedure below, so error out:
          //   throw 'In this script, file names currently cannot end with .crdownload';
          // }
          // // Start the download and wait for the download to complete
          // const subtitleFilePath = await waitForDownload(downloadDir, subtitleFileName, async () => {
          //   // Download the file using the `#subtitleButton`, which was a button generated by our zoom-download-modded.js (actually use XPath using https://stackoverflow.com/questions/10596417/is-there-a-way-to-get-element-by-xpath-using-javascript-in-selenium-webdriver ) :
          //   await page.evaluate(`
          //     function getElementByXpath(path) {
          //       return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          //     }

          //     //const subLink = document.querySelector("#subtitleButton");
          //     const subLink = getElementByXpath("${downloadSubtitlesXPath.replace(/"/g, '\\\"')}"); // Escape double quotes from the string
          //     subLink.click();
          //   `);
          // });

          // FIXME: (This also applies to the `fs.existsSync` check within `downloadURI_withFileMove`) If `subtitleFileName` has invalid filename characters like slashes, then Chrome will download it as a different filename, replacing them with underscores. But we don't know if Chrome will always replace things the same way, i.e. maybe with updates it will change. So this name must somehow be gotten from Chrome outside this script, since this is used as part of the filename for subtitles, and it could contain invalid filename characters, and the nodejs script needs to know what it is.
          const subtitleFilePath = path.join(destDir, subtitleFileName);
          // Check if it exists already
          if (skipDownloadsIfSameName === true) {
            if (fs.existsSync(subtitleFilePath)) {
              // This was downloaded already
              console.log("Already downloaded \"" + subtitleFileName + "\", skipping");
              return;
              
              // if (fs.statSync(file).isFile()) {
              // }
            }
          }
          // Download it
          console.log(`Downloading subtitle file "${subtitleFileName}"`);
          await button.click();
        };
        var injected = false;
        try {
          // First, listen to responses from HTTP requests so we can check the downloaded file's name and rename it before Chrome downloads it again, i.e. if we have it already
          // https://www.checklyhq.com/learn/headless/request-interception/
          await videoOnlyPage.setRequestInterception(true); // "Activating request interception enables request.abort, request.continue and request.respond methods. This provides the capability to modify network requests that are made by a page." ( https://pptr.dev/#?product=Puppeteer&version=v9.1.1&show=api-pagesetrequestinterceptionvalue-cachesafe )
          videoOnlyPage.on('request', async (request) => {
            //if (request.url().endsWith(".mp4")) { // <-- doesn't work because requests often look like "GET https://ssrweb.zoom.us/replay03/2021/04/29/74A106D2-400A-41DE-805C-575236956447/GMT20210429-143543_Recording_640x360.mp4?response-content-type=video%2Fmp4&response-cache-control=max-age%3D0%2Cs-maxage%3D86400&data=81fef41779cd7b07965c37d8d6c50084ce89aff0b30cdf450512e2bd90f6af5e&s001=yes&cid=aw1&fid=HBnyhsc1etF1NK7YHvrqC7b12nT-zfG30akNblPFrMmDsYDp-UZW6gi_PjpDo_caKVHT4HTF9nI_TDjm.YUMaC1ZSQ2X0Q2wb&s002=-7ACY6BsfcPkhkibO7TQXu2lq4rOMVjhLgzZ-y0qdkgq2Emg7zJR2Iwl9g.whV5ipZjG5kRKdP9&Policy=eyJTdGF0ZW1lbnQiOiBbeyJSZXNvdXJjZSI6Imh0dHBzOi8vc3Nyd2ViLnpvb20udXMvcmVwbGF5MDMvMjAyMS8wNC8yOS83NEExMDZEMi00MDBBLTQxREUtODA1Qy01NzUyMzY5NTY0NDcvR01UMjAyMTA0MjktMTQzNTQzX1JlY29yZGluZ182NDB4MzYwLm1wND9yZXNwb25zZS1jb250ZW50LXR5cGU9dmlkZW8lMkZtcDQmcmVzcG9uc2UtY2FjaGUtY29udHJvbD1tYXgtYWdlJTNEMCUyQ3MtbWF4YWdlJTNEODY0MDAmZGF0YT04MWZlZjQxNzc5Y2Q3YjA3OTY1YzM3ZDhkNmM1MDA4NGNlODlhZmYwYjMwY2RmNDUwNTEyZTJiZDkwZjZhZjVlJnMwMDE9eWVzJmNpZD1hdzEmZmlkPUhCbnloc2MxZXRGMU5LN1lIdnJxQzdiMTJuVC16ZkczMGFrTmJsUEZyTW1Ec1lEcC1VWlc2Z2lfUGpwRG9fY2FLVkhUNEhURjluSV9URGptLllVTWFDMVpTUTJYMFEyd2ImczAwMj0tN0FDWTZCc2ZjUGtoa2liTzdUUVh1MmxxNHJPTVZqaExneloteTBxZGtncTJFbWc3ekpSMkl3bDlnLndoVjVpcFpqRzVrUktkUDkiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE2MjI0OTY4Nzh9fX1dfQ__&Signature=aziuRZPu8aHh5e6TTAh8vdeyXPs92RYKUuyL7VGLLA~4iwMLIn1uCVPs9WokiE70tPOq~~qVdOKRFz-tNRzqN1RADlV-VhGaWmL-7idby124HQH5NAEWCL~HZDmavxkLP0i2v7q3thkzAVpawF2Q4HFokx5i2IRn~f4PbtBLKtGZx~AOy9KWPlpgexIYVNasPpkJJHwze-2HryeabBrZUCmtZk1mltkjQhW09IC2hjF8MGylIgGW0QR0blTYDNu-tuZFON~z3~QS1Juz61i6~QfTCI0YPD4RGBqCOwj2~fWQnfAz5ULioX5AXLXinxM0igKhtX~O1dNmozuWmXQcLg__&Key-Pair-Id=APKAJFHNSLHYCGFYQGIA"
            const isMP4 = request.url().includes(".mp4");
            const isSubtitlesFile = request.url().includes(".srt");
            if (isMP4 || isSubtitlesFile) {
              const url = request.url();
              const shortenedURL =  url.substr(0, url.indexOf('?')); // Get up to before the key-values portion of the URL (up to the "?") ( https://stackoverflow.com/questions/9133102/how-to-grab-substring-before-a-specified-character-jquery-or-javascript )
              console.log('>>', request.method(), shortenedURL + (shortenedURL.length < url.length ? " [...]" : ""));

              // Get filename from the url
              // .*\/(.*\.mp4)\??
              var re;
              if (isMP4) re = /.*\/(.*\.mp4)/;
              else if (isSubtitlesFile) re = /.*\/(.*\.srt)/;
              const matches = url.match(re);
              if (matches != null && matches[1] != undefined) { // [0] is the match, and [1] is the first capture group ([2] is the second capture group, and so on) (demo: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Groups_and_Ranges )
                // Then we have a match
                const fname = matches[1];
                console.log("Found matching video or subtitles filename in URL:", fname);

                // Check if this file exists, and then decide whether to skip the existing download
                const fpath = path.join(destDir, fname);
                if (fs.existsSync(fpath) && skipDownloadsIfSameName) {
                  // Skip it
                  console.log("Download for", fname, "already exists, skipping");
                  await request.abort("aborted"); // "aborted - An operation was aborted (due to user action)." ( https://pptr.dev/#?product=Puppeteer&version=v9.1.1&show=api-httprequestaborterrorcode )
                  return;
                }
              }
            }
            request.continue(); // https://pptr.dev/#?product=Puppeteer&version=v9.1.1&show=api-httprequestcontinueoverrides
          })
          // videoOnlyPage.on('response', (response) => {
          //   console.log('<<', response.status(), response.url());
          // })
          
          // Click the download button, if we can find it (else, a TimeoutError is thrown and caught)
          const downloadButton = await videoOnlyPage.waitForSelector('.download-btn');
          const downloadedVideoFileName = await waitForDownload(destDir, null, async () => {
            await downloadButton.click({delay: 200});
          });

          // We made it this far with no exceptions, so now we can download the subtitles too
          await runInjectedScript();
          injected = true;
          await pressCustomDownloadChatButton(downloadedVideoFileName);
        } catch (e) {
          //throw e;
          if (e instanceof puppeteer.errors.TimeoutError) {
            // specific error

            // Download everything using the injected script
            if (!injected) { // Else, don't inject twice if we already ran the injected script since it redeclares variables and constants
              await runInjectedScript();
            }
            await pressCustomDownloadVideoButton();
            await pressCustomDownloadChatButton();
          } else {
            throw e; // let others bubble up
          }
        }
        
        // Close tabs
        await videoOnlyPage.close();
      }
      

      // Done with this video; prepare for the next iteration //

      // Go back to the list of all videos
      /*await*/ page.goBack({timeout: 0}).then(async (httpResponse) => { console.log("Finished page.goBack() in background with HTTP response:", httpResponse); }); // When going back, it hangs forever but actually does go back. So we don't "await" this promise and instead let it hang forever... might use up some CPU or memory to have the promise hanging around?

      // Click on the "Previous Meetings" button:
      await clickPreviousMeetings();
      // Recompute video list
      result = await computeVideoList();
      
      // //
    }
    
    // Go to the next page
    const nextSelector = "a.ant-pagination-next";
    await frame.waitForSelector(nextSelector);
    const nextSelectorParent = "li.ant-pagination-disabled.ant-pagination-next"; // Says if the next button is disabled, meaning we're done
    if (frame.$(nextSelectorParent) != null) {
      // Then we can't go to the next page, so we're done
      break;
    }
    // Go to the next page
    console.log("Going to the next page...");
    const next = await frame.$$(nextSelector);
    await next.click({delay: 200});
    i = 0; // Reset index
    
    // Recompute video list
    result = await computeVideoList();
  }
}
// //

// Make "global" variables, for testing in the REPL:
var browser = null;
var page = null;
var page2 = null;
var videoOnlyPage = null;
var filesInitiallyInDownloadDir = null;
var filesInDownloadDir = null;
var newFilesNotInInitialArray = null;

(async () => {
  try {
    const pathToStreamRecorderExtension = require('path').join(__dirname, streamRecorderExtensionFolderName);
    const pathToModifiedDownloadExtension = require('path').join(__dirname, modifiedDownloadExtensionFolderName); // NOTE: This modified extension doesn't seem to work -- downloads still replace existing ones (at least for the Zoom downloads) even with `conflictAction: 'uniquify'` (see bottom of `ChromeExtensions/Modified/downloads-overwrite-already-existing-files/bg.js`)
    const allExtensions = `${pathToStreamRecorderExtension},${pathToModifiedDownloadExtension}`;
    /*const*/ browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${allExtensions}`,
        `--load-extension=${allExtensions}`, // [nvm:] We will actually load the pathToModifiedDownloadExtension extension later, so we don't pass it here.
        `--whitelisted-extension-id=iogidnfllpdhagebkblkgbfijkbkjdmm`, // StreamRecorder -- https://chrome.google.com/webstore/detail/stream-recorder-download/iogidnfllpdhagebkblkgbfijkbkjdmm?hl=en
        `--whitelisted-extension-id=lddjgfpjnifpeondafidennlcfagekbp`, // downloads-overwrite-already-existing-files -- https://chrome.google.com/webstore/detail/downloads-overwrite-alrea/lddjgfpjnifpeondafidennlcfagekbp?hl=en-US
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


    //testMode = true; throw "";
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
        if (specifier.skip === true) {
          console.log("---- Skipping", specifier, "----");
          return;
        }
        console.log("---- Processing", specifier, "----");
        await page.goto(specifier.url);
        if (specifier.type == 'kaltura') {
          await runKaltura(page);
        }
        else if (specifier.type == 'zoom') {
          await runZoom(page);
        }
        else {
          throw `Invalid video list type "${specifier.type}" specified for "${specifier.url}"`;
        }
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
    ctx.page2 = page2;
    ctx.videoOnlyPage = videoOnlyPage;
    ctx.filesInitiallyInDownloadDir = filesInitiallyInDownloadDir;
    ctx.filesInDownloadDir = filesInDownloadDir;
    ctx.newFilesNotInInitialArray = newFilesNotInInitialArray;
    
    //}
  }
})();
