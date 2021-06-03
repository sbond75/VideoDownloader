 page.waitForSelector('iframe.d2l-iframe').then(async (value) => {
 var v = await value.contentFrame();
  console.log(v);
});

 page.waitForSelector('iframe.d2l-iframe').then(async (value) => {
 var v = await value.contentFrame();
  console.log(v);
});

browser.pages().then(async (value) => {
  //var v = await value[1].title();
  console.log(value);
  v = value;
});

v[2].title().then(async (value) => {
    console.log(value);
});

v[2].$( 'a.icon-play').then(async (value) => {
    console.log(value);
});

browser.userAgent().then(async (value) => {
  console.log(value);
});

browser.pages().then(async (pages) => {
    pages[1].waitForSelector('#kplayer_ifp', {timeout:100}).then(async (value) => {
	    console.log(value);
	});
});

browser.pages().then(async (pages) => {
    pages[1].waitForSelector('iframe[name="kplayer_ifp"]', {timeout:100}).then(async (value) => {
	    console.log(value);
	});
});

browser.pages().then(async (pages) => {
    pages[1].waitForSelector('#pageTop', {timeout:100}).then(async (value) => {
	    console.log(value);
	});
});

browser.pages().then(async (pages) => {
    pages[2].waitForSelector('#kplayer_ifp', {timeout:100}).then(async (value) => {
	    console.log(value);
	});
});

browser.pages().then(async (pages) => {
    console.log(await pages[2].title())
});

browser.pages().then(async (pages) => {
    console.log(await pages[3].title())
});

typeof(String)
const puppeteer = require('puppeteer');
typeof(puppeteer.errors.TimeoutError)

page2.title().then(async (value) => {
    console.log(value)
});

videoOnlyPage.title().then(async (value) => {
    console.log("title:", value)
});

videoOnlyPage.title().then(async (value) => {
    console.log("title:", value);
    const videosource = await videoOnlyPage.waitForSelector('video>source');
    const videosourceSrc = await (await videosource.getProperty('src')).jsonValue();
    console.log(videosourceSrc);
});

videoOnlyPage.content().then(async (value) => {
    console.log("content:", value);
});

let x = filesInDownloadDir;
let y = filesInitiallyInDownloadDir;
x.filter( function( el ) {
    return y.indexOf( el ) < 0;
});

// zoom-download testing //

// Parse a poorly-formatted chat message time into a time valid for use in SRT
// subtitle files
function parseStartTime(rawTime) {
  const reg = /(\d+):(\d+)(:(\d+))?/;
  const match = rawTime.match(reg);
  // Whether or not the "hour" value is specified
  if (match[4] == undefined) {
    return `00:${match[1]}:${match[2]},000`;
  } else {
    return `${match[1]}:${match[2]}:${match[4]},000`;
  }
}


// Calculate the end time for a subtitle based on the start time and message
// length using a very simple formula. Most of the logic here is making sure to
// handle overflows from seconds -> minutes -> hours correctly.
function calculateEndTime(startTime, message) {
  const reg = /(\d+):(\d+):(\d+),000/;
  const match = startTime.match(reg);
  let addTime = 5 + (0.2 * message.length);
  let seconds = parseInt(match[3]) + addTime;
  let minutes = Math.floor(parseInt(match[2]) + Math.floor(seconds / 60));
  seconds %= 60;
  let millis = Math.floor((seconds % 1) * 100);
  seconds = Math.floor(seconds)
  let hours = Math.floor(parseInt(match[1]) + Math.floor(minutes / 60));
  minutes %= 60;
  return `${hours}:${minutes}:${seconds},${millis}`;
}


// Process chat message objects into valid subtitle file for downloaded video
function toSubRip(subLink) {
  // Build up an output in SRT format
  output = "";
  for (let i=0; i < chats.length; i++) {
    let chat = chats[i];
    let message = chat.content;
    let startTime = parseStartTime(chat.time);
    let endTime = calculateEndTime(startTime, message);
    let sender = chat.username;
    output += `
${i + 1}
${startTime} --> ${endTime}
${sender}: ${message}
`;
  }

  // Set the SRT to download when the button is clicked
  //subLink.href = `data:text/plain,${output}`;
  return output;
}

// //

