/*
 *  This file is part of Stream Recorder v1.3.3  <https://www.hlsloader.com/>
 *
 *  - Release Note to Chrome Web Store Team -
 *
 *  v1.3.3 : We've mainly implemented several methods to correct the misalignment of video and sound.
 *           We've also made minor changes to improve stability and performance.
 *
 *  v1.3.2 : We've made some bug fixes and parameter adjustments, but no major sequence modifications.
 *
 *  v1.3.1 : We've made small changes to improve the stability of data that doesn't comply with the MP4 specifications.
 *
 *  v1.3.0
 *   To improve stability, we've updated the version of the external library - libs/hls.js. ref) https://github.com/video-dev/hls.js/
 *   Furthermore, we've reviewed and rewritten most of the code using the latest ECMAScript coding style.
 *   There's almost no change in the functionality, but it might be cumbersome to review the code as you can't diff it from the previous version.
 *   The debugging log can be referenced by setting "localStorage.log=true" on the developer console of background/content page and may help you to understand the sequence.
 *
 *  v1.2.2
 *   Because Chrome85 blocks CORS requests in content scripts, we have fixed the affected code in this extension.
 *   Technically, We moved the cross-origin fetches to the background page.
 *   Note that the cross-origin fetches are only called by the content script of our own pages, never run on an unspecified page.
 *   Therefore, we believe it is highly unlikely that a compromised renderer process will hijack our content script.
 *   This is a quick fix, so we will be working on a more secure and faster implementation in the near future.
 *
 *  Thank you for your cooperation.
 *
 */

'use strict';
const loadOption = () => {
  const i = localStorage.option;
  let o = {counter:0, domain:{}, };
  try {
    if (i) {
      Object.assign(o, JSON.parse(i));
    }
    o.counter = Math.max(0, Math.floor(Number(o.counter) || 0));
    localStorage.option = JSON.stringify(o);
  } catch (e) {
    console.log(...logRED(e.stack));
  }
  return o;
};
const saveOption = o => {
  localStorage.option = JSON.stringify(o);
};
document.addEventListener("DOMContentLoaded", async event => {
  const button = document.getElementById("clearAllSettings");
  if (button) {
    button.addEventListener("click", () => {
      button.disabled = true;
      const o = loadOption();
      saveOption({counter:Number(o.counter)});
      setTimeout(() => {
        button.disabled = false;
      }, 3000);
    });
  }
});

