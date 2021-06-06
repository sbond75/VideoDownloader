// Taken from zoom-download/injectedScript.js which is from https://github.com/jstrieb/zoom-download
// This script is intended to be evaluated within the browser, not nodejs.

const URL = window.__data__.viewMp4Url;
const fileSize = window.__data__.fileSize;
const chats = window.__data__.chatList;
const topic = window.__data__.topic;


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
  subLink.href = `data:text/plain,${output}`;
}


function insertButtons() {
  // Remove the old download button, if it exists
  document.querySelectorAll(".download").forEach((b) => b.remove());

  // Set a file title by parsing the date from the URL
  var dateRegex;
  var dateMatch;
  var date;
  var title;
  try {
    dateRegex = /ssrweb.zoom.us\/[^\/]*\/replay\/(\d+)\/(\d+)\/(\d+)/;
    dateMatch = URL.match(dateRegex, URL);
    date = dateMatch[1] + dateMatch[2] + dateMatch[3];
  }
  catch (e) {
    if (e instanceof TypeError) {
      // specific error

      // Try a different regex
      dateRegex = /:\/\/ssrweb.zoom.us\/?[^\/]*\/replay\d+?\/(\d+)\/(\d+)\/(\d+)/; ///:\/\/ssrweb.zoom.us\/replay\/(\d+)\/(\d+)\/(\d+)/; ///ssrweb.zoom.us\/[^\/]*\/replay\/(\d+)\/(\d+)\/(\d+)/; // Matches something like `https://ssrweb.zoom.us/replay03/2021/04/29/74A106D2-400A-41DE-805C-575236956447/GMT20210429-143543_Recording_640x360.mp4?response-content-type=video%2Fmp4&response-cache-control=max-age%3D0%2Cs-maxage%3D86400&data=1c5b6542876f31472e7e50503546110bd9661802c09014b49b63a1848a346fb8&s001=yes&cid=aw1&fid=Rb08wbUnjf7Cb3fkk8iXHD_WpCtVUVm-dXHbdDDNkSpf9x6U5xUEkRFBRiDsm2EUw3HQWFydodRQBaF2.D0bvFvs45Rx_Ri_4&s002=E0jFAiER_687_cIUA3pAXVgKplfheHGTB8NaUg30zBk6q-wU0lY9Y8HPsw.GDsxktyCdDWm3bxk&Policy=eyJTdGF0ZW1lbnQiOiBbeyJSZXNvdXJjZSI6Imh0dHBzOi8vc3Nyd2ViLnpvb20udXMvcmVwbGF5MDMvMjAyMS8wNC8yOS83NEExMDZEMi00MDBBLTQxREUtODA1Qy01NzUyMzY5NTY0NDcvR01UMjAyMTA0MjktMTQzNTQzX1JlY29yZGluZ182NDB4MzYwLm1wND9yZXNwb25zZS1jb250ZW50LXR5cGU9dmlkZW8lMkZtcDQmcmVzcG9uc2UtY2FjaGUtY29udHJvbD1tYXgtYWdlJTNEMCUyQ3MtbWF4YWdlJTNEODY0MDAmZGF0YT0xYzViNjU0Mjg3NmYzMTQ3MmU3ZTUwNTAzNTQ2MTEwYmQ5NjYxODAyYzA5MDE0YjQ5YjYzYTE4NDhhMzQ2ZmI4JnMwMDE9eWVzJmNpZD1hdzEmZmlkPVJiMDh3YlVuamY3Q2IzZmtrOGlYSERfV3BDdFZVVm0tZFhIYmRERE5rU3BmOXg2VTV4VUVrUkZCUmlEc20yRVV3M0hRV0Z5ZG9kUlFCYUYyLkQwYnZGdnM0NVJ4X1JpXzQmczAwMj1FMGpGQWlFUl82ODdfY0lVQTNwQVhWZ0twbGZoZUhHVEI4TmFVZzMwekJrNnEtd1UwbFk5WThIUHN3LkdEc3hrdHlDZERXbTNieGsiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE2MjE5ODI1ODB9fX1dfQ__&Signature=aJK5k5-sT9xHojKQ7k9M8hY4P8xvtS3mvdeNFmVXL5YMsLGE0in6HX6irzrYIXU5kcSBpF2XSI4pHeSkRpwDnP0CoLbuiGzjSOHLyxR5XoK2jnK9UuAUxirtnNisUBab72hll-gmB06duDLw7xdxouR~h4lVU587R4ODOnkGROyFWSW19bzYqItmd1ZhqXQ~7ygKdEE~7vnyEJX0HbvcQ1s4LONdT9jTNZxOyQN7rAfoCc4RkTmEZqKQNz7zrAgtio0qvj7EXXpO8jKovRq1VflCbHHbcwEPNAhIwpPOMfmxSqhsJv8eK11Yd5Yn7yFZw0Crz4Uy9eqL1QkHaveVdg__&Key-Pair-Id=APKAJFHNSLHYCGFYQGIA`
      dateMatch = URL.match(dateRegex, URL);
      console.log(dateMatch);
      date = dateMatch[1] + dateMatch[2] + dateMatch[3];
      console.log(date);
    } else {
      throw e; // let others bubble up
    }
  }
  // Get Unix time of the video (example: 1619706943000 is `Thursday, April 29, 2021 2:35:43 GMT` PM but in my time zone it is: `Thursday, April 29, 2021 9:35:43 AM GMT-05:00 DST` ( https://www.epochconverter.com/ ). This GMT time seems to be used in determining the filename when downloaded with Zoom's own download button instead of ours in this file, but we recreate that a bit here by adding the time, since multiple videos on the same day likely have unique filenames... but see the below fixme.
  // FIXME: possibly not an issue: (issue if they are the same second.. but in one Zoom meeting area that shouldn't happen?!). We could always add the `window.__data__.recordingId` onto it if that happens I guess. For example: `meetingId: 'dKEG0kAKQd6AXFdSNpVkRw%3D%3D', recordingId: 'eb3a8e09-866c-4a2c-a7b8-96b26172e50d'` are in the JSON within JavaScript in the html of the Zoom video pages, under this element: `<script nonce="">`
  // https://stackoverflow.com/questions/847185/convert-a-unix-timestamp-to-time-in-javascript //
  let unix_timestamp = window.__data__.fileStartTime; // Demo: 1549312452
  // Create a new JavaScript Date object based on the timestamp
  // multiplied by 1000 so that the argument is in milliseconds, not seconds.
  var date = new Date(unix_timestamp * 1000);
  // // Hours part from the timestamp
  // var hours = date.getHours();
  // // Minutes part from the timestamp
  // var minutes = "0" + date.getMinutes();
  // // Seconds part from the timestamp
  // var seconds = "0" + date.getSeconds();

  // // Will display time in 10:30:23 format
  // var formattedTime = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);

  //console.log(formattedTime);

  // https://www.codegrepper.com/code-examples/javascript/js+get+current+time+24+hours , https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleTimeString
  const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'GMT' }); // Get 24-hour time. For date too, do toLocaleString with the same args.
  // //
  title = topic + "_" + date + "_" + time.replaceAll(':', '');
  //const title = "%PLACEHOLDER_TITLE%"; // Hack: placeholder to be inserted via VideoDownloader code
  
  // Add a subtitles button to the page
  const headerRow = document.querySelector(".r-header-row");
  headerRow.insertAdjacentHTML("beforeend", `
<a id="subtitleButton" href="">
<div class="btn"><i class="zm-icon-download mgr-xs"></i>Download Chat</div>
</a>
`);
  const subLink = document.querySelector("#subtitleButton");
  subLink.download = `${title}.srt`;
  toSubRip(subLink);

  // Add the download button to the page
  // NOTE: Indentation reduced so it injects with proper spacing
  headerRow.insertAdjacentHTML("beforeend", `
<div id="btn" class="btn"><i class="zm-icon-download mgr-xs"></i>Download Video (${fileSize})</div>
<div class="modal-wrapper">
  <div class="modal">
    <div class="close-button">&times;</div>
    <ol>
      <li>Right click <a id="videoLink" href="javascript:;">this link</a></li>
      <li>Choose "Save link as..."</li>
      <li>The video will download</li>
    </ol>
  </div>
</div>
`);

  const modalWrapper = document.querySelector(".modal-wrapper");

  // Display download instructions with valid download URL (in modal)
  document.querySelector("#btn").addEventListener("click", () => {
    modalWrapper.style.display = "flex";
    // TODO: Figure out why this ugly setTimeout hack is necessary
    setTimeout(() => modalWrapper.style.opacity = 1, 10);

    const videoLink = document.querySelector("#videoLink");
    videoLink.href = URL;
    videoLink.download = `${title}.mp4`;
  });

  // Handle closing the modal
  document.querySelector(".close-button").addEventListener("click", () => {
    modalWrapper.style.opacity = 0;
    setTimeout(() => modalWrapper.style.display = "none", 400);
  });
  modalWrapper.addEventListener("click", () => {
    modalWrapper.style.opacity = 0;
    setTimeout(() => modalWrapper.style.display = "none", 400);
  });
}

// Either add the button, or set it to be added when the document loads
if (document.readyState == "complete" || document.readyState == "interactive") {
  insertButtons();
} else {
  document.body.addEventListener("load", insertButtons);
}