// ffmpeg test: to see if there are subtitles in the mp4's. ( https://trac.ffmpeg.org/wiki/ExtractSubtitles : {"
/*
FFmpeg can "read" and/or "extract" subtitles from embedded subtitle tracks.

For instance, if you run ffmpeg -i <my_file> and you see something like:

    Stream #0:2: Subtitle: ssa (default)
or

    Stream #0:2[0x909](eng): Subtitle: dvb_teletext ([6][0][0][0] / 0x0006), 492x250
You can extract or convert those subtitles. To convert to srt from dvb_teletext.

ffmpeg -txt_format text -i input_file out.srt
Your FFmpeg needs to be configured with --enable-libzvbi for this to work, and results in something like this:

  Stream #0:17 -> #3:0 (dvb_teletext (libzvbi_teletextdec) -> subrip (srt))
vbi teletext is a format specification that allows for including text (characters) and a few basic images as metadata between video frames of a broadcast.
*/
// "} ) //

/*

$ ffmpeg -i /Volumes/Seagate/Downloads/TestingJunk/GMT20210429-143543_Recording_640x360.mp4 
ffmpeg version 4.4 Copyright (c) 2000-2021 the FFmpeg developers
  built with Apple clang version 12.0.0 (clang-1200.0.32.29)
  configuration: --prefix=/usr/local/Cellar/ffmpeg/4.4_1 --enable-shared --enable-pthreads --enable-version3 --enable-avresample --cc=clang --host-cflags= --host-ldflags= --enable-ffplay --enable-gnutls --enable-gpl --enable-libaom --enable-libbluray --enable-libdav1d --enable-libmp3lame --enable-libopus --enable-librav1e --enable-librubberband --enable-libsnappy --enable-libsrt --enable-libtesseract --enable-libtheora --enable-libvidstab --enable-libvorbis --enable-libvpx --enable-libwebp --enable-libx264 --enable-libx265 --enable-libxml2 --enable-libxvid --enable-lzma --enable-libfontconfig --enable-libfreetype --enable-frei0r --enable-libass --enable-libopencore-amrnb --enable-libopencore-amrwb --enable-libopenjpeg --enable-libspeex --enable-libsoxr --enable-libzmq --enable-libzimg --disable-libjack --disable-indev=jack --enable-videotoolbox
  libavutil      56. 70.100 / 56. 70.100
  libavcodec     58.134.100 / 58.134.100
  libavformat    58. 76.100 / 58. 76.100
  libavdevice    58. 13.100 / 58. 13.100
  libavfilter     7.110.100 /  7.110.100
  libavresample   4.  0.  0 /  4.  0.  0
  libswscale      5.  9.100 /  5.  9.100
  libswresample   3.  9.100 /  3.  9.100
  libpostproc    55.  9.100 / 55.  9.100
Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '/Volumes/Seagate/Downloads/TestingJunk/GMT20210429-143543_Recording_640x360.mp4':
  Metadata:
    major_brand     : mp42
    minor_version   : 0
    compatible_brands: isommp42
    creation_time   : 2021-04-29T14:35:43.000000Z
  Duration: 00:03:37.28, start: 0.000000, bitrate: 222 kb/s
  Chapters:
    Chapter #0:0: start 0.000000, end 217.280000
      Metadata:
        title           : Recording Started
  Stream #0:0(und): Audio: aac (LC) (mp4a / 0x6134706D), 32000 Hz, mono, fltp, 126 kb/s (default)
    Metadata:
      creation_time   : 2021-04-29T14:35:43.000000Z
      handler_name    : AAC audio
      vendor_id       : [0][0][0][0]
  Stream #0:1(und): Video: h264 (High) (avc1 / 0x31637661), yuv420p, 640x360, 94 kb/s, 25 fps, 25 tbr, 30k tbn, 60k tbc (default)
    Metadata:
      creation_time   : 2021-04-29T14:35:43.000000Z
      handler_name    : H.264/AVC video
      vendor_id       : [0][0][0][0]
      encoder         : AVC Coding
  Stream #0:2(und): Data: bin_data (text / 0x74786574), 0 kb/s
    Metadata:
      creation_time   : 2021-04-29T14:35:43.000000Z
      handler_name    : Text
At least one output file must be specified

*/

// //

// Zoom testing //

