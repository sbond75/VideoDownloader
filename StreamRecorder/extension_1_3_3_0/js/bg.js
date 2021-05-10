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
const UNITS = ["B", "KB", "MB", "GB", "TB"];
const getUnit = n => {
  if (n < 1) {
    return {value:0, unitIdx:0};
  }
  const unitIdx = Math.floor(Math.log(n) / Math.log(1024));
  const value = Math.floor(10 * n / Math.pow(1024, unitIdx)) / 10;
  if (value < 1000) {
    return {value, unitIdx};
  } else {
    return {value:Math.floor(value), unitIdx};
  }
};
const fitUnit = (n, unitIdx) => {
  return Math.floor(10 * n / Math.pow(1024, unitIdx)) / 10;
};
const _tree = o => {
  const _o = [];
  o.tree(s => {
    _o.push(s);
  }, true);
  console.log(_o.join("\n"));
};
const now = () => (new Date).getTime();
const SafeStringify = (json, ignore) => {
  const cache = [];
  const filter = (key, value) => {
    if (ignore.includes(key)) {
      return "#discard";
    }
    if (key[0] === "_") {
      return "#discard";
    }
    if (typeof value === "object" && value !== null) {
      const idx = cache.indexOf(value);
      if (idx >= 0 && cache[idx] === value) {
        return "#discard";
      }
      cache.push(value);
    }
    return value;
  };
  const retVal = JSON.stringify(json, filter);
  return retVal;
};
const ilist = array => {
  return "[ " + array.map(x => {
    if (x < 1) {
      return ("" + x).padStart(8, " ");
    }
    x = "" + Math.floor((x + 0.0000001) * 100);
    const l = x.length;
    return (x.substr(0, l - 2) + "." + x.substr(l - 2, 2)).padStart(8, " ");
  }).join(" ") + " ]";
};
const ilist_int = array => {
  return "[ " + array.map(x => {
    x = x + "";
    const l = x.length;
    return x.padStart(5, " ");
  }).join(" ") + " ]";
};
const getTimeStampLabel = () => {
  const date = new Date;
  const pad = n => ("" + n).padStart(2, "0");
  return " " + date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + "_" + pad(date.getMinutes());
};
const URLUtils = {pure:url => url.match(/[^#]+/)[0], domain:url => (url.match(/https?:\/\/([^\/]+)/) || [])[1], filename:url => ((url.match(/[^\/]+$/) || [])[0] || "").match(/^[^\?&#]*/)[0], flatten:url => url.replace(/^https?:/, "").replace(/[^A-Za-z0-9]/g, "X"), };
const headersToKV = headers => {
  const r = {};
  if (headers) {
    for (const h of headers) {
      r[h.name] = h.value;
    }
  }
  return r;
};
const headersValue = (headers, name) => {
  for (const h of headers) {
    if (h.name.toLowerCase() === name) {
      return h.value.toLowerCase();
    }
  }
  return "";
};
const getLanguage = language => {
  if (language.match(/zh.CN/)) {
    return "cn";
  }
  if (language.match(/zh.TW/)) {
    return "tw";
  }
  if (language.startsWith("zh")) {
    return "cn";
  }
  if (language.match(/pt.BR/)) {
    return "br";
  }
  if (language.startsWith("pt")) {
    return "pt";
  }
  return language.substr(0, 2);
};
const headersNameToLowerCase = headers => {
  const r = [];
  for (let i = 0, len = headers.length; i < len; i++) {
    r[i] = headers[i].name.toLowerCase();
  }
  return r;
};
const logColor = tabId => {
  const _r = tabId % 64;
  return "color:#" + ((_r >> 4 & 3) << 22 | (_r >> 2 & 3) << 14 | (_r & 3) << 6 | 1048576).toString(16);
};
const logGen = (tabId, eventName, message) => {
  if (tabId) {
    return ["tabId %c" + tabId + "%c [" + eventName + "]%c " + message, logColor(tabId), "color:#f60b91", ""];
  } else {
    return ["%c%c[" + eventName + "]%c " + message, logColor(tabId), "color:#f60b91", ""];
  }
};
const logRED = message => {
  return ["%c" + message, "color:#ff0000"];
};
const createCustomHeaders = headers => {
  if (!headers) {
    return null;
  }
  let h = {};
  for (const key in headers) {
    h["LM_" + key] = headers[key] || "null";
  }
  return h;
};
const sleep = msec => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, msec);
  });
};
"use strict";
const _LOG_ = localStorage.log;
const _LOGV_ = localStorage.log === "verbose";
const TRIAL = 100;
const WebExtensions = navigator.userAgent.includes("Chrome") ? chrome : browser;
const manifest = WebExtensions.runtime.getManifest();
const i18n = WebExtensions.i18n;
const language = getLanguage(i18n.getUILanguage());
const isEdge = navigator.userAgent.includes("Edge");
const isFirefox = !isEdge && navigator.userAgent.includes("Firefox");
const isChrome = !isEdge && navigator.userAgent.includes("Chrome");
const chromeVersion = isChrome && Number((navigator.userAgent.match(/Chrome\/(\d+)/) || [])[1] || 0) || 0;
const opt_extraInfoSpec = chromeVersion < 72 ? ["blocking", "requestHeaders"] : ["blocking", "requestHeaders", "extraHeaders"];
const supportedLanguages = ["ja"];
const DISABLE_DOWNLOADING_FROM_YOUTUBE_REGEXP = /^https?:\/\/www\.youtube\.com\//;
const M3U8_URL_REGEXP = /^[^\?#]+\.m3u8(#.*|\?.*|)$/;
const SYSTEM_URL_REGEXP = /^https?:\/\/www\.hlsloader\.com\//;
const LOADER_URL = "https://www.hlsloader.com/" + (supportedLanguages.includes(language) ? language + "/" : "") + "irec.html";
const CMD_UPDATE_INDEX = "udpate_index";
const CMD_INTERCEPT_ONDATA = "intercept_ondata";
const CMD_DISCONNECT = "disconnect";
const CMD_INIT = "init";
const CMD_START_NORMAL = "start_normal";
const CMD_FETCH = "fetch";
const CMD_INTERCEPT_REQUEST = "intercept_request";
const CMD_INTERCEPT_OK = "intercept_ok";
const CMD_UPDATE_MASTER = "update_master";
const CMD_UPDATE_VIDEO = "update_video";
const CMD_UPDATE_UI = "update_ui";
const CMD_UPDATE_VIDEO_PROGRESS = "video_progress";
const CMD_SUBTITLE_PROGRESS = "subtitle_progress";
const CMD_MESSAGE = "message";
const CMD_FLUSHED = "flushed";
const CMD_RESUME = "resume";
const CMD_PAUSE = "pause";
const CMD_SAVE = "save";
const CMD_CANCEL = "cancel";
const CMD_SET_PARALLEL = "set_parallel";
const CMD_SELECT_OPTION = "select_option";
const CMD_DOWNLOAD_SUBTITLE = "download_subtitle";
const WATCH_LIFETIME = 1000 * 60;
const TAB_STATUS = {STOPPED:1, RUNNING:2};
const TAB_MODE = {NORMAL:1, GREED:2, WATCH:3, CAPTURE:4, TEST:99};
const TYPE = {ARCHIVE:1, LIVE:2};
const SOURCE_TYPE = {M3U8:1, TS:2, DASH:3, MEDIASTREAM:4, M3U8_CANDIDATE:99};
const SELECT_STATUS = {ERROR:-1, CHANGED:1, CONTINUE:2};
const QUALITY = {HIGH:"quality_high", LOW:"quality_low", CUSTOM:"quality_custom"};
const COLOR = {GREEN:{content:"#2a9441", border:"#1a8431"}, RED:{content:"#ff3030", border:"#ef2020"}};
const FLUSH_MODE = {PART:"FLUSH_PART", ALL:"FLUSH_ALL", TEST:"FLUSH_TEST"};
const PRIORITY = {SPEED:"speed", MEMORY:"memory"};
const VIDEO_STATUS = {PAUSE:1, LOADING:2, COMPLETE:3, DESTROY:4};
const ACTION_BUTTON_PARAMS = {off:{title:"action_button_off", path:"action_off_19"}, enable:{title:"action_button_enable", path:"action_enable_19"}, enable_weak:{title:"action_button_enable_weak", path:"action_enable_weak_19"}, capturing:{title:"action_button_capturing", path:"action_capturing_19"}, loader:{title:"action_button_loader", path:"action_loader_19"}, };
const loadOption = () => {
  const i = localStorage.option;
  let o = {counter:0, priority:PRIORITY.SPEED, domain:{}, };
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
const handleError = label => {
  return () => {
    if (WebExtensions.runtime.lastError) {
      if (_LOG_) {
        console.log(...logRED("[" + label + "] chrome.runtime.lastError => " + WebExtensions.runtime.lastError.message));
      }
      return true;
    }
    return false;
  };
};
const clearMemoryCache = () => {
  const onFlushed = () => {
    if (_LOG_) {
      console.log(...logGen(null, "clearMemoryCache", "In-memory cache flushed"));
    }
  };
  const onError = error => {
    if (_LOG_) {
      console.log(...logGen(null, "clearMemoryCache", "Error: " + error));
    }
  };
  const flushingCache = WebExtensions.webRequest.handlerBehaviorChanged();
  if (flushingCache) {
    flushingCache.then(onFlushed, onError).catch(onError);
  }
};
if (_LOG_) {
  console.log(...logGen(null, manifest.name, manifest.version + " start"));
}
const option = loadOption();
if (_LOG_) {
  console.log(...logGen(null, "option", JSON.stringify(option)));
}
"use strict";
const tabs = {};
const Tab = class {
  constructor(id, params) {
    const {url, parentTabId, childTabId} = params;
    this.id = id;
    this.url = url || "";
    this.parentTabId = parentTabId || null;
    this.childTabId = childTabId || null;
    this.ignoreDisconnectOnce = false;
    this.frames = {};
    this.requestHeaders = {};
    this.que = {};
    for (const k in SOURCE_TYPE) {
      this.que[SOURCE_TYPE[k]] = [];
    }
    this.actionButtonStatus = "";
    this.stat = TAB_STATUS.STOPPED;
    this.mode = TAB_MODE.NORMAL;
    this.storedBlob = {};
  }
  get isLoader() {
    return this.parentTabId;
  }
  push(type, data) {
    const curQ = this.que[type];
    if (!curQ || curQ.length >= 100) {
      return;
    }
    data.header = headersToKV(data.header);
    for (let i = 0, len = curQ.length; i < len; i++) {
      const q = curQ[i];
      if (q.url === data.url && q.referer === data.referer && JSON.stringify(q.header) === JSON.stringify(data.header)) {
        return;
      }
    }
    data.sent = false;
    curQ.push(data);
    if (this.stat === TAB_STATUS.RUNNING) {
      if (this.mode === TAB_MODE.NORMAL) {
        this.consume();
      }
    }
  }
  async consume(firstTime) {
    let que = this.que[SOURCE_TYPE.M3U8].filter(q => !q.sent);
    if (firstTime && que.length === 0) {
      que = this.que[SOURCE_TYPE.M3U8_CANDIDATE].filter(q => !q.sent);
    }
    this.sendMessage(CMD_UPDATE_INDEX, {type:SOURCE_TYPE.M3U8, que});
    que.forEach(q => {
      q.sent = true;
    });
  }
  async start(mode) {
    if (_LOG_) {
      console.log(...logGen(this.id, "Tab.start", ""));
    }
    this.stat = TAB_STATUS.RUNNING;
    this.mode = mode;
    if (this.mode === TAB_MODE.NORMAL) {
      this.consume(true);
    }
    updatePageActionButton(this.id);
  }
  stop() {
    if (_LOG_) {
      console.log(...logGen(this.id, "Tab.stop", ""));
    }
    this.stat = TAB_STATUS.STOPPED;
  }
  reset() {
    if (_LOG_) {
      console.log(...logGen(this.id, "Tab.reset", ""));
    }
    this.stat = TAB_STATUS.STOPPED;
    this.mode = TAB_MODE.NORMAL;
    this.ignoreDisconnectOnce = false;
    for (const k in this.que) {
      for (const q of this.que[k]) {
        q.sent = false;
      }
    }
    updatePageActionButton(this.id);
  }
  destroy() {
    if (_LOG_) {
      console.log(...logGen(this.id, "Tab.destroy", ""));
    }
    this.stop();
    delete tabs[this.id];
    const revokeList = Object.assign({}, this.storedBlob);
    setTimeout(() => {
      for (const url in revokeList) {
        URL.revokeObjectURL(url);
      }
    }, 3000);
  }
  revokeObjectURL(revokeList) {
    if (revokeList) {
      for (const url of revokeList) {
        URL.revokeObjectURL(url);
        delete this.storedBlob[url];
      }
    }
  }
  sendMessage(cmd, params) {
    if (_LOG_) {
      console.log(...logGen(this.id, "sendMessage", cmd));
    }
    return new Promise((resolve, reject) => {
      if (this.childTabId && this.stat === TAB_STATUS.RUNNING) {
        WebExtensions.tabs.sendMessage(this.childTabId, {cmd, params}, result => {
          if (WebExtensions.runtime.lastError) {
            console.log(...logRED("[Tab.sendMessage] chrome.runtime.lastError => " + WebExtensions.runtime.lastError.message));
          }
          resolve(result);
        });
      } else {
        resolve();
      }
    });
  }
  virtualize() {
    const id = "" + this.id;
    if (this.childTabId && tabs[this.childTabId] && !id.startsWith("virtual_")) {
      delete tabs[id];
      this.id = "virtual_for_" + this.childTabId;
      tabs[this.id] = this;
      tabs[this.childTabId].parentTabId = this.id;
      if (this.mode === TAB_MODE.CAPTURE) {
        WebExtensions.tabs.sendMessage(this.childTabId, {cmd:CMD_INTERCEPT_ONDATA, params:{url:CMD_DISCONNECT}}, handleError("tabs.sendMessage.2x"));
      }
      if (_LOG_) {
        console.log(...logGen(id, "tab.virtualize", "to " + this.id));
      }
      return true;
    }
    return false;
  }
  static create(tabId, params) {
    if (!tabId) {
      if (_LOG_) {
        console.log(...logGen(tabId, "Tab.create", "No tabID is specified, abort."));
      }
    } else {
      if (tabs[tabId]) {
        if (_LOG_) {
          console.log(...logGen(tabId, "Tab.create", tabs[tabId].url + " [ EXISTS ] , ignore"));
        }
      } else {
        tabs[tabId] = new Tab(tabId, params);
        if (_LOG_) {
          console.log(...logGen(tabId, "Tab.create", tabs[tabId].url));
        }
      }
      updatePageActionButton(tabId);
    }
  }
  static async remove(tabId) {
    const tab = tabs[tabId];
    const isLoader = tab.isLoader;
    if (tab) {
      if (!isLoader) {
        if (tab.mode === TAB_MODE.NORMAL) {
          tab.destroy();
        } else {
          if (tab.mode === TAB_MODE.CAPTURE) {
            tab.destroy();
            WebExtensions.tabs.sendMessage(tab.childTabId, {cmd:CMD_INTERCEPT_ONDATA, params:{url:CMD_DISCONNECT}}, handleError("tabs.sendMessage.2xx"));
          }
        }
      } else {
        tab.stop();
        delete tabs[tabId];
        const parentTab = tabs[tab.parentTabId];
        if (parentTab) {
          parentTab.stop();
          parentTab.reset();
          parentTab.childTabId = null;
          if ((parentTab.id + "").startsWith("virtual_")) {
            parentTab.destroy();
          }
        }
      }
      if (_LOG_) {
        console.log(...logGen(tabId, "Tab.remove", tab.url));
      }
    }
  }
  static find(tabId, type) {
    if (type === Tab.TAB_ID) {
      return tabs[tabId];
    }
    const target = ["id", "parentTabId", "childTabId"][type];
    for (const key in tabs) {
      const t = tabs[key];
      if (t[target] === tabId) {
        return t;
      }
    }
    return null;
  }
};
Object.assign(Tab, {TAB_ID:0, PARENT_ID:1, CHILD_ID:2});
WebExtensions.webRequest.onBeforeRequest.addListener(details => {
  const tabId = details.tabId;
  const url = URLUtils.pure(details.url);
  const tab = tabs[tabId];
  if (tab) {
    tab.actionButtonStatus = "";
    if (tab.url === url) {
      if (!tab.isLoader) {
        if (tab.ignoreDisconnectOnce) {
          if (_LOG_) {
            console.log(...logGen(tabId, "onBeforeRequest", "ignore reloading for intercept-loader"));
          }
          tab.ignoreDisconnectOnce = false;
        } else {
          if (tab.childTabId) {
            if (_LOG_) {
              console.log(...logGen(tabId, "onBeforeRequest", "reload, " + details.url));
            }
            tab.virtualize() || Tab.remove(tabId);
            Tab.create(tabId, {url});
          } else {
            if (_LOG_) {
              console.log(...logGen(tabId, "onBeforeRequest", "ignore reloading ( has no child ), " + details.url));
            }
          }
        }
      }
    }
  }
}, {urls:["<all_urls>"], types:["main_frame"]}, []);
WebExtensions.webRequest.onBeforeSendHeaders.addListener(details => {
  let {requestHeaders} = details;
  const {url, tabId, type, requestId} = details;
  const tab = tabs[tabId];
  if (!tab) {
    return;
  }
  if (DISABLE_DOWNLOADING_FROM_YOUTUBE_REGEXP.exec(url)) {
    return;
  }
  if (tab.isLoader) {
    if (option.counter < 30 && url.includes("pagead2")) {
      return {cancel:true};
    }
    if (type === "xmlhttprequest" && url.includes("hlsloader_promotion")) {
      return {cancel:true};
    }
    return;
  }
  if (tab) {
    if (type === "xmlhttprequest") {
      tab.requestHeaders[requestId] = requestHeaders;
    }
  }
  return {requestHeaders};
}, {urls:["<all_urls>"]}, opt_extraInfoSpec);
WebExtensions.webRequest.onBeforeSendHeaders.addListener(details => {
  const {requestHeaders} = details;
  const {url, tabId, type, requestId} = details;
  if (type === "xmlhttprequest") {
    for (let i = 0, len = requestHeaders.length; i < len; i++) {
      const h = requestHeaders[i];
      if (h.name.startsWith("LM_")) {
        requestHeaders[i] = {name:h.name.substr(3), value:h.value};
      }
    }
  }
  return {requestHeaders};
}, {urls:["<all_urls>"]}, opt_extraInfoSpec);
WebExtensions.webRequest.onHeadersReceived.addListener(details => {
  const {url, tabId, type, frameId, statusCode, responseHeaders, requestId, method} = details;
  const isOK = statusCode >= 200 && statusCode < 300;
  const tab = tabs[tabId];
  if (!tab) {
    return;
  }
  if (method === "OPTIONS") {
    return;
  }
  if (isOK && !tab.isLoader && !DISABLE_DOWNLOADING_FROM_YOUTUBE_REGEXP.exec(url)) {
    if (!tab.frames[frameId]) {
      tab.frames[frameId] = details.url;
    }
    const filename = URLUtils.filename(url);
    const contentType = headersValue(responseHeaders, "content-type");
    if (contentType.match(/(mpegurl|m3u)/) || filename.match(/(\.m3u8)/)) {
      if (_LOG_) {
        console.log(...logGen(tabId, "Found : " + contentType + ", " + details.type, url));
      }
      const referer = frameId !== 0 ? tab.frames[frameId] : tab.url;
      const header = tab.requestHeaders[requestId];
      tab.push(SOURCE_TYPE.M3U8, {url, contentType, referer, header});
      updatePageActionButton(tabId);
    } else {
      if (type === "xmlhttprequest" && url.match(/[\.\/](m3u|hls)/)) {
        if (!filename.match(/\.(js|json|html)$/)) {
          if (tab.que[SOURCE_TYPE.M3U8].length === 0) {
            const contentLength = Number(headersValue(responseHeaders, "content-length"));
            if (contentLength < 1048576) {
              const header = tab.requestHeaders[requestId];
              const referer = frameId !== 0 ? tab.frames[frameId] : tab.url;
              tab.push(SOURCE_TYPE.M3U8_CANDIDATE, {url, contentType:"application/x-mpegURL", referer, header});
              updatePageActionButton(tabId);
            }
          }
        }
      }
    }
  }
  delete tab.requestHeaders[requestId];
}, {urls:["<all_urls>"]}, ["responseHeaders", "blocking"]);
WebExtensions.tabs.onUpdated.addListener((tabId, change, tab) => {
  handleError("tabs.onUpdated");
  if (change.status === "loading") {
    const url = URLUtils.pure(tab.url);
    const T = tabs[tabId];
    if (T) {
      if (T.isLoader) {
        if (url.includes(LOADER_URL)) {
          if (_LOG_) {
            console.log(...logGen(tabId, "tabs.onUpdated", "LoaderTab [ reloading ] , ignore"));
          }
          const parentTab = tabs[T.parentTabId];
          if (parentTab) {
            parentTab.stop();
            parentTab.reset();
          }
        } else {
          if (_LOG_) {
            console.log(...logGen(tabId, "tabs.onUpdated", url + " [ moved ]"));
          }
          Tab.remove(tabId);
          Tab.create(tabId, {url});
        }
      } else {
        if (T.url === url) {
        } else {
          if (_LOG_) {
            console.log(...logGen(tabId, "tabs.onUpdated", url + " [ moved ]"));
          }
          T.virtualize() || Tab.remove(tabId);
          Tab.create(tabId, {url});
        }
      }
      updatePageActionButton(tabId);
    } else {
      if (_LOG_) {
        console.log(...logGen(tabId, "onBeforeRequest", url + " [ new ]"));
      }
      Tab.create(tabId, {url});
    }
  }
});
WebExtensions.tabs.onRemoved.addListener(tabId => {
  const tab = tabs[tabId];
  if (_LOG_) {
    console.log(...logGen(tabId, "tabs.onRemoved", tab?.url || "none"));
  }
  if (tab) {
    tab.virtualize() || Tab.remove(tabId);
  }
});
WebExtensions.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const {cmd, params} = message;
  const senderTabId = sender.tab?.id;
  if (cmd === CMD_INTERCEPT_ONDATA) {
    const tab = tabs[senderTabId];
    if (tab) {
      const {targetId} = params;
      const loaderTab = tabs[targetId];
      if (loaderTab && loaderTab.parentTabId === senderTabId) {
        WebExtensions.tabs.sendMessage(targetId, {cmd, params}, handleError("tabs.sendMessage.2"));
      }
    }
    return sendResponse();
  }
  if (_LOG_) {
    if (cmd !== CMD_FETCH) {
      console.log(...logGen(senderTabId, "onMessage", JSON.stringify(message).substr(0, 100)));
    }
  }
  const tab = Tab.find(senderTabId, Tab.CHILD_ID);
  if (!tab) {
    return sendResponse({error:"no related tabs found"});
  }
  if (cmd === CMD_INIT) {
    const id = senderTabId;
    const parentTabId = tab.id;
    const counter = option.counter;
    if (tab.title) {
      return sendResponse({id, parentTabId, url:tab.url, title:tab.title, counter});
    } else {
      if (("" + tab.id).startsWith("virtual_")) {
        return sendResponse({id, parentTabId, url:tab.url, title:"video title - none", counter});
      } else {
        WebExtensions.tabs.get(tab.id, _t => {
          tab.title = _t.title;
          return sendResponse({id, parentTabId, url:tab.url, title:tab.title, counter});
        });
        return true;
      }
    }
  } else {
    if (cmd === CMD_START_NORMAL) {
      tab.start(TAB_MODE.NORMAL);
      return sendResponse();
    } else {
      if (cmd === CMD_FETCH) {
        const {url, method, headers, timeout, revokeList} = params;
        tab.revokeObjectURL(revokeList);
        const init = {method:method ? method : "GET", mode:"cors", credentials:"include", headers};
        fetch(url, init).then(response => {
          if (response.ok) {
            return response.blob();
          } else {
            sendResponse({ok:false, message:"fetch error, may be 403 or 429"});
          }
        }).then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          tab.storedBlob[blobUrl] = 1;
          sendResponse({ok:true, blobUrl});
        }).catch(error => {
          sendResponse({ok:false, message:error.messsage});
        });
        return true;
      } else {
        if (cmd === CMD_INTERCEPT_REQUEST) {
          if (tab && !("" + tab.id).startsWith("virtual_")) {
            tab.ignoreDisconnectOnce = true;
            setTimeout(() => {
              delete tab.ignoreDisconnectOnce;
            }, 3000);
            WebExtensions.tabs.update(tab.id, {active:true}, handleError("tabs.update.at.CMD_INTERCEPT_REQUEST"));
            const code = "localStorage._intercept_mediastream_=" + senderTabId + ";location.reload();";
            WebExtensions.tabs.executeScript(tab.id, {code, allFrames:true}, handleError("tabs.executeScript.on.CMD_INTERCEPT_REQUEST"));
            tab.start(TAB_MODE.CAPTURE);
            return sendResponse(true);
          }
          return sendResponse(false);
        } else {
          if (cmd === CMD_INTERCEPT_OK) {
            delete tab.ignoreDisconnectOnce;
            const code = "delete localStorage._intercept_mediastream_;";
            WebExtensions.tabs.executeScript(tab.id, {code, allFrames:true}, handleError("tabs.executeScript.on.CMD_INTERCEPT_OK"));
          }
        }
      }
    }
  }
  sendResponse();
});
WebExtensions.browserAction.onClicked.addListener(tabObject => {
  if (_LOG_) {
    console.log(...logGen(tabObject.id, "browserAction.onClicked", ""));
  }
  const tabId = tabObject.id;
  const tabIndex = tabObject.index;
  const tab = tabs[tabId];
  if (!tab) {
    return;
  }
  const url = tab.url;
  if (!url.startsWith("http")) {
    return;
  }
  if (tab.isLoader) {
    return;
  }
  if (DISABLE_DOWNLOADING_FROM_YOUTUBE_REGEXP.exec(url)) {
    return;
  }
  if (tab.childTabId) {
    WebExtensions.tabs.update(tab.childTabId, {active:true}, handleError("tabs.update.1"));
  } else {
    const protocol = "";
    WebExtensions.tabs.create({url:protocol + LOADER_URL, index:tabIndex + 1, active:true}, newTab => {
      if (!handleError("tabs.create")()) {
        const newUrl = newTab.url || newTab.pendingUrl;
        if (_LOG_) {
          console.log(...logGen(newTab.id, "browserAction.onClicked->tabs.create", "new loader tab " + newUrl));
        }
        Tab.create(newTab.id, {url:newUrl, parentTabId:tabId});
        tab.childTabId = newTab.id;
        option.counter++;
        saveOption(option);
      }
    });
  }
});
const updatePageActionButton = tabId => {
  if ((tabId + "").startsWith("virtual")) {
    return;
  }
  const tab = tabs[tabId];
  const stat = !tab || tab.isLoader ? "loader" : tab.mode === TAB_MODE.CAPTURE ? "capturing" : tab.que[SOURCE_TYPE.M3U8].length ? "enable" : tab.que[SOURCE_TYPE.M3U8_CANDIDATE].length ? "enable_weak" : "off";
  if (stat === tab.actionButtonStatus) {
    return;
  }
  if (_LOG_) {
    console.log(...logGen(tabId, "updatePageActionButton", stat));
  }
  const params = ACTION_BUTTON_PARAMS[stat];
  const title = i18n.getMessage(params.title);
  const path = "images/" + params.path + ".png";
  const actionButton = WebExtensions.browserAction;
  actionButton.setTitle({title, tabId});
  actionButton.setIcon({path, tabId});
  tab.actionButtonStatus = stat;
};

