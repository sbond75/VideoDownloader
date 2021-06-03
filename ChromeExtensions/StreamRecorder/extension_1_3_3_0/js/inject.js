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
(async() => {
  let targetId = null;
  try {
    targetId = Number(localStorage._intercept_mediastream_);
  } catch (e) {
  }
  if (!targetId) {
    return;
  }
  setTimeout(() => {
    delete localStorage._intercept_mediastream_;
  }, 10 * 1000);
  const WebExtensions = navigator.userAgent.includes("Chrome") ? chrome : browser;
  const eeid = "_intercepter_";
  const transposer = document.createElement("div");
  transposer.id = eeid;
  transposer.addEventListener("click", evt => {
    const params = {targetId};
    for (const name of transposer.getAttributeNames()) {
      params[name] = transposer.getAttribute(name);
    }
    try {
      WebExtensions.runtime.sendMessage({cmd:"intercept_ondata", params});
    } catch (e) {
    }
  });
  document.documentElement.appendChild(transposer);
  const _s = "(" + (() => {
    const transposer = document.querySelector("#_intercepter_");
    if (!transposer) {
      return;
    }
    const transpose = params => {
      for (const key in params) {
        transposer.setAttribute(key, params[key]);
      }
      transposer.click();
    };
    const now = () => {
      return (new Date).getTime();
    };
    const mediasource = MediaSource;
    MediaSource = class extends mediasource {
      constructor() {
        super(arguments);
        this._mediaSourceId = Math.floor(Math.random() * 10000000000);
      }
      addSourceBuffer(mimeType) {
        const sourceBuffer = super.addSourceBuffer.apply(this, arguments);
        const appendBuffer = sourceBuffer.appendBuffer;
        sourceBuffer._bufferId = Math.floor(Math.random() * 10000000000);
        const _self = this;
        sourceBuffer.appendBuffer = function(buffer) {
          if (buffer.length || buffer.byteLength) {
            const a = new Blob([buffer]);
            const url = URL.createObjectURL(a);
            transpose({url, mimeType, mediaSourceId:_self._mediaSourceId, bufferId:this._bufferId, timestamp:now()});
            setTimeout(() => {
              URL.revokeObjectURL(url);
            }, 60 * 1000);
          }
          appendBuffer.apply(this, arguments);
        };
        sourceBuffer.addEventListener("abort", () => {
          transpose({url:"abort", mimeType:"", mediaSourceId:_self._mediaSourceId, bufferId:this._bufferId, timestamp:now()});
        });
        return sourceBuffer;
      }
    };
  }).toString() + ")();";
  const s = document.createElement("script");
  s.innerText = _s;
  setTimeout(() => {
    document.head.appendChild(s);
  }, 0);
})();