// https://ssrweb.zoom.us/replay03/2021/04/29/74A106D2-400A-41DE-805C-575236956447/GMT20210429-143543_Recording_640x360.mp4?response-content-type=video%2Fmp4&response-cache-control=max-age%3D0%2Cs-maxage%3D86400&data=1c5b6542876f31472e7e50503546110bd9661802c09014b49b63a1848a346fb8&s001=yes&cid=aw1&fid=a4nQkUP6vaEtd2Q-RzPrQEiCU8ZXkO-jjWDnqovehRamotAR4mv46yYE7To_lmyvC56mPs6XAtYaF9KX.4bD3Zqvv1exvk-j4&s002=WyKuCNu_hmfeB7zZKzfaeuU_vaOlcZ_vv3ObawYShJnjbA_xc4DKRAFIkQ.X-sMEK8k1NO6IpkO&Policy=eyJTdGF0ZW1lbnQiOiBbeyJSZXNvdXJjZSI6Imh0dHBzOi8vc3Nyd2ViLnpvb20udXMvcmVwbGF5MDMvMjAyMS8wNC8yOS83NEExMDZEMi00MDBBLTQxREUtODA1Qy01NzUyMzY5NTY0NDcvR01UMjAyMTA0MjktMTQzNTQzX1JlY29yZGluZ182NDB4MzYwLm1wND9yZXNwb25zZS1jb250ZW50LXR5cGU9dmlkZW8lMkZtcDQmcmVzcG9uc2UtY2FjaGUtY29udHJvbD1tYXgtYWdlJTNEMCUyQ3MtbWF4YWdlJTNEODY0MDAmZGF0YT0xYzViNjU0Mjg3NmYzMTQ3MmU3ZTUwNTAzNTQ2MTEwYmQ5NjYxODAyYzA5MDE0YjQ5YjYzYTE4NDhhMzQ2ZmI4JnMwMDE9eWVzJmNpZD1hdzEmZmlkPWE0blFrVVA2dmFFdGQyUS1SelByUUVpQ1U4WlhrTy1qaldEbnFvdmVoUmFtb3RBUjRtdjQ2eVlFN1RvX2xteXZDNTZtUHM2WEF0WWFGOUtYLjRiRDNacXZ2MWV4dmstajQmczAwMj1XeUt1Q051X2htZmVCN3paS3pmYWV1VV92YU9sY1pfdnYzT2Jhd1lTaEpuamJBX3hjNERLUkFGSWtRLlgtc01FSzhrMU5PNklwa08iLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE2MjE5NzQ0Mzl9fX1dfQ__&Signature=cwhIzyPct5tE37C2KcltK0mQBLWMS4P1-jqKA33XwtONkKL0oJ9Gy~V91DSZehJRc2NuGAr1u94cijDlc2pKox0qDdFEmZnRgCxFEypMFIQ0aa~DJHRxZgkn7Kjf90j8AVa8lD3THdJaPO65D9IcbmSGEwFE090f0Vh0xc42KgSwteIGf0Zwl~S-kTyabRG2xY8nYnvAcjbLOUKKRYxEBOZH92eqJSM7-AZ2-dLZe5EFUx6Se9dI1-nAz5tE9WMr0ykgFUp6PmNCdJYgCkqwCf70VyeRr6K6zvNMxT9bDON5fgWGPSa5XP2FSjha~hKf6Wl0Gyg0LLFQQ~xHpYIaCA__&Key-Pair-Id=APKAJFHNSLHYCGFYQGIA

/*

First, try clicking "Download" button. If this fails, run injectedScript.js from zoom-download to re-create the download button and then click it. Either way, download subtitles using zoom-download's `toSubRip` function.

*/

// //

var getD2LIFrame = async function(page) {
    // Wait for the results page to load and display the results.
    const sel = "iframe.d2l-iframe";
    const frameHandle = await page.waitForSelector(sel); //await page.$(sel); //page.$("iframe[id='frame1']"); // https://chercher.tech/puppeteer/iframes-puppeteer
    assert(frameHandle != null);
    const frame = await frameHandle.contentFrame();
    assert(frame != null);
    
    return frame;
}
getD2LIFrame(page).then(async (frame) => {
    const button = await frame.waitForXPath("//div[contains(text(), 'Previous Meetings')]");
    console.log(button);
});

browser.pages().then(async (pages) => {
    console.log(await pages[0].title());
    await pages[0].evaluate(`console.log(chrome); chrome.downloads.onDeterminingFilename.addListener(function (item, suggest) {
	suggest({filename: '..', conflictAction: 'overwrite'});
});`);
});

browser.pages().then(async (pages) => {
    await page.evaluate(`
            function getElementByXpath(path) {
              return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            }

            subLink = getElementByXpath("//*[text()[contains(., 'Download Chat')]]").parentNode; // Escape double quotes from the string
console.log(subLink);
         `);
});

// the subtitles have the same name because they have the same generated name from zoom-download-modded.js !
// zoom download video button doesn't work normally if you press it in another video so that isnt from my script!
// Filenames should be different each time from Zoom, assuming zoom doesn't change things suddenly. To prevent any possible issues, we could use a Set of strings that are video filenames that were previously downloaded, and serialize this to a sqlite database or something like that, and reload it...
