/*

https://github.com/video-dev/hls.js/
Version : 0.14.10

Copyright (c) 2017 Dailymotion (http://www.dailymotion.com)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

src/remux/mp4-generator.js and src/demux/exp-golomb.js implementation in this project
are derived from the HLS library for video.js (https://github.com/videojs/videojs-contrib-hls)

That work is also covered by the Apache 2 License, following copyright:
Copyright (c) 2013-2015 Brightcove


THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
((_ex_)=>{
const logger = { log:()=>{} , error:()=>{} , warn:()=>{} , debug:()=>{} , trace:()=>{} };
/**
 * @readonly
 * @enum {string}
 */
const HlsEvents = {
  // fired before MediaSource is attaching to media element - data: { media }
  MEDIA_ATTACHING: 'hlsMediaAttaching',
  // fired when MediaSource has been succesfully attached to media element - data: { }
  MEDIA_ATTACHED: 'hlsMediaAttached',
  // fired before detaching MediaSource from media element - data: { }
  MEDIA_DETACHING: 'hlsMediaDetaching',
  // fired when MediaSource has been detached from media element - data: { }
  MEDIA_DETACHED: 'hlsMediaDetached',
  // fired when we buffer is going to be reset - data: { }
  BUFFER_RESET: 'hlsBufferReset',
  // fired when we know about the codecs that we need buffers for to push into - data: {tracks : { container, codec, levelCodec, initSegment, metadata }}
  BUFFER_CODECS: 'hlsBufferCodecs',
  // fired when sourcebuffers have been created - data: { tracks : tracks }
  BUFFER_CREATED: 'hlsBufferCreated',
  // fired when we append a segment to the buffer - data: { segment: segment object }
  BUFFER_APPENDING: 'hlsBufferAppending',
  // fired when we are done with appending a media segment to the buffer - data : { parent : segment parent that triggered BUFFER_APPENDING, pending : nb of segments waiting for appending for this segment parent}
  BUFFER_APPENDED: 'hlsBufferAppended',
  // fired when the stream is finished and we want to notify the media buffer that there will be no more data - data: { }
  BUFFER_EOS: 'hlsBufferEos',
  // fired when the media buffer should be flushed - data { startOffset, endOffset }
  BUFFER_FLUSHING: 'hlsBufferFlushing',
  // fired when the media buffer has been flushed - data: { }
  BUFFER_FLUSHED: 'hlsBufferFlushed',
  // fired to signal that a manifest loading starts - data: { url : manifestURL}
  MANIFEST_LOADING: 'hlsManifestLoading',
  // fired after manifest has been loaded - data: { levels : [available quality levels], audioTracks : [ available audio tracks], url : manifestURL, stats : { trequest, tfirst, tload, mtime}}
  MANIFEST_LOADED: 'hlsManifestLoaded',
  // fired after manifest has been parsed - data: { levels : [available quality levels], firstLevel : index of first quality level appearing in Manifest}
  MANIFEST_PARSED: 'hlsManifestParsed',
  // fired when a level switch is requested - data: { level : id of new level }
  LEVEL_SWITCHING: 'hlsLevelSwitching',
  // fired when a level switch is effective - data: { level : id of new level }
  LEVEL_SWITCHED: 'hlsLevelSwitched',
  // fired when a level playlist loading starts - data: { url : level URL, level : id of level being loaded}
  LEVEL_LOADING: 'hlsLevelLoading',
  // fired when a level playlist loading finishes - data: { details : levelDetails object, level : id of loaded level, stats : { trequest, tfirst, tload, mtime} }
  LEVEL_LOADED: 'hlsLevelLoaded',
  // fired when a level's details have been updated based on previous details, after it has been loaded - data: { details : levelDetails object, level : id of updated level }
  LEVEL_UPDATED: 'hlsLevelUpdated',
  // fired when a level's PTS information has been updated after parsing a fragment - data: { details : levelDetails object, level : id of updated level, drift: PTS drift observed when parsing last fragment }
  LEVEL_PTS_UPDATED: 'hlsLevelPtsUpdated',
  // fired to notify that levels have changed after removing a level - data: { levels : [available quality levels] }
  LEVELS_UPDATED: 'hlsLevelsUpdated',
  // fired to notify that audio track lists has been updated - data: { audioTracks : audioTracks }
  AUDIO_TRACKS_UPDATED: 'hlsAudioTracksUpdated',
  // fired when an audio track switching is requested - data: { id : audio track id }
  AUDIO_TRACK_SWITCHING: 'hlsAudioTrackSwitching',
  // fired when an audio track switch actually occurs - data: { id : audio track id }
  AUDIO_TRACK_SWITCHED: 'hlsAudioTrackSwitched',
  // fired when an audio track loading starts - data: { url : audio track URL, id : audio track id }
  AUDIO_TRACK_LOADING: 'hlsAudioTrackLoading',
  // fired when an audio track loading finishes - data: { details : levelDetails object, id : audio track id, stats : { trequest, tfirst, tload, mtime } }
  AUDIO_TRACK_LOADED: 'hlsAudioTrackLoaded',
  // fired to notify that subtitle track lists has been updated - data: { subtitleTracks : subtitleTracks }
  SUBTITLE_TRACKS_UPDATED: 'hlsSubtitleTracksUpdated',
  // fired when an subtitle track switch occurs - data: { id : subtitle track id }
  SUBTITLE_TRACK_SWITCH: 'hlsSubtitleTrackSwitch',
  // fired when a subtitle track loading starts - data: { url : subtitle track URL, id : subtitle track id }
  SUBTITLE_TRACK_LOADING: 'hlsSubtitleTrackLoading',
  // fired when a subtitle track loading finishes - data: { details : levelDetails object, id : subtitle track id, stats : { trequest, tfirst, tload, mtime } }
  SUBTITLE_TRACK_LOADED: 'hlsSubtitleTrackLoaded',
  // fired when a subtitle fragment has been processed - data: { success : boolean, frag : the processed frag }
  SUBTITLE_FRAG_PROCESSED: 'hlsSubtitleFragProcessed',
  // fired when a set of VTTCues to be managed externally has been parsed - data: { type: string, track: string, cues: [ VTTCue ] }
  CUES_PARSED: 'hlsCuesParsed',
  // fired when a text track to be managed externally is found - data: { tracks: [ { label: string, kind: string, default: boolean } ] }
  NON_NATIVE_TEXT_TRACKS_FOUND: 'hlsNonNativeTextTracksFound',
  // fired when the first timestamp is found - data: { id : demuxer id, initPTS: initPTS, frag : fragment object }
  INIT_PTS_FOUND: 'hlsInitPtsFound',
  // fired when a fragment loading starts - data: { frag : fragment object }
  FRAG_LOADING: 'hlsFragLoading',
  // fired when a fragment loading is progressing - data: { frag : fragment object, { trequest, tfirst, loaded } }
  FRAG_LOAD_PROGRESS: 'hlsFragLoadProgress',
  // Identifier for fragment load aborting for emergency switch down - data: { frag : fragment object }
  FRAG_LOAD_EMERGENCY_ABORTED: 'hlsFragLoadEmergencyAborted',
  // fired when a fragment loading is completed - data: { frag : fragment object, payload : fragment payload, stats : { trequest, tfirst, tload, length } }
  FRAG_LOADED: 'hlsFragLoaded',
  // fired when a fragment has finished decrypting - data: { id : demuxer id, frag: fragment object, payload : fragment payload, stats : { tstart, tdecrypt } }
  FRAG_DECRYPTED: 'hlsFragDecrypted',
  // fired when Init Segment has been extracted from fragment - data: { id : demuxer id, frag: fragment object, moov : moov MP4 box, codecs : codecs found while parsing fragment }
  FRAG_PARSING_INIT_SEGMENT: 'hlsFragParsingInitSegment',
  // fired when parsing sei text is completed - data: { id : demuxer id, frag: fragment object, samples : [ sei samples pes ] }
  FRAG_PARSING_USERDATA: 'hlsFragParsingUserdata',
  // fired when parsing id3 is completed - data: { id : demuxer id, frag: fragment object, samples : [ id3 samples pes ] }
  FRAG_PARSING_METADATA: 'hlsFragParsingMetadata',
  // fired when data have been extracted from fragment - data: { id : demuxer id, frag: fragment object, data1 : moof MP4 box or TS fragments, data2 : mdat MP4 box or null}
  FRAG_PARSING_DATA: 'hlsFragParsingData',
  // fired when fragment parsing is completed - data: { id : demuxer id, frag: fragment object }
  FRAG_PARSED: 'hlsFragParsed',
  // fired when fragment remuxed MP4 boxes have all been appended into SourceBuffer - data: { id : demuxer id, frag : fragment object, stats : { trequest, tfirst, tload, tparsed, tbuffered, length, bwEstimate } }
  FRAG_BUFFERED: 'hlsFragBuffered',
  // fired when fragment matching with current media position is changing - data : { id : demuxer id, frag : fragment object }
  FRAG_CHANGED: 'hlsFragChanged',
  // Identifier for a FPS drop event - data: { curentDropped, currentDecoded, totalDroppedFrames }
  FPS_DROP: 'hlsFpsDrop',
  // triggered when FPS drop triggers auto level capping - data: { level, droppedlevel }
  FPS_DROP_LEVEL_CAPPING: 'hlsFpsDropLevelCapping',
  // Identifier for an error event - data: { type : error type, details : error details, fatal : if true, hls.js cannot/will not try to recover, if false, hls.js will try to recover,other error specific data }
  ERROR: 'hlsError',
  // fired when hls.js instance starts destroying. Different from MEDIA_DETACHED as one could want to detach and reattach a media to the instance of hls.js to handle mid-rolls for example - data: { }
  DESTROYING: 'hlsDestroying',
  // fired when a decrypt key loading starts - data: { frag : fragment object }
  KEY_LOADING: 'hlsKeyLoading',
  // fired when a decrypt key loading is completed - data: { frag : fragment object, payload : key payload, stats : { trequest, tfirst, tload, length } }
  KEY_LOADED: 'hlsKeyLoaded',
  // fired upon stream controller state transitions - data: { previousState, nextState }
  STREAM_STATE_TRANSITION: 'hlsStreamStateTransition',
  // fired when the live back buffer is reached defined by the liveBackBufferLength config option - data : { bufferEnd: number }
  LIVE_BACK_BUFFER_REACHED: 'hlsLiveBackBufferReached'
};



var ErrorTypes;
(function (ErrorTypes) {
    // Identifier for a network error (loading error / timeout ...)
    ErrorTypes["NETWORK_ERROR"] = "networkError";
    // Identifier for a media Error (video/parsing/mediasource error)
    ErrorTypes["MEDIA_ERROR"] = "mediaError";
    // EME (encrypted media extensions) errors
    ErrorTypes["KEY_SYSTEM_ERROR"] = "keySystemError";
    // Identifier for a mux Error (demuxing/remuxing)
    ErrorTypes["MUX_ERROR"] = "muxError";
    // Identifier for all other errors
    ErrorTypes["OTHER_ERROR"] = "otherError";
})(ErrorTypes || (ErrorTypes = {}));
/**
 * @enum {ErrorDetails}
 * @typedef {string} ErrorDetail
 */
 var ErrorDetails;
(function (ErrorDetails) {
    ErrorDetails["KEY_SYSTEM_NO_KEYS"] = "keySystemNoKeys";
    ErrorDetails["KEY_SYSTEM_NO_ACCESS"] = "keySystemNoAccess";
    ErrorDetails["KEY_SYSTEM_NO_SESSION"] = "keySystemNoSession";
    ErrorDetails["KEY_SYSTEM_LICENSE_REQUEST_FAILED"] = "keySystemLicenseRequestFailed";
    ErrorDetails["KEY_SYSTEM_NO_INIT_DATA"] = "keySystemNoInitData";
    // Identifier for a manifest load error - data: { url : faulty URL, response : { code: error code, text: error text }}
    ErrorDetails["MANIFEST_LOAD_ERROR"] = "manifestLoadError";
    // Identifier for a manifest load timeout - data: { url : faulty URL, response : { code: error code, text: error text }}
    ErrorDetails["MANIFEST_LOAD_TIMEOUT"] = "manifestLoadTimeOut";
    // Identifier for a manifest parsing error - data: { url : faulty URL, reason : error reason}
    ErrorDetails["MANIFEST_PARSING_ERROR"] = "manifestParsingError";
    // Identifier for a manifest with only incompatible codecs error - data: { url : faulty URL, reason : error reason}
    ErrorDetails["MANIFEST_INCOMPATIBLE_CODECS_ERROR"] = "manifestIncompatibleCodecsError";
    // Identifier for a level which contains no fragments - data: { url: faulty URL, reason: "no fragments found in level", level: index of the bad level }
    ErrorDetails["LEVEL_EMPTY_ERROR"] = "levelEmptyError";
    // Identifier for a level load error - data: { url : faulty URL, response : { code: error code, text: error text }}
    ErrorDetails["LEVEL_LOAD_ERROR"] = "levelLoadError";
    // Identifier for a level load timeout - data: { url : faulty URL, response : { code: error code, text: error text }}
    ErrorDetails["LEVEL_LOAD_TIMEOUT"] = "levelLoadTimeOut";
    // Identifier for a level switch error - data: { level : faulty level Id, event : error description}
    ErrorDetails["LEVEL_SWITCH_ERROR"] = "levelSwitchError";
    // Identifier for an audio track load error - data: { url : faulty URL, response : { code: error code, text: error text }}
    ErrorDetails["AUDIO_TRACK_LOAD_ERROR"] = "audioTrackLoadError";
    // Identifier for an audio track load timeout - data: { url : faulty URL, response : { code: error code, text: error text }}
    ErrorDetails["AUDIO_TRACK_LOAD_TIMEOUT"] = "audioTrackLoadTimeOut";
    // Identifier for fragment load error - data: { frag : fragment object, response : { code: error code, text: error text }}
    ErrorDetails["FRAG_LOAD_ERROR"] = "fragLoadError";
    // Identifier for fragment load timeout error - data: { frag : fragment object}
    ErrorDetails["FRAG_LOAD_TIMEOUT"] = "fragLoadTimeOut";
    // Identifier for a fragment decryption error event - data: {id : demuxer Id,frag: fragment object, reason : parsing error description }
    ErrorDetails["FRAG_DECRYPT_ERROR"] = "fragDecryptError";
    // Identifier for a fragment parsing error event - data: { id : demuxer Id, reason : parsing error description }
    // will be renamed DEMUX_PARSING_ERROR and switched to MUX_ERROR in the next major release
    ErrorDetails["FRAG_PARSING_ERROR"] = "fragParsingError";
    // Identifier for a remux alloc error event - data: { id : demuxer Id, frag : fragment object, bytes : nb of bytes on which allocation failed , reason : error text }
    ErrorDetails["REMUX_ALLOC_ERROR"] = "remuxAllocError";
    // Identifier for decrypt key load error - data: { frag : fragment object, response : { code: error code, text: error text }}
    ErrorDetails["KEY_LOAD_ERROR"] = "keyLoadError";
    // Identifier for decrypt key load timeout error - data: { frag : fragment object}
    ErrorDetails["KEY_LOAD_TIMEOUT"] = "keyLoadTimeOut";
    // Triggered when an exception occurs while adding a sourceBuffer to MediaSource - data : {  err : exception , mimeType : mimeType }
    ErrorDetails["BUFFER_ADD_CODEC_ERROR"] = "bufferAddCodecError";
    // Identifier for a buffer append error - data: append error description
    ErrorDetails["BUFFER_APPEND_ERROR"] = "bufferAppendError";
    // Identifier for a buffer appending error event - data: appending error description
    ErrorDetails["BUFFER_APPENDING_ERROR"] = "bufferAppendingError";
    // Identifier for a buffer stalled error event
    ErrorDetails["BUFFER_STALLED_ERROR"] = "bufferStalledError";
    // Identifier for a buffer full event
    ErrorDetails["BUFFER_FULL_ERROR"] = "bufferFullError";
    // Identifier for a buffer seek over hole event
    ErrorDetails["BUFFER_SEEK_OVER_HOLE"] = "bufferSeekOverHole";
    // Identifier for a buffer nudge on stall (playback is stuck although currentTime is in a buffered area)
    ErrorDetails["BUFFER_NUDGE_ON_STALL"] = "bufferNudgeOnStall";
    // Identifier for an internal exception happening inside hls.js while handling an event
    ErrorDetails["INTERNAL_EXCEPTION"] = "internalException";
})(ErrorDetails || (ErrorDetails = {}));

var MPEG_TS_CLOCK_FREQ_HZ = 90000;
 function toTimescaleFromScale(value, destScale, srcScale, round) {
    if (srcScale === void 0) { srcScale = 1; }
    if (round === void 0) { round = false; }
    return toTimescaleFromBase(value, destScale, 1 / srcScale);
}
 function toTimescaleFromBase(value, destScale, srcBase, round) {
    if (srcBase === void 0) { srcBase = 1; }
    if (round === void 0) { round = false; }
    var result = value * destScale * srcBase; // equivalent to `(value * scale) / (1 / base)`
    return round ? Math.round(result) : result;
}
 function toMsFromMpegTsClock(value, round) {
    if (round === void 0) { round = false; }
    return toTimescaleFromBase(value, 1000, 1 / MPEG_TS_CLOCK_FREQ_HZ, round);
}
 function toMpegTsClockFromTimescale(value, srcScale) {
    if (srcScale === void 0) { srcScale = 1; }
    return toTimescaleFromBase(value, MPEG_TS_CLOCK_FREQ_HZ, 1 / srcScale);
}

const DECIMAL_RESOLUTION_REGEX = /^(\d+)x(\d+)$/; // eslint-disable-line no-useless-escape
const ATTR_LIST_REGEX = /\s*(.+?)\s*=((?:\".*?\")|.*?)(?:,|$)/g; // eslint-disable-line no-useless-escape

// adapted from https://github.com/kanongil/node-m3u8parse/blob/master/attrlist.js
class AttrList {
  constructor (attrs) {
    if (typeof attrs === 'string') {
      attrs = AttrList.parseAttrList(attrs);
    }

    for (let attr in attrs) {
      if (attrs.hasOwnProperty(attr)) {
        this[attr] = attrs[attr];
      }
    }
  }

  decimalInteger (attrName) {
    const intValue = parseInt(this[attrName], 10);
    if (intValue > Number.MAX_SAFE_INTEGER) {
      return Infinity;
    }

    return intValue;
  }

  hexadecimalInteger (attrName) {
    if (this[attrName]) {
      let stringValue = (this[attrName] || '0x').slice(2);
      stringValue = ((stringValue.length & 1) ? '0' : '') + stringValue;

      const value = new Uint8Array(stringValue.length / 2);
      for (let i = 0; i < stringValue.length / 2; i++) {
        value[i] = parseInt(stringValue.slice(i * 2, i * 2 + 2), 16);
      }

      return value;
    } else {
      return null;
    }
  }

  hexadecimalIntegerAsNumber (attrName) {
    const intValue = parseInt(this[attrName], 16);
    if (intValue > Number.MAX_SAFE_INTEGER) {
      return Infinity;
    }

    return intValue;
  }

  decimalFloatingPoint (attrName) {
    return parseFloat(this[attrName]);
  }

  enumeratedString (attrName) {
    return this[attrName];
  }

  decimalResolution (attrName) {
    const res = DECIMAL_RESOLUTION_REGEX.exec(this[attrName]);
    if (res === null) {
      return undefined;
    }

    return {
      width: parseInt(res[1], 10),
      height: parseInt(res[2], 10)
    };
  }

  static parseAttrList (input) {
    let match, attrs = {};
    ATTR_LIST_REGEX.lastIndex = 0;
    while ((match = ATTR_LIST_REGEX.exec(input)) !== null) {
      let value = match[2], quote = '"';

      if (value.indexOf(quote) === 0 &&
          value.lastIndexOf(quote) === (value.length - 1)) {
        value = value.slice(1, -1);
      }

      attrs[match[1]] = value;
    }
    return attrs;
  }
}



// from http://mp4ra.org/codecs.html
var sampleEntryCodesISO = {
    audio: {
        'a3ds': true,
        'ac-3': true,
        'ac-4': true,
        'alac': true,
        'alaw': true,
        'dra1': true,
        'dts+': true,
        'dts-': true,
        'dtsc': true,
        'dtse': true,
        'dtsh': true,
        'ec-3': true,
        'enca': true,
        'g719': true,
        'g726': true,
        'm4ae': true,
        'mha1': true,
        'mha2': true,
        'mhm1': true,
        'mhm2': true,
        'mlpa': true,
        'mp4a': true,
        'raw ': true,
        'Opus': true,
        'samr': true,
        'sawb': true,
        'sawp': true,
        'sevc': true,
        'sqcp': true,
        'ssmv': true,
        'twos': true,
        'ulaw': true
    },
    video: {
        'avc1': true,
        'avc2': true,
        'avc3': true,
        'avc4': true,
        'avcp': true,
        'drac': true,
        'dvav': true,
        'dvhe': true,
        'encv': true,
        'hev1': true,
        'hvc1': true,
        'mjp2': true,
        'mp4v': true,
        'mvc1': true,
        'mvc2': true,
        'mvc3': true,
        'mvc4': true,
        'resv': true,
        'rv60': true,
        's263': true,
        'svc1': true,
        'svc2': true,
        'vc-1': true,
        'vp08': true,
        'vp09': true
    }
};
function isCodecType(codec, type) {
    var typeCodes = sampleEntryCodesISO[type];
    return !!typeCodes && typeCodes[codec.slice(0, 4)] === true;
}
function isCodecSupportedInMp4(codec, type) {
    return MediaSource.isTypeSupported((type || 'video') + "/mp4;codecs=\"" + codec + "\"");
}


function getSelfScope () {
  // see https://stackoverflow.com/a/11237259/589493
  if (typeof window === 'undefined') {
    /* eslint-disable-next-line no-undef */
    return self;
  } else {
    return window;
  }
}

/**
 * ADTS parser helper
 * @link https://wiki.multimedia.cx/index.php?title=ADTS
 */







function getAudioConfig (observer, data, offset, audioCodec) {
  let adtsObjectType, // :int
    adtsSampleingIndex, // :int
    adtsExtensionSampleingIndex, // :int
    adtsChanelConfig, // :int
    config,
    userAgent = 'Android'.toLowerCase(),
    manifestCodec = audioCodec,
    adtsSampleingRates = [
      96000, 88200,
      64000, 48000,
      44100, 32000,
      24000, 22050,
      16000, 12000,
      11025, 8000,
      7350];
  // byte 2
  adtsObjectType = ((data[offset + 2] & 0xC0) >>> 6) + 1;
  adtsSampleingIndex = ((data[offset + 2] & 0x3C) >>> 2);
  if (adtsSampleingIndex > adtsSampleingRates.length - 1) {
    observer.trigger(HlsEvents.ERROR, { type: ErrorTypes.MEDIA_ERROR, details: ErrorDetails.FRAG_PARSING_ERROR, fatal: true, reason: `invalid ADTS sampling index:${adtsSampleingIndex}` });
    return;
  }
  adtsChanelConfig = ((data[offset + 2] & 0x01) << 2);
  // byte 3
  adtsChanelConfig |= ((data[offset + 3] & 0xC0) >>> 6);
  logger.log(`manifest codec:${audioCodec},ADTS data:type:${adtsObjectType},sampleingIndex:${adtsSampleingIndex}[${adtsSampleingRates[adtsSampleingIndex]}Hz],channelConfig:${adtsChanelConfig}`);
  // firefox: freq less than 24kHz = AAC SBR (HE-AAC)
  if (/firefox/i.test(userAgent)) {
    if (adtsSampleingIndex >= 6) {
      adtsObjectType = 5;
      config = new Array(4);
      // HE-AAC uses SBR (Spectral Band Replication) , high frequencies are constructed from low frequencies
      // there is a factor 2 between frame sample rate and output sample rate
      // multiply frequency by 2 (see table below, equivalent to substract 3)
      adtsExtensionSampleingIndex = adtsSampleingIndex - 3;
    } else {
      adtsObjectType = 2;
      config = new Array(2);
      adtsExtensionSampleingIndex = adtsSampleingIndex;
    }
    // Android : always use AAC
  } else if (userAgent.indexOf('android') !== -1) {
    adtsObjectType = 2;
    config = new Array(2);
    adtsExtensionSampleingIndex = adtsSampleingIndex;
  } else {
    /*  for other browsers (Chrome/Vivaldi/Opera ...)
        always force audio type to be HE-AAC SBR, as some browsers do not support audio codec switch properly (like Chrome ...)
    */
    adtsObjectType = 5;
    config = new Array(4);
    // if (manifest codec is HE-AAC or HE-AACv2) OR (manifest codec not specified AND frequency less than 24kHz)
    if ((audioCodec && ((audioCodec.indexOf('mp4a.40.29') !== -1) ||
      (audioCodec.indexOf('mp4a.40.5') !== -1))) ||
      (!audioCodec && adtsSampleingIndex >= 6)) {
      // HE-AAC uses SBR (Spectral Band Replication) , high frequencies are constructed from low frequencies
      // there is a factor 2 between frame sample rate and output sample rate
      // multiply frequency by 2 (see table below, equivalent to substract 3)
      adtsExtensionSampleingIndex = adtsSampleingIndex - 3;
    } else {
      // if (manifest codec is AAC) AND (frequency less than 24kHz AND nb channel is 1) OR (manifest codec not specified and mono audio)
      // Chrome fails to play back with low frequency AAC LC mono when initialized with HE-AAC.  This is not a problem with stereo.
      if (audioCodec && audioCodec.indexOf('mp4a.40.2') !== -1 && ((adtsSampleingIndex >= 6 && adtsChanelConfig === 1) ||
            /vivaldi/i.test(userAgent)) ||
        (!audioCodec && adtsChanelConfig === 1)) {
        adtsObjectType = 2;
        config = new Array(2);
      }
      adtsExtensionSampleingIndex = adtsSampleingIndex;
    }
  }
  /* refer to http://wiki.multimedia.cx/index.php?title=MPEG-4_Audio#Audio_Specific_Config
      ISO 14496-3 (AAC).pdf - Table 1.13 — Syntax of AudioSpecificConfig()
    Audio Profile / Audio Object Type
    0: Null
    1: AAC Main
    2: AAC LC (Low Complexity)
    3: AAC SSR (Scalable Sample Rate)
    4: AAC LTP (Long Term Prediction)
    5: SBR (Spectral Band Replication)
    6: AAC Scalable
   sampling freq
    0: 96000 Hz
    1: 88200 Hz
    2: 64000 Hz
    3: 48000 Hz
    4: 44100 Hz
    5: 32000 Hz
    6: 24000 Hz
    7: 22050 Hz
    8: 16000 Hz
    9: 12000 Hz
    10: 11025 Hz
    11: 8000 Hz
    12: 7350 Hz
    13: Reserved
    14: Reserved
    15: frequency is written explictly
    Channel Configurations
    These are the channel configurations:
    0: Defined in AOT Specifc Config
    1: 1 channel: front-center
    2: 2 channels: front-left, front-right
  */
  // audioObjectType = profile => profile, the MPEG-4 Audio Object Type minus 1
  config[0] = adtsObjectType << 3;
  // samplingFrequencyIndex
  config[0] |= (adtsSampleingIndex & 0x0E) >> 1;
  config[1] |= (adtsSampleingIndex & 0x01) << 7;
  // channelConfiguration
  config[1] |= adtsChanelConfig << 3;
  if (adtsObjectType === 5) {
    // adtsExtensionSampleingIndex
    config[1] |= (adtsExtensionSampleingIndex & 0x0E) >> 1;
    config[2] = (adtsExtensionSampleingIndex & 0x01) << 7;
    // adtsObjectType (force to 2, chrome is checking that object type is less than 5 ???
    //    https://chromium.googlesource.com/chromium/src.git/+/master/media/formats/mp4/aac.cc
    config[2] |= 2 << 2;
    config[3] = 0;
  }
  return { config: config, samplerate: adtsSampleingRates[adtsSampleingIndex], channelCount: adtsChanelConfig, codec: ('mp4a.40.' + adtsObjectType), manifestCodec: manifestCodec };
}

function isHeaderPattern (data, offset) {
  return data[offset] === 0xff && (data[offset + 1] & 0xf6) === 0xf0;
}

function getHeaderLength (data, offset) {
  return (data[offset + 1] & 0x01 ? 7 : 9);
}

function getFullFrameLength (data, offset) {
  return ((data[offset + 3] & 0x03) << 11) |
    (data[offset + 4] << 3) |
    ((data[offset + 5] & 0xE0) >>> 5);
}

function isHeader (data, offset) {
  // Look for ADTS header | 1111 1111 | 1111 X00X | where X can be either 0 or 1
  // Layer bits (position 14 and 15) in header should be always 0 for ADTS
  // More info https://wiki.multimedia.cx/index.php?title=ADTS
  if (offset + 1 < data.length && isHeaderPattern(data, offset)) {
    return true;
  }

  return false;
}

function probe (data, offset) {
  // same as isHeader but we also check that ADTS frame follows last ADTS frame
  // or end of data is reached
  if (isHeader(data, offset)) {
    // ADTS header Length
    let headerLength = getHeaderLength(data, offset);
    if (offset + headerLength >= data.length) {
      return false;
    }
    // ADTS frame Length
    let frameLength = getFullFrameLength(data, offset);
    if (frameLength <= headerLength) {
      return false;
    }

    let newOffset = offset + frameLength;
    if (newOffset === data.length || (newOffset + 1 < data.length && isHeaderPattern(data, newOffset))) {
      return true;
    }
  }
  return false;
}

function initTrackConfig (track, observer, data, offset, audioCodec) {
  if (!track.samplerate) {
    let config = getAudioConfig(observer, data, offset, audioCodec);
    track.config = config.config;
    track.samplerate = config.samplerate;
    track.channelCount = config.channelCount;
    track.codec = config.codec;
    track.manifestCodec = config.manifestCodec;
    logger.log(`parsed codec:${track.codec},rate:${config.samplerate},nb channel:${config.channelCount}`);
  }
}

function getFrameDuration (samplerate) {
  return 1024 * 90000 / samplerate;
}

function parseFrameHeader (data, offset, pts, frameIndex, frameDuration) {
  let headerLength, frameLength, stamp;
  let length = data.length;

  // The protection skip bit tells us if we have 2 bytes of CRC data at the end of the ADTS header
  headerLength = getHeaderLength(data, offset);
  // retrieve frame size
  frameLength = getFullFrameLength(data, offset);
  frameLength -= headerLength;

  if ((frameLength > 0) && ((offset + headerLength + frameLength) <= length)) {
    stamp = pts + frameIndex * frameDuration;
    // logger.log(`AAC frame, offset/length/total/pts:${offset+headerLength}/${frameLength}/${data.byteLength}/${(stamp/90).toFixed(0)}`);
    return { headerLength, frameLength, stamp };
  }

  return undefined;
}

function appendFrame (track, data, offset, pts, frameIndex) {
  let frameDuration = getFrameDuration(track.samplerate);
  let header = parseFrameHeader(data, offset, pts, frameIndex, frameDuration);
  if (header) {
    let stamp = header.stamp;
    let headerLength = header.headerLength;
    let frameLength = header.frameLength;

    // logger.log(`AAC frame, offset/length/total/pts:${offset+headerLength}/${frameLength}/${data.byteLength}/${(stamp/90).toFixed(0)}`);
    let aacSample = {
      unit: data.subarray(offset + headerLength, offset + headerLength + frameLength),
      pts: stamp,
      dts: stamp
    };

    track.samples.push(aacSample);
    return { sample: aacSample, length: frameLength + headerLength };
  }

  return undefined;
}

const ADTS = { getAudioConfig , isHeaderPattern , getHeaderLength , getFullFrameLength , isHeader , probe , initTrackConfig , getFrameDuration , parseFrameHeader , appendFrame } ;
/**
 *  MPEG parser helper
 */

const MpegAudio = {

  BitratesMap: [
    32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448,
    32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384,
    32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
    32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256,
    8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],

  SamplingRateMap: [44100, 48000, 32000, 22050, 24000, 16000, 11025, 12000, 8000],

  SamplesCoefficients: [
    // MPEG 2.5
    [
      0, // Reserved
      72, // Layer3
      144, // Layer2
      12 // Layer1
    ],
    // Reserved
    [
      0, // Reserved
      0, // Layer3
      0, // Layer2
      0 // Layer1
    ],
    // MPEG 2
    [
      0, // Reserved
      72, // Layer3
      144, // Layer2
      12 // Layer1
    ],
    // MPEG 1
    [
      0, // Reserved
      144, // Layer3
      144, // Layer2
      12 // Layer1
    ]
  ],

  BytesInSlot: [
    0, // Reserved
    1, // Layer3
    1, // Layer2
    4 // Layer1
  ],

  appendFrame: function (track, data, offset, pts, frameIndex) {
    // Using http://www.datavoyage.com/mpgscript/mpeghdr.htm as a reference
    if (offset + 24 > data.length) {
      return undefined;
    }

    let header = this.parseHeader(data, offset);
    if (header && offset + header.frameLength <= data.length) {
      let frameDuration = header.samplesPerFrame * 90000 / header.sampleRate;
      let stamp = pts + frameIndex * frameDuration;
      let sample = { unit: data.subarray(offset, offset + header.frameLength), pts: stamp, dts: stamp };

      track.config = [];
      track.channelCount = header.channelCount;
      track.samplerate = header.sampleRate;
      track.samples.push(sample);

      return { sample, length: header.frameLength };
    }

    return undefined;
  },

  parseHeader: function (data, offset) {
    let headerB = (data[offset + 1] >> 3) & 3;
    let headerC = (data[offset + 1] >> 1) & 3;
    let headerE = (data[offset + 2] >> 4) & 15;
    let headerF = (data[offset + 2] >> 2) & 3;
    let headerG = (data[offset + 2] >> 1) & 1;
    if (headerB !== 1 && headerE !== 0 && headerE !== 15 && headerF !== 3) {
      let columnInBitrates = headerB === 3 ? (3 - headerC) : (headerC === 3 ? 3 : 4);
      let bitRate = MpegAudio.BitratesMap[columnInBitrates * 14 + headerE - 1] * 1000;
      let columnInSampleRates = headerB === 3 ? 0 : headerB === 2 ? 1 : 2;
      let sampleRate = MpegAudio.SamplingRateMap[columnInSampleRates * 3 + headerF];
      let channelCount = data[offset + 3] >> 6 === 3 ? 1 : 2; // If bits of channel mode are `11` then it is a single channel (Mono)
      let sampleCoefficient = MpegAudio.SamplesCoefficients[headerB][headerC];
      let bytesInSlot = MpegAudio.BytesInSlot[headerC];
      let samplesPerFrame = sampleCoefficient * 8 * bytesInSlot;
      let frameLength = parseInt(sampleCoefficient * bitRate / sampleRate + headerG, 10) * bytesInSlot;

      return { sampleRate, channelCount, frameLength, samplesPerFrame };
    }

    return undefined;
  },

  isHeaderPattern: function (data, offset) {
    return data[offset] === 0xff && (data[offset + 1] & 0xe0) === 0xe0 && (data[offset + 1] & 0x06) !== 0x00;
  },

  isHeader: function (data, offset) {
    // Look for MPEG header | 1111 1111 | 111X XYZX | where X can be either 0 or 1 and Y or Z should be 1
    // Layer bits (position 14 and 15) in header should be always different from 0 (Layer I or Layer II or Layer III)
    // More info http://www.mp3-tech.org/programmer/frame_header.html
    if (offset + 1 < data.length && this.isHeaderPattern(data, offset)) {
      return true;
    }

    return false;
  },

  probe: function (data, offset) {
    // same as isHeader but we also check that MPEG frame follows last MPEG frame
    // or end of data is reached
    if (offset + 1 < data.length && this.isHeaderPattern(data, offset)) {
      // MPEG header Length
      let headerLength = 4;
      // MPEG frame Length
      let header = this.parseHeader(data, offset);
      let frameLength = headerLength;
      if (header && header.frameLength) {
        frameLength = header.frameLength;
      }

      let newOffset = offset + frameLength;
      if (newOffset === data.length || (newOffset + 1 < data.length && this.isHeaderPattern(data, newOffset))) {
        return true;
      }
    }
    return false;
  }
};



/**
 * Parser for exponential Golomb codes, a variable-bitwidth number encoding scheme used by h264.
*/



class ExpGolomb {
  constructor (data) {
    this.data = data;
    // the number of bytes left to examine in this.data
    this.bytesAvailable = data.byteLength;
    // the current word being examined
    this.word = 0; // :uint
    // the number of bits left to examine in the current word
    this.bitsAvailable = 0; // :uint
  }

  // ():void
  loadWord () {
    let
      data = this.data,
      bytesAvailable = this.bytesAvailable,
      position = data.byteLength - bytesAvailable,
      workingBytes = new Uint8Array(4),
      availableBytes = Math.min(4, bytesAvailable);
    if (availableBytes === 0) {
      throw new Error('no bytes available');
    }

    workingBytes.set(data.subarray(position, position + availableBytes));
    this.word = new DataView(workingBytes.buffer).getUint32(0);
    // track the amount of this.data that has been processed
    this.bitsAvailable = availableBytes * 8;
    this.bytesAvailable -= availableBytes;
  }

  // (count:int):void
  skipBits (count) {
    let skipBytes; // :int
    if (this.bitsAvailable > count) {
      this.word <<= count;
      this.bitsAvailable -= count;
    } else {
      count -= this.bitsAvailable;
      skipBytes = count >> 3;
      count -= (skipBytes >> 3);
      this.bytesAvailable -= skipBytes;
      this.loadWord();
      this.word <<= count;
      this.bitsAvailable -= count;
    }
  }

  // (size:int):uint
  readBits (size) {
    let
      bits = Math.min(this.bitsAvailable, size), // :uint
      valu = this.word >>> (32 - bits); // :uint
    if (size > 32) {
      logger.error('Cannot read more than 32 bits at a time');
    }

    this.bitsAvailable -= bits;
    if (this.bitsAvailable > 0) {
      this.word <<= bits;
    } else if (this.bytesAvailable > 0) {
      this.loadWord();
    }

    bits = size - bits;
    if (bits > 0 && this.bitsAvailable) {
      return valu << bits | this.readBits(bits);
    } else {
      return valu;
    }
  }

  // ():uint
  skipLZ () {
    let leadingZeroCount; // :uint
    for (leadingZeroCount = 0; leadingZeroCount < this.bitsAvailable; ++leadingZeroCount) {
      if ((this.word & (0x80000000 >>> leadingZeroCount)) !== 0) {
        // the first bit of working word is 1
        this.word <<= leadingZeroCount;
        this.bitsAvailable -= leadingZeroCount;
        return leadingZeroCount;
      }
    }
    // we exhausted word and still have not found a 1
    this.loadWord();
    return leadingZeroCount + this.skipLZ();
  }

  // ():void
  skipUEG () {
    this.skipBits(1 + this.skipLZ());
  }

  // ():void
  skipEG () {
    this.skipBits(1 + this.skipLZ());
  }

  // ():uint
  readUEG () {
    let clz = this.skipLZ(); // :uint
    return this.readBits(clz + 1) - 1;
  }

  // ():int
  readEG () {
    let valu = this.readUEG(); // :int
    if (0x01 & valu) {
      // the number is odd if the low order bit is set
      return (1 + valu) >>> 1; // add 1 to make it even, and divide by 2
    } else {
      return -1 * (valu >>> 1); // divide by two then make it negative
    }
  }

  // Some convenience functions
  // :Boolean
  readBoolean () {
    return this.readBits(1) === 1;
  }

  // ():int
  readUByte () {
    return this.readBits(8);
  }

  // ():int
  readUShort () {
    return this.readBits(16);
  }
  // ():int
  readUInt () {
    return this.readBits(32);
  }

  /**
   * Advance the ExpGolomb decoder past a scaling list. The scaling
   * list is optionally transmitted as part of a sequence parameter
   * set and is not relevant to transmuxing.
   * @param count {number} the number of entries in this scaling list
   * @see Recommendation ITU-T H.264, Section 7.3.2.1.1.1
   */
  skipScalingList (count) {
    let
      lastScale = 8,
      nextScale = 8,
      j,
      deltaScale;
    for (j = 0; j < count; j++) {
      if (nextScale !== 0) {
        deltaScale = this.readEG();
        nextScale = (lastScale + deltaScale + 256) % 256;
      }
      lastScale = (nextScale === 0) ? lastScale : nextScale;
    }
  }

  /**
   * Read a sequence parameter set and return some interesting video
   * properties. A sequence parameter set is the H264 metadata that
   * describes the properties of upcoming video frames.
   * @param data {Uint8Array} the bytes of a sequence parameter set
   * @return {object} an object with configuration parsed from the
   * sequence parameter set, including the dimensions of the
   * associated video frames.
   */
  readSPS () {
    let
      frameCropLeftOffset = 0,
      frameCropRightOffset = 0,
      frameCropTopOffset = 0,
      frameCropBottomOffset = 0,
      profileIdc, profileCompat, levelIdc,
      numRefFramesInPicOrderCntCycle, picWidthInMbsMinus1,
      picHeightInMapUnitsMinus1,
      frameMbsOnlyFlag,
      scalingListCount,
      i,
      readUByte = this.readUByte.bind(this),
      readBits = this.readBits.bind(this),
      readUEG = this.readUEG.bind(this),
      readBoolean = this.readBoolean.bind(this),
      skipBits = this.skipBits.bind(this),
      skipEG = this.skipEG.bind(this),
      skipUEG = this.skipUEG.bind(this),
      skipScalingList = this.skipScalingList.bind(this);

    readUByte();
    profileIdc = readUByte(); // profile_idc
    profileCompat = readBits(5); // constraint_set[0-4]_flag, u(5)
    skipBits(3); // reserved_zero_3bits u(3),
    levelIdc = readUByte(); // level_idc u(8)
    skipUEG(); // seq_parameter_set_id
    // some profiles have more optional data we don't need
    if (profileIdc === 100 ||
        profileIdc === 110 ||
        profileIdc === 122 ||
        profileIdc === 244 ||
        profileIdc === 44 ||
        profileIdc === 83 ||
        profileIdc === 86 ||
        profileIdc === 118 ||
        profileIdc === 128) {
      let chromaFormatIdc = readUEG();
      if (chromaFormatIdc === 3) {
        skipBits(1);
      } // separate_colour_plane_flag

      skipUEG(); // bit_depth_luma_minus8
      skipUEG(); // bit_depth_chroma_minus8
      skipBits(1); // qpprime_y_zero_transform_bypass_flag
      if (readBoolean()) { // seq_scaling_matrix_present_flag
        scalingListCount = (chromaFormatIdc !== 3) ? 8 : 12;
        for (i = 0; i < scalingListCount; i++) {
          if (readBoolean()) { // seq_scaling_list_present_flag[ i ]
            if (i < 6) {
              skipScalingList(16);
            } else {
              skipScalingList(64);
            }
          }
        }
      }
    }
    skipUEG(); // log2_max_frame_num_minus4
    let picOrderCntType = readUEG();
    if (picOrderCntType === 0) {
      readUEG(); // log2_max_pic_order_cnt_lsb_minus4
    } else if (picOrderCntType === 1) {
      skipBits(1); // delta_pic_order_always_zero_flag
      skipEG(); // offset_for_non_ref_pic
      skipEG(); // offset_for_top_to_bottom_field
      numRefFramesInPicOrderCntCycle = readUEG();
      for (i = 0; i < numRefFramesInPicOrderCntCycle; i++) {
        skipEG();
      } // offset_for_ref_frame[ i ]
    }
    skipUEG(); // max_num_ref_frames
    skipBits(1); // gaps_in_frame_num_value_allowed_flag
    picWidthInMbsMinus1 = readUEG();
    picHeightInMapUnitsMinus1 = readUEG();
    frameMbsOnlyFlag = readBits(1);
    if (frameMbsOnlyFlag === 0) {
      skipBits(1);
    } // mb_adaptive_frame_field_flag

    skipBits(1); // direct_8x8_inference_flag
    if (readBoolean()) { // frame_cropping_flag
      frameCropLeftOffset = readUEG();
      frameCropRightOffset = readUEG();
      frameCropTopOffset = readUEG();
      frameCropBottomOffset = readUEG();
    }
    let pixelRatio = [1, 1];
    if (readBoolean()) {
      // vui_parameters_present_flag
      if (readBoolean()) {
        // aspect_ratio_info_present_flag
        const aspectRatioIdc = readUByte();
        switch (aspectRatioIdc) {
        case 1: pixelRatio = [1, 1]; break;
        case 2: pixelRatio = [12, 11]; break;
        case 3: pixelRatio = [10, 11]; break;
        case 4: pixelRatio = [16, 11]; break;
        case 5: pixelRatio = [40, 33]; break;
        case 6: pixelRatio = [24, 11]; break;
        case 7: pixelRatio = [20, 11]; break;
        case 8: pixelRatio = [32, 11]; break;
        case 9: pixelRatio = [80, 33]; break;
        case 10: pixelRatio = [18, 11]; break;
        case 11: pixelRatio = [15, 11]; break;
        case 12: pixelRatio = [64, 33]; break;
        case 13: pixelRatio = [160, 99]; break;
        case 14: pixelRatio = [4, 3]; break;
        case 15: pixelRatio = [3, 2]; break;
        case 16: pixelRatio = [2, 1]; break;
        case 255: {
          pixelRatio = [readUByte() << 8 | readUByte(), readUByte() << 8 | readUByte()];
          break;
        }
        }
      }
    }
    return {
      width: Math.ceil((((picWidthInMbsMinus1 + 1) * 16) - frameCropLeftOffset * 2 - frameCropRightOffset * 2)),
      height: ((2 - frameMbsOnlyFlag) * (picHeightInMapUnitsMinus1 + 1) * 16) - ((frameMbsOnlyFlag ? 2 : 4) * (frameCropTopOffset + frameCropBottomOffset)),
      pixelRatio: pixelRatio
    };
  }

  readSliceType () {
    // skip NALu type
    this.readUByte();
    // discard first_mb_in_slice
    this.readUEG();
    // return slice_type
    return this.readUEG();
  }
}



class AESCrypto {
  constructor (subtle, iv) {
    this.subtle = subtle;
    this.aesIV = iv;
  }

  decrypt (data, key) {
    return this.subtle.decrypt({ name: 'AES-CBC', iv: this.aesIV }, key, data);
  }
}

class FastAESKey {
  constructor (subtle, key) {
    this.subtle = subtle;
    this.key = key;
  }

  expandKey () {
    return this.subtle.importKey('raw', this.key, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
  }
}



// PKCS7
function removePadding (buffer) {
  const outputBytes = buffer.byteLength;
  const paddingBytes = outputBytes && (new DataView(buffer)).getUint8(outputBytes - 1);
  if (paddingBytes) {
    return buffer.slice(0, outputBytes - paddingBytes);
  } else {
    return buffer;
  }
}

class AESDecryptor {
  constructor () {
    // Static after running initTable
    this.rcon = [0x0, 0x1, 0x2, 0x4, 0x8, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];
    this.subMix = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    this.invSubMix = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    this.sBox = new Uint32Array(256);
    this.invSBox = new Uint32Array(256);

    // Changes during runtime
    this.key = new Uint32Array(0);

    this.initTable();
  }

  // Using view.getUint32() also swaps the byte order.
  uint8ArrayToUint32Array_ (arrayBuffer) {
    let view = new DataView(arrayBuffer);
    let newArray = new Uint32Array(4);
    for (let i = 0; i < 4; i++) {
      newArray[i] = view.getUint32(i * 4);
    }

    return newArray;
  }

  initTable () {
    let sBox = this.sBox;
    let invSBox = this.invSBox;
    let subMix = this.subMix;
    let subMix0 = subMix[0];
    let subMix1 = subMix[1];
    let subMix2 = subMix[2];
    let subMix3 = subMix[3];
    let invSubMix = this.invSubMix;
    let invSubMix0 = invSubMix[0];
    let invSubMix1 = invSubMix[1];
    let invSubMix2 = invSubMix[2];
    let invSubMix3 = invSubMix[3];

    let d = new Uint32Array(256);
    let x = 0;
    let xi = 0;
    let i = 0;
    for (i = 0; i < 256; i++) {
      if (i < 128) {
        d[i] = i << 1;
      } else {
        d[i] = (i << 1) ^ 0x11b;
      }
    }

    for (i = 0; i < 256; i++) {
      let sx = xi ^ (xi << 1) ^ (xi << 2) ^ (xi << 3) ^ (xi << 4);
      sx = (sx >>> 8) ^ (sx & 0xff) ^ 0x63;
      sBox[x] = sx;
      invSBox[sx] = x;

      // Compute multiplication
      let x2 = d[x];
      let x4 = d[x2];
      let x8 = d[x4];

      // Compute sub/invSub bytes, mix columns tables
      let t = (d[sx] * 0x101) ^ (sx * 0x1010100);
      subMix0[x] = (t << 24) | (t >>> 8);
      subMix1[x] = (t << 16) | (t >>> 16);
      subMix2[x] = (t << 8) | (t >>> 24);
      subMix3[x] = t;

      // Compute inv sub bytes, inv mix columns tables
      t = (x8 * 0x1010101) ^ (x4 * 0x10001) ^ (x2 * 0x101) ^ (x * 0x1010100);
      invSubMix0[sx] = (t << 24) | (t >>> 8);
      invSubMix1[sx] = (t << 16) | (t >>> 16);
      invSubMix2[sx] = (t << 8) | (t >>> 24);
      invSubMix3[sx] = t;

      // Compute next counter
      if (!x) {
        x = xi = 1;
      } else {
        x = x2 ^ d[d[d[x8 ^ x2]]];
        xi ^= d[d[xi]];
      }
    }
  }

  expandKey (keyBuffer) {
    // convert keyBuffer to Uint32Array
    let key = this.uint8ArrayToUint32Array_(keyBuffer);
    let sameKey = true;
    let offset = 0;

    while (offset < key.length && sameKey) {
      sameKey = (key[offset] === this.key[offset]);
      offset++;
    }

    if (sameKey) {
      return;
    }

    this.key = key;
    let keySize = this.keySize = key.length;

    if (keySize !== 4 && keySize !== 6 && keySize !== 8) {
      throw new Error('Invalid aes key size=' + keySize);
    }

    let ksRows = this.ksRows = (keySize + 6 + 1) * 4;
    let ksRow;
    let invKsRow;

    let keySchedule = this.keySchedule = new Uint32Array(ksRows);
    let invKeySchedule = this.invKeySchedule = new Uint32Array(ksRows);
    let sbox = this.sBox;
    let rcon = this.rcon;

    let invSubMix = this.invSubMix;
    let invSubMix0 = invSubMix[0];
    let invSubMix1 = invSubMix[1];
    let invSubMix2 = invSubMix[2];
    let invSubMix3 = invSubMix[3];

    let prev;
    let t;

    for (ksRow = 0; ksRow < ksRows; ksRow++) {
      if (ksRow < keySize) {
        prev = keySchedule[ksRow] = key[ksRow];
        continue;
      }
      t = prev;

      if (ksRow % keySize === 0) {
        // Rot word
        t = (t << 8) | (t >>> 24);

        // Sub word
        t = (sbox[t >>> 24] << 24) | (sbox[(t >>> 16) & 0xff] << 16) | (sbox[(t >>> 8) & 0xff] << 8) | sbox[t & 0xff];

        // Mix Rcon
        t ^= rcon[(ksRow / keySize) | 0] << 24;
      } else if (keySize > 6 && ksRow % keySize === 4) {
        // Sub word
        t = (sbox[t >>> 24] << 24) | (sbox[(t >>> 16) & 0xff] << 16) | (sbox[(t >>> 8) & 0xff] << 8) | sbox[t & 0xff];
      }

      keySchedule[ksRow] = prev = (keySchedule[ksRow - keySize] ^ t) >>> 0;
    }

    for (invKsRow = 0; invKsRow < ksRows; invKsRow++) {
      ksRow = ksRows - invKsRow;
      if (invKsRow & 3) {
        t = keySchedule[ksRow];
      } else {
        t = keySchedule[ksRow - 4];
      }

      if (invKsRow < 4 || ksRow <= 4) {
        invKeySchedule[invKsRow] = t;
      } else {
        invKeySchedule[invKsRow] = invSubMix0[sbox[t >>> 24]] ^ invSubMix1[sbox[(t >>> 16) & 0xff]] ^ invSubMix2[sbox[(t >>> 8) & 0xff]] ^ invSubMix3[sbox[t & 0xff]];
      }

      invKeySchedule[invKsRow] = invKeySchedule[invKsRow] >>> 0;
    }
  }

  // Adding this as a method greatly improves performance.
  networkToHostOrderSwap (word) {
    return (word << 24) | ((word & 0xff00) << 8) | ((word & 0xff0000) >> 8) | (word >>> 24);
  }

  decrypt (inputArrayBuffer, offset, aesIV, removePKCS7Padding) {
    let nRounds = this.keySize + 6;
    let invKeySchedule = this.invKeySchedule;
    let invSBOX = this.invSBox;

    let invSubMix = this.invSubMix;
    let invSubMix0 = invSubMix[0];
    let invSubMix1 = invSubMix[1];
    let invSubMix2 = invSubMix[2];
    let invSubMix3 = invSubMix[3];

    let initVector = this.uint8ArrayToUint32Array_(aesIV);
    let initVector0 = initVector[0];
    let initVector1 = initVector[1];
    let initVector2 = initVector[2];
    let initVector3 = initVector[3];

    let inputInt32 = new Int32Array(inputArrayBuffer);
    let outputInt32 = new Int32Array(inputInt32.length);

    let t0, t1, t2, t3;
    let s0, s1, s2, s3;
    let inputWords0, inputWords1, inputWords2, inputWords3;

    let ksRow, i;
    let swapWord = this.networkToHostOrderSwap;

    while (offset < inputInt32.length) {
      inputWords0 = swapWord(inputInt32[offset]);
      inputWords1 = swapWord(inputInt32[offset + 1]);
      inputWords2 = swapWord(inputInt32[offset + 2]);
      inputWords3 = swapWord(inputInt32[offset + 3]);

      s0 = inputWords0 ^ invKeySchedule[0];
      s1 = inputWords3 ^ invKeySchedule[1];
      s2 = inputWords2 ^ invKeySchedule[2];
      s3 = inputWords1 ^ invKeySchedule[3];

      ksRow = 4;

      // Iterate through the rounds of decryption
      for (i = 1; i < nRounds; i++) {
        t0 = invSubMix0[s0 >>> 24] ^ invSubMix1[(s1 >> 16) & 0xff] ^ invSubMix2[(s2 >> 8) & 0xff] ^ invSubMix3[s3 & 0xff] ^ invKeySchedule[ksRow];
        t1 = invSubMix0[s1 >>> 24] ^ invSubMix1[(s2 >> 16) & 0xff] ^ invSubMix2[(s3 >> 8) & 0xff] ^ invSubMix3[s0 & 0xff] ^ invKeySchedule[ksRow + 1];
        t2 = invSubMix0[s2 >>> 24] ^ invSubMix1[(s3 >> 16) & 0xff] ^ invSubMix2[(s0 >> 8) & 0xff] ^ invSubMix3[s1 & 0xff] ^ invKeySchedule[ksRow + 2];
        t3 = invSubMix0[s3 >>> 24] ^ invSubMix1[(s0 >> 16) & 0xff] ^ invSubMix2[(s1 >> 8) & 0xff] ^ invSubMix3[s2 & 0xff] ^ invKeySchedule[ksRow + 3];
        // Update state
        s0 = t0;
        s1 = t1;
        s2 = t2;
        s3 = t3;

        ksRow = ksRow + 4;
      }

      // Shift rows, sub bytes, add round key
      t0 = ((invSBOX[s0 >>> 24] << 24) ^ (invSBOX[(s1 >> 16) & 0xff] << 16) ^ (invSBOX[(s2 >> 8) & 0xff] << 8) ^ invSBOX[s3 & 0xff]) ^ invKeySchedule[ksRow];
      t1 = ((invSBOX[s1 >>> 24] << 24) ^ (invSBOX[(s2 >> 16) & 0xff] << 16) ^ (invSBOX[(s3 >> 8) & 0xff] << 8) ^ invSBOX[s0 & 0xff]) ^ invKeySchedule[ksRow + 1];
      t2 = ((invSBOX[s2 >>> 24] << 24) ^ (invSBOX[(s3 >> 16) & 0xff] << 16) ^ (invSBOX[(s0 >> 8) & 0xff] << 8) ^ invSBOX[s1 & 0xff]) ^ invKeySchedule[ksRow + 2];
      t3 = ((invSBOX[s3 >>> 24] << 24) ^ (invSBOX[(s0 >> 16) & 0xff] << 16) ^ (invSBOX[(s1 >> 8) & 0xff] << 8) ^ invSBOX[s2 & 0xff]) ^ invKeySchedule[ksRow + 3];
      ksRow = ksRow + 3;

      // Write
      outputInt32[offset] = swapWord(t0 ^ initVector0);
      outputInt32[offset + 1] = swapWord(t3 ^ initVector1);
      outputInt32[offset + 2] = swapWord(t2 ^ initVector2);
      outputInt32[offset + 3] = swapWord(t1 ^ initVector3);

      // reset initVector to last 4 unsigned int
      initVector0 = inputWords0;
      initVector1 = inputWords1;
      initVector2 = inputWords2;
      initVector3 = inputWords3;

      offset = offset + 4;
    }

    return removePKCS7Padding ? removePadding(outputInt32.buffer) : outputInt32.buffer;
  }

  destroy () {
    this.key = undefined;
    this.keySize = undefined;
    this.ksRows = undefined;

    this.sBox = undefined;
    this.invSBox = undefined;
    this.subMix = undefined;
    this.invSubMix = undefined;
    this.keySchedule = undefined;
    this.invKeySchedule = undefined;

    this.rcon = undefined;
  }
}














// see https://stackoverflow.com/a/11237259/589493
const global = getSelfScope(); // safeguard for code that might run both on worker and main thread

class Decrypter {
  constructor (observer, config, { removePKCS7Padding = true } = {}) {
    this.logEnabled = true;
    this.observer = observer;
    this.config = config;
    this.removePKCS7Padding = removePKCS7Padding;
    // built in decryptor expects PKCS7 padding
    if (removePKCS7Padding) {
      try {
        const browserCrypto = global.crypto;
        if (browserCrypto) {
          this.subtle = browserCrypto.subtle || browserCrypto.webkitSubtle;
        }
      } catch (e) {}
    }
    this.disableWebCrypto = !this.subtle;
  }

  isSync () {
    return (this.disableWebCrypto && this.config.enableSoftwareAES);
  }

  decrypt (data, key, iv, callback) {
    if (this.disableWebCrypto && this.config.enableSoftwareAES) {
      if (this.logEnabled) {
        logger.log('JS AES decrypt');
        this.logEnabled = false;
      }
      let decryptor = this.decryptor;
      if (!decryptor) {
        this.decryptor = decryptor = new AESDecryptor();
      }

      decryptor.expandKey(key);
      callback(decryptor.decrypt(data, 0, iv, this.removePKCS7Padding));
    } else {
      if (this.logEnabled) {
        logger.log('WebCrypto AES decrypt');
        this.logEnabled = false;
      }
      const subtle = this.subtle;
      if (this.key !== key) {
        this.key = key;
        this.fastAesKey = new FastAESKey(subtle, key);
      }

      this.fastAesKey.expandKey()
        .then((aesKey) => {
          // decrypt using web crypto
          let crypto = new AESCrypto(subtle, iv);
          crypto.decrypt(data, aesKey)
            .catch((err) => {
              this.onWebCryptoError(err, data, key, iv, callback);
            })
            .then((result) => {
              callback(result);
            });
        })
        .catch((err) => {
          this.onWebCryptoError(err, data, key, iv, callback);
        });
    }
  }

  onWebCryptoError (err, data, key, iv, callback) {
    if (this.config.enableSoftwareAES) {
      logger.log('WebCrypto Error, disable WebCrypto API');
      this.disableWebCrypto = true;
      this.logEnabled = true;
      this.decrypt(data, key, iv, callback);
    } else {
      logger.error(`decrypting error : ${err.message}`);
      this.observer.trigger(HlsEvents.ERROR, { type: ErrorTypes.MEDIA_ERROR, details: ErrorDetails.FRAG_DECRYPT_ERROR, fatal: true, reason: err.message });
    }
  }

  destroy () {
    let decryptor = this.decryptor;
    if (decryptor) {
      decryptor.destroy();
      this.decryptor = undefined;
    }
  }
}



/**
 * SAMPLE-AES decrypter
*/



class SampleAesDecrypter {
  constructor (observer, config, decryptdata, discardEPB) {
    this.decryptdata = decryptdata;
    this.discardEPB = discardEPB;
    this.decrypter = new Decrypter(observer, config, { removePKCS7Padding: false });
  }

  decryptBuffer (encryptedData, callback) {
    this.decrypter.decrypt(encryptedData, this.decryptdata.key.buffer, this.decryptdata.iv.buffer, callback);
  }

  // AAC - encrypt all full 16 bytes blocks starting from offset 16
  decryptAacSample (samples, sampleIndex, callback, sync) {
    let curUnit = samples[sampleIndex].unit;
    let encryptedData = curUnit.subarray(16, curUnit.length - curUnit.length % 16);
    let encryptedBuffer = encryptedData.buffer.slice(
      encryptedData.byteOffset,
      encryptedData.byteOffset + encryptedData.length);

    let localthis = this;
    this.decryptBuffer(encryptedBuffer, function (decryptedData) {
      decryptedData = new Uint8Array(decryptedData);
      curUnit.set(decryptedData, 16);

      if (!sync) {
        localthis.decryptAacSamples(samples, sampleIndex + 1, callback);
      }
    });
  }

  decryptAacSamples (samples, sampleIndex, callback) {
    for (;; sampleIndex++) {
      if (sampleIndex >= samples.length) {
        callback();
        return;
      }

      if (samples[sampleIndex].unit.length < 32) {
        continue;
      }

      let sync = this.decrypter.isSync();

      this.decryptAacSample(samples, sampleIndex, callback, sync);

      if (!sync) {
        return;
      }
    }
  }

  // AVC - encrypt one 16 bytes block out of ten, starting from offset 32
  getAvcEncryptedData (decodedData) {
    let encryptedDataLen = Math.floor((decodedData.length - 48) / 160) * 16 + 16;
    let encryptedData = new Int8Array(encryptedDataLen);
    let outputPos = 0;
    for (let inputPos = 32; inputPos <= decodedData.length - 16; inputPos += 160, outputPos += 16) {
      encryptedData.set(decodedData.subarray(inputPos, inputPos + 16), outputPos);
    }

    return encryptedData;
  }

  getAvcDecryptedUnit (decodedData, decryptedData) {
    decryptedData = new Uint8Array(decryptedData);
    let inputPos = 0;
    for (let outputPos = 32; outputPos <= decodedData.length - 16; outputPos += 160, inputPos += 16) {
      decodedData.set(decryptedData.subarray(inputPos, inputPos + 16), outputPos);
    }

    return decodedData;
  }

  decryptAvcSample (samples, sampleIndex, unitIndex, callback, curUnit, sync) {
    let decodedData = this.discardEPB(curUnit.data);
    let encryptedData = this.getAvcEncryptedData(decodedData);
    let localthis = this;

    this.decryptBuffer(encryptedData.buffer, function (decryptedData) {
      curUnit.data = localthis.getAvcDecryptedUnit(decodedData, decryptedData);

      if (!sync) {
        localthis.decryptAvcSamples(samples, sampleIndex, unitIndex + 1, callback);
      }
    });
  }

  decryptAvcSamples (samples, sampleIndex, unitIndex, callback) {
    for (;; sampleIndex++, unitIndex = 0) {
      if (sampleIndex >= samples.length) {
        callback();
        return;
      }

      let curUnits = samples[sampleIndex].units;
      for (;; unitIndex++) {
        if (unitIndex >= curUnits.length) {
          break;
        }

        let curUnit = curUnits[unitIndex];
        if (curUnit.length <= 48 || (curUnit.type !== 1 && curUnit.type !== 5)) {
          continue;
        }

        let sync = this.decrypter.isSync();

        this.decryptAvcSample(samples, sampleIndex, unitIndex, callback, curUnit, sync);

        if (!sync) {
          return;
        }
      }
    }
  }
}



/**
 * highly optimized TS demuxer:
 * parse PAT, PMT
 * extract PES packet from audio and video PIDs
 * extract AVC/H264 NAL units and AAC/ADTS samples from PES packet
 * trigger the remuxer upon parsing completion
 * it also tries to workaround as best as it can audio codec switch (HE-AAC to AAC and vice versa), without having to restart the MediaSource.
 * it also controls the remuxing process :
 * upon discontinuity or level switch detection, it will also notifies the remuxer so that it can reset its state.
*/






// 




// We are using fixed track IDs for driving the MP4 remuxer
// instead of following the TS PIDs.
// There is no reason not to do this and some browsers/SourceBuffer-demuxers
// may not like if there are TrackID "switches"
// See https://github.com/video-dev/hls.js/issues/1331
// Here we are mapping our internal track types to constant MP4 track IDs
// With MSE currently one can only have one track of each, and we are muxing
// whatever video/audio rendition in them.
const RemuxerTrackIdConfig = {
  video: 1,
  audio: 2,
  id3: 3,
  text: 4
};

class TSDemuxer {
  constructor (observer, remuxer, config, typeSupported) {
    this.observer = observer;
    this.config = config;
    this.typeSupported = typeSupported;
    this.remuxer = remuxer;
    this.sampleAes = null;
    this.pmtUnknownTypes = {};
  }

  setDecryptData (decryptdata) {
    if ((decryptdata != null) && (decryptdata.key != null) && (decryptdata.method === 'SAMPLE-AES')) {
      this.sampleAes = new SampleAesDecrypter(this.observer, this.config, decryptdata, this.discardEPB);
    } else {
      this.sampleAes = null;
    }
  }

  static probe (data) {
    const syncOffset = TSDemuxer._syncOffset(data);
    if (syncOffset < 0) {
      return false;
    } else {
      if (syncOffset) {
        logger.warn(`MPEG2-TS detected but first sync word found @ offset ${syncOffset}, junk ahead ?`);
      }

      return true;
    }
  }

  static _syncOffset (data) {
    // scan 1000 first bytes
    const scanwindow = Math.min(1000, data.length - 3 * 188);
    let i = 0;
    while (i < scanwindow) {
      // a TS fragment should contain at least 3 TS packets, a PAT, a PMT, and one PID, each starting with 0x47
      if (data[i] === 0x47 && data[i + 188] === 0x47 && data[i + 2 * 188] === 0x47) {
        return i;
      } else {
        i++;
      }
    }
    return -1;
  }

  /**
   * Creates a track model internal to demuxer used to drive remuxing input
   *
   * @param {string} type 'audio' | 'video' | 'id3' | 'text'
   * @param {number} duration
   * @return {object} TSDemuxer's internal track model
   */
  static createTrack (type, duration) {
    return {
      container: type === 'video' || type === 'audio' ? 'video/mp2t' : undefined,
      type,
      id: RemuxerTrackIdConfig[type],
      pid: -1,
      inputTimeScale: 90000,
      sequenceNumber: 0,
      samples: [],
      dropped: type === 'video' ? 0 : undefined,
      isAAC: type === 'audio' ? true : undefined,
      duration: type === 'audio' ? duration : undefined
    };
  }

  /**
   * Initializes a new init segment on the demuxer/remuxer interface. Needed for discontinuities/track-switches (or at stream start)
   * Resets all internal track instances of the demuxer.
   *
   * @override Implements generic demuxing/remuxing interface (see DemuxerInline)
   * @param {object} initSegment
   * @param {string} audioCodec
   * @param {string} videoCodec
   * @param {number} duration (in TS timescale = 90kHz)
   */
  resetInitSegment (initSegment, audioCodec, videoCodec, duration) {
    this.pmtParsed = false;
    this._pmtId = -1;
    this.pmtUnknownTypes = {};

    this._avcTrack = TSDemuxer.createTrack('video', duration);
    this._audioTrack = TSDemuxer.createTrack('audio', duration);
    this._id3Track = TSDemuxer.createTrack('id3', duration);
    this._txtTrack = TSDemuxer.createTrack('text', duration);

    // flush any partial content
    this.aacOverFlow = null;
    this.aacLastPTS = null;
    this.avcSample = null;
    this.audioCodec = audioCodec;
    this.videoCodec = videoCodec;
    this._duration = duration;
  }

  /**
   *
   * @override
   */
  resetTimeStamp () {}

  // feed incoming data to the front of the parsing pipeline
  append (data, timeOffset, contiguous, accurateTimeOffset) {
    let start, len = data.length, stt, pid, atf, offset, pes,
      unknownPIDs = false;
    this.pmtUnknownTypes = {};
    this.contiguous = contiguous;
    let pmtParsed = this.pmtParsed,
      avcTrack = this._avcTrack,
      audioTrack = this._audioTrack,
      id3Track = this._id3Track,
      avcId = avcTrack.pid,
      audioId = audioTrack.pid,
      id3Id = id3Track.pid,
      pmtId = this._pmtId,
      avcData = avcTrack.pesData,
      audioData = audioTrack.pesData,
      id3Data = id3Track.pesData,
      parsePAT = this._parsePAT,
      parsePMT = this._parsePMT.bind(this),
      parsePES = this._parsePES,
      parseAVCPES = this._parseAVCPES.bind(this),
      parseAACPES = this._parseAACPES.bind(this),
      parseMPEGPES = this._parseMPEGPES.bind(this),
      parseID3PES = this._parseID3PES.bind(this);

    const syncOffset = TSDemuxer._syncOffset(data);

    // don't parse last TS packet if incomplete
    len -= (len + syncOffset) % 188;

    // loop through TS packets
    for (start = syncOffset; start < len; start += 188) {
      if (data[start] === 0x47) {
        stt = !!(data[start + 1] & 0x40);
        // pid is a 13-bit field starting at the last bit of TS[1]
        pid = ((data[start + 1] & 0x1f) << 8) + data[start + 2];
        atf = (data[start + 3] & 0x30) >> 4;
        // if an adaption field is present, its length is specified by the fifth byte of the TS packet header.
        if (atf > 1) {
          offset = start + 5 + data[start + 4];
          // continue if there is only adaptation field
          if (offset === (start + 188)) {
            continue;
          }
        } else {
          offset = start + 4;
        }
        switch (pid) {
        case avcId:
          if (stt) {
            if (avcData && (pes = parsePES(avcData))) {
              parseAVCPES(pes, false);
            }

            avcData = { data: [], size: 0 };
          }
          if (avcData) {
            avcData.data.push(data.subarray(offset, start + 188));
            avcData.size += start + 188 - offset;
          }
          break;
        case audioId:
          if (stt) {
            if (audioData && (pes = parsePES(audioData))) {
              if (audioTrack.isAAC) {
                parseAACPES(pes);
              } else {
                parseMPEGPES(pes);
              }
            }
            audioData = { data: [], size: 0 };
          }
          if (audioData) {
            audioData.data.push(data.subarray(offset, start + 188));
            audioData.size += start + 188 - offset;
          }
          break;
        case id3Id:
          if (stt) {
            if (id3Data && (pes = parsePES(id3Data))) {
              parseID3PES(pes);
            }

            id3Data = { data: [], size: 0 };
          }
          if (id3Data) {
            id3Data.data.push(data.subarray(offset, start + 188));
            id3Data.size += start + 188 - offset;
          }
          break;
        case 0:
          if (stt) {
            offset += data[offset] + 1;
          }

          pmtId = this._pmtId = parsePAT(data, offset);
          break;
        case pmtId:
          if (stt) {
            offset += data[offset] + 1;
          }

          let parsedPIDs = parsePMT(data, offset, this.typeSupported.mpeg === true || this.typeSupported.mp3 === true, this.sampleAes != null);

          // only update track id if track PID found while parsing PMT
          // this is to avoid resetting the PID to -1 in case
          // track PID transiently disappears from the stream
          // this could happen in case of transient missing audio samples for example
          // NOTE this is only the PID of the track as found in TS,
          // but we are not using this for MP4 track IDs.
          avcId = parsedPIDs.avc;
          if (avcId > 0) {
            avcTrack.pid = avcId;
          }

          audioId = parsedPIDs.audio;
          if (audioId > 0) {
            audioTrack.pid = audioId;
            audioTrack.isAAC = parsedPIDs.isAAC;
          }
          id3Id = parsedPIDs.id3;
          if (id3Id > 0) {
            id3Track.pid = id3Id;
          }

          if (unknownPIDs && !pmtParsed) {
            logger.log('reparse from beginning');
            unknownPIDs = false;
            // we set it to -188, the += 188 in the for loop will reset start to 0
            start = syncOffset - 188;
          }
          pmtParsed = this.pmtParsed = true;
          break;
        case 17:
        case 0x1fff:
          break;
        default:
          unknownPIDs = true;
          break;
        }
      } else {
        this.observer.trigger(HlsEvents.ERROR, { type: ErrorTypes.MEDIA_ERROR, details: ErrorDetails.FRAG_PARSING_ERROR, fatal: false, reason: 'TS packet did not start with 0x47' });
      }
    }
    // try to parse last PES packets
    if (avcData && (pes = parsePES(avcData))) {
      parseAVCPES(pes, true);
      avcTrack.pesData = null;
    } else {
      // either avcData null or PES truncated, keep it for next frag parsing
      avcTrack.pesData = avcData;
    }

    if (audioData && (pes = parsePES(audioData))) {
      if (audioTrack.isAAC) {
        parseAACPES(pes);
      } else {
        parseMPEGPES(pes);
      }

      audioTrack.pesData = null;
    } else {
      if (audioData && audioData.size) {
        logger.log('last AAC PES packet truncated,might overlap between fragments');
      }

      // either audioData null or PES truncated, keep it for next frag parsing
      audioTrack.pesData = audioData;
    }

    if (id3Data && (pes = parsePES(id3Data))) {
      parseID3PES(pes);
      id3Track.pesData = null;
    } else {
      // either id3Data null or PES truncated, keep it for next frag parsing
      id3Track.pesData = id3Data;
    }

    if (this.sampleAes == null) {
      this.remuxer.remux(audioTrack, avcTrack, id3Track, this._txtTrack, timeOffset, contiguous, accurateTimeOffset);
    } else {
      this.decryptAndRemux(audioTrack, avcTrack, id3Track, this._txtTrack, timeOffset, contiguous, accurateTimeOffset);
    }
  }

  decryptAndRemux (audioTrack, videoTrack, id3Track, textTrack, timeOffset, contiguous, accurateTimeOffset) {
    if (audioTrack.samples && audioTrack.isAAC) {
      let localthis = this;
      this.sampleAes.decryptAacSamples(audioTrack.samples, 0, function () {
        localthis.decryptAndRemuxAvc(audioTrack, videoTrack, id3Track, textTrack, timeOffset, contiguous, accurateTimeOffset);
      });
    } else {
      this.decryptAndRemuxAvc(audioTrack, videoTrack, id3Track, textTrack, timeOffset, contiguous, accurateTimeOffset);
    }
  }

  decryptAndRemuxAvc (audioTrack, videoTrack, id3Track, textTrack, timeOffset, contiguous, accurateTimeOffset) {
    if (videoTrack.samples) {
      let localthis = this;
      this.sampleAes.decryptAvcSamples(videoTrack.samples, 0, 0, function () {
        localthis.remuxer.remux(audioTrack, videoTrack, id3Track, textTrack, timeOffset, contiguous, accurateTimeOffset);
      });
    } else {
      this.remuxer.remux(audioTrack, videoTrack, id3Track, textTrack, timeOffset, contiguous, accurateTimeOffset);
    }
  }

  destroy () {
    this._initPTS = this._initDTS = undefined;
    this._duration = 0;
  }

  _parsePAT (data, offset) {
    // skip the PSI header and parse the first PMT entry
    return (data[offset + 10] & 0x1F) << 8 | data[offset + 11];
    // logger.log('PMT PID:'  + this._pmtId);
  }

  _trackUnknownPmt (type, logLevel, message) {
    // Only log unknown and unsupported stream types once per append or stream (by resetting this.pmtUnknownTypes)
    // For more information on elementary stream types see:
    // https://en.wikipedia.org/wiki/Program-specific_information#Elementary_stream_types
    const result = this.pmtUnknownTypes[type] || 0;
    if (result === 0) {
      this.pmtUnknownTypes[type] = 0;
      logLevel.call(logger, message);
    }
    this.pmtUnknownTypes[type]++;
    return result;
  }

  _parsePMT (data, offset, mpegSupported, isSampleAes) {
    let sectionLength, tableEnd, programInfoLength, pid, result = { audio: -1, avc: -1, id3: -1, isAAC: true };
    sectionLength = (data[offset + 1] & 0x0f) << 8 | data[offset + 2];
    tableEnd = offset + 3 + sectionLength - 4;
    // to determine where the table is, we have to figure out how
    // long the program info descriptors are
    programInfoLength = (data[offset + 10] & 0x0f) << 8 | data[offset + 11];
    // advance the offset to the first entry in the mapping table
    offset += 12 + programInfoLength;
    while (offset < tableEnd) {
      pid = (data[offset + 1] & 0x1F) << 8 | data[offset + 2];
      switch (data[offset]) {
      case 0xcf: // SAMPLE-AES AAC
        if (!isSampleAes) {
          this._trackUnknownPmt(data[offset], logger.warn, 'ADTS AAC with AES-128-CBC frame encryption found in unencrypted stream');
          break;
        }
        /* falls through */

        // ISO/IEC 13818-7 ADTS AAC (MPEG-2 lower bit-rate audio)
      case 0x0f:
        // logger.log('AAC PID:'  + pid);
        if (result.audio === -1) {
          result.audio = pid;
        }

        break;

        // Packetized metadata (ID3)
      case 0x15:
        // logger.log('ID3 PID:'  + pid);
        if (result.id3 === -1) {
          result.id3 = pid;
        }

        break;

      case 0xdb: // SAMPLE-AES AVC
        if (!isSampleAes) {
          this._trackUnknownPmt(data[offset], logger.warn, 'H.264 with AES-128-CBC slice encryption found in unencrypted stream');
          break;
        }
        /* falls through */

        // ITU-T Rec. H.264 and ISO/IEC 14496-10 (lower bit-rate video)
      case 0x1b:
        // logger.log('AVC PID:'  + pid);
        if (result.avc === -1) {
          result.avc = pid;
        }

        break;

        // ISO/IEC 11172-3 (MPEG-1 audio)
        // or ISO/IEC 13818-3 (MPEG-2 halved sample rate audio)
      case 0x03:
      case 0x04:
        // logger.log('MPEG PID:'  + pid);
        if (!mpegSupported) {
          this._trackUnknownPmt(data[offset], logger.warn, 'MPEG audio found, not supported in this browser');
        } else if (result.audio === -1) {
          result.audio = pid;
          result.isAAC = false;
        }
        break;

      case 0x24:
        this._trackUnknownPmt(data[offset], logger.warn, 'Unsupported HEVC stream type found');
        break;

      default:
        this._trackUnknownPmt(data[offset], logger.log, 'Unknown stream type:' + data[offset]);
        break;
      }
      // move to the next table entry
      // skip past the elementary stream descriptors, if present
      offset += ((data[offset + 3] & 0x0F) << 8 | data[offset + 4]) + 5;
    }
    return result;
  }

  _parsePES (stream) {
    let i = 0, frag, pesFlags, pesPrefix, pesLen, pesHdrLen, pesData, pesPts, pesDts, payloadStartOffset, data = stream.data;
    // safety check
    if (!stream || stream.size === 0) {
      return null;
    }

    // we might need up to 19 bytes to read PES header
    // if first chunk of data is less than 19 bytes, let's merge it with following ones until we get 19 bytes
    // usually only one merge is needed (and this is rare ...)
    while (data[0].length < 19 && data.length > 1) {
      let newData = new Uint8Array(data[0].length + data[1].length);
      newData.set(data[0]);
      newData.set(data[1], data[0].length);
      data[0] = newData;
      data.splice(1, 1);
    }
    // retrieve PTS/DTS from first fragment
    frag = data[0];
    pesPrefix = (frag[0] << 16) + (frag[1] << 8) + frag[2];
    if (pesPrefix === 1) {
      pesLen = (frag[4] << 8) + frag[5];
      // if PES parsed length is not zero and greater than total received length, stop parsing. PES might be truncated
      // minus 6 : PES header size
      if (pesLen && pesLen > stream.size - 6) {
        return null;
      }

      pesFlags = frag[7];
      if (pesFlags & 0xC0) {
        /* PES header described here : http://dvd.sourceforge.net/dvdinfo/pes-hdr.html
            as PTS / DTS is 33 bit we cannot use bitwise operator in JS,
            as Bitwise operators treat their operands as a sequence of 32 bits */
        pesPts = (frag[9] & 0x0E) * 536870912 +// 1 << 29
          (frag[10] & 0xFF) * 4194304 +// 1 << 22
          (frag[11] & 0xFE) * 16384 +// 1 << 14
          (frag[12] & 0xFF) * 128 +// 1 << 7
          (frag[13] & 0xFE) / 2;

        if (pesFlags & 0x40) {
          pesDts = (frag[14] & 0x0E) * 536870912 +// 1 << 29
            (frag[15] & 0xFF) * 4194304 +// 1 << 22
            (frag[16] & 0xFE) * 16384 +// 1 << 14
            (frag[17] & 0xFF) * 128 +// 1 << 7
            (frag[18] & 0xFE) / 2;

          if (pesPts - pesDts > 60 * 90000) {
            logger.warn(`${Math.round((pesPts - pesDts) / 90000)}s delta between PTS and DTS, align them`);
            pesPts = pesDts;
          }
        } else {
          pesDts = pesPts;
        }
      }
      pesHdrLen = frag[8];
      // 9 bytes : 6 bytes for PES header + 3 bytes for PES extension
      payloadStartOffset = pesHdrLen + 9;

      if (stream.size <= payloadStartOffset) {
        return null;
      }
      stream.size -= payloadStartOffset;
      // reassemble PES packet
      pesData = new Uint8Array(stream.size);
      for (let j = 0, dataLen = data.length; j < dataLen; j++) {
        frag = data[j];
        let len = frag.byteLength;
        if (payloadStartOffset) {
          if (payloadStartOffset > len) {
            // trim full frag if PES header bigger than frag
            payloadStartOffset -= len;
            continue;
          } else {
            // trim partial frag if PES header smaller than frag
            frag = frag.subarray(payloadStartOffset);
            len -= payloadStartOffset;
            payloadStartOffset = 0;
          }
        }
        pesData.set(frag, i);
        i += len;
      }
      if (pesLen) {
        // payload size : remove PES header + PES extension
        pesLen -= pesHdrLen + 3;
      }
      return { data: pesData, pts: pesPts, dts: pesDts, len: pesLen };
    } else {
      return null;
    }
  }

  pushAccesUnit (avcSample, avcTrack) {
    if (avcSample.units.length && avcSample.frame) {
      const samples = avcTrack.samples;
      const nbSamples = samples.length;
      // if sample does not have PTS/DTS, patch with last sample PTS/DTS
      if (isNaN(avcSample.pts)) {
        if (nbSamples) {
          const lastSample = samples[nbSamples - 1];
          avcSample.pts = lastSample.pts;
          avcSample.dts = lastSample.dts;
        } else {
          // dropping samples, no timestamp found
          avcTrack.dropped++;
          return;
        }
      }
      // only push AVC sample if starting with a keyframe is not mandatory OR
      //    if keyframe already found in this fragment OR
      //       keyframe found in last fragment (track.sps) AND
      //          samples already appended (we already found a keyframe in this fragment) OR fragment is contiguous
      if (!this.config.forceKeyFrameOnDiscontinuity ||
          avcSample.key === true ||
          (avcTrack.sps && (nbSamples || this.contiguous))) {
        avcSample.id = nbSamples;
        samples.push(avcSample);
      } else {
        // dropped samples, track it
        avcTrack.dropped++;
      }
    }
    if (avcSample.debug.length) {
      logger.log(avcSample.pts + '/' + avcSample.dts + ':' + avcSample.debug);
    }
  }

  _parseAVCPES (pes, last) {
    // logger.log('parse new PES');
    let track = this._avcTrack,
      units = this._parseAVCNALu(pes.data),
      debug = false,
      expGolombDecoder,
      avcSample = this.avcSample,
      push,
      spsfound = false,
      i,
      pushAccesUnit = this.pushAccesUnit.bind(this),
      createAVCSample = function (key, pts, dts, debug) {
        return { key: key, pts: pts, dts: dts, units: [], debug: debug };
      };
    // free pes.data to save up some memory
    pes.data = null;

    // if new NAL units found and last sample still there, let's push ...
    // this helps parsing streams with missing AUD (only do this if AUD never found)
    if (avcSample && units.length && !track.audFound) {
      pushAccesUnit(avcSample, track);
      avcSample = this.avcSample = createAVCSample(false, pes.pts, pes.dts, '');
    }

    units.forEach(unit => {
      switch (unit.type) {
      // NDR
      case 1:
        push = true;
        if (!avcSample) {
          avcSample = this.avcSample = createAVCSample(true, pes.pts, pes.dts, '');
        }

        if (debug) {
          avcSample.debug += 'NDR ';
        }

        avcSample.frame = true;
        let data = unit.data;
        // only check slice type to detect KF in case SPS found in same packet (any keyframe is preceded by SPS ...)
        if (spsfound && data.length > 4) {
          // retrieve slice type by parsing beginning of NAL unit (follow H264 spec, slice_header definition) to detect keyframe embedded in NDR
          let sliceType = new ExpGolomb(data).readSliceType();
          // 2 : I slice, 4 : SI slice, 7 : I slice, 9: SI slice
          // SI slice : A slice that is coded using intra prediction only and using quantisation of the prediction samples.
          // An SI slice can be coded such that its decoded samples can be constructed identically to an SP slice.
          // I slice: A slice that is not an SI slice that is decoded using intra prediction only.
          // if (sliceType === 2 || sliceType === 7) {
          if (sliceType === 2 || sliceType === 4 || sliceType === 7 || sliceType === 9) {
            avcSample.key = true;
          }
        }
        break;
        // IDR
      case 5:
        push = true;
        // handle PES not starting with AUD
        if (!avcSample) {
          avcSample = this.avcSample = createAVCSample(true, pes.pts, pes.dts, '');
        }

        if (debug) {
          avcSample.debug += 'IDR ';
        }

        avcSample.key = true;
        avcSample.frame = true;
        break;
        // SEI
      case 6:
        push = true;
        if (debug && avcSample) {
          avcSample.debug += 'SEI ';
        }

        expGolombDecoder = new ExpGolomb(this.discardEPB(unit.data));

        // skip frameType
        expGolombDecoder.readUByte();

        var payloadType = 0;
        var payloadSize = 0;
        var endOfCaptions = false;
        var b = 0;

        while (!endOfCaptions && expGolombDecoder.bytesAvailable > 1) {
          payloadType = 0;
          do {
            b = expGolombDecoder.readUByte();
            payloadType += b;
          } while (b === 0xFF);

          // Parse payload size.
          payloadSize = 0;
          do {
            b = expGolombDecoder.readUByte();
            payloadSize += b;
          } while (b === 0xFF);

          // TODO: there can be more than one payload in an SEI packet...
          // TODO: need to read type and size in a while loop to get them all
          if (payloadType === 4 && expGolombDecoder.bytesAvailable !== 0) {
            endOfCaptions = true;

            let countryCode = expGolombDecoder.readUByte();

            if (countryCode === 181) {
              let providerCode = expGolombDecoder.readUShort();

              if (providerCode === 49) {
                let userStructure = expGolombDecoder.readUInt();

                if (userStructure === 0x47413934) {
                  let userDataType = expGolombDecoder.readUByte();

                  // Raw CEA-608 bytes wrapped in CEA-708 packet
                  if (userDataType === 3) {
                    let firstByte = expGolombDecoder.readUByte();
                    let secondByte = expGolombDecoder.readUByte();

                    let totalCCs = 31 & firstByte;
                    let byteArray = [firstByte, secondByte];

                    for (i = 0; i < totalCCs; i++) {
                      // 3 bytes per CC
                      byteArray.push(expGolombDecoder.readUByte());
                      byteArray.push(expGolombDecoder.readUByte());
                      byteArray.push(expGolombDecoder.readUByte());
                    }

                    this._insertSampleInOrder(this._txtTrack.samples, { type: 3, pts: pes.pts, bytes: byteArray });
                  }
                }
              }
            }
          } else if (payloadType === 5 && expGolombDecoder.bytesAvailable !== 0) {
            endOfCaptions = true;

            if (payloadSize > 16) {
              const uuidStrArray = [];
              for (i = 0; i < 16; i++) {
                uuidStrArray.push(expGolombDecoder.readUByte().toString(16));

                if (i === 3 || i === 5 || i === 7 || i === 9) {
                  uuidStrArray.push('-');
                }
              }
              const length = payloadSize - 16;
              const userDataPayloadBytes = new Uint8Array(length);
              for (i = 0; i < length; i++) {
                userDataPayloadBytes[i] = expGolombDecoder.readUByte();
              }

              this._insertSampleInOrder(this._txtTrack.samples, {
                pts: pes.pts,
                payloadType: payloadType,
                uuid: uuidStrArray.join(''),
                userDataBytes: userDataPayloadBytes,
                userData: utf8ArrayToStr(userDataPayloadBytes.buffer)
              });
            }
          } else if (payloadSize < expGolombDecoder.bytesAvailable) {
            for (i = 0; i < payloadSize; i++) {
              expGolombDecoder.readUByte();
            }
          }
        }
        break;
        // SPS
      case 7:
        push = true;
        spsfound = true;
        if (debug && avcSample) {
          avcSample.debug += 'SPS ';
        }

        if (!track.sps) {
          expGolombDecoder = new ExpGolomb(unit.data);
          let config = expGolombDecoder.readSPS();
          track.width = config.width;
          track.height = config.height;
          track.pixelRatio = config.pixelRatio;
          track.sps = [unit.data];
          track.duration = this._duration;
          let codecarray = unit.data.subarray(1, 4);
          let codecstring = 'avc1.';
          for (i = 0; i < 3; i++) {
            let h = codecarray[i].toString(16);
            if (h.length < 2) {
              h = '0' + h;
            }

            codecstring += h;
          }
          track.codec = codecstring;
        }
        break;
        // PPS
      case 8:
        push = true;
        if (debug && avcSample) {
          avcSample.debug += 'PPS ';
        }

        if (!track.pps) {
          track.pps = [unit.data];
        }

        break;
        // AUD
      case 9:
        push = false;
        track.audFound = true;
        if (avcSample) {
          pushAccesUnit(avcSample, track);
        }

        avcSample = this.avcSample = createAVCSample(false, pes.pts, pes.dts, debug ? 'AUD ' : '');
        break;
        // Filler Data
      case 12:
        push = false;
        break;
      default:
        push = false;
        if (avcSample) {
          avcSample.debug += 'unknown NAL ' + unit.type + ' ';
        }

        break;
      }
      if (avcSample && push) {
        let units = avcSample.units;
        units.push(unit);
      }
    });
    // if last PES packet, push samples
    if (last && avcSample) {
      pushAccesUnit(avcSample, track);
      this.avcSample = null;
    }
  }

  _insertSampleInOrder (arr, data) {
    let len = arr.length;
    if (len > 0) {
      if (data.pts >= arr[len - 1].pts) {
        arr.push(data);
      } else {
        for (let pos = len - 1; pos >= 0; pos--) {
          if (data.pts < arr[pos].pts) {
            arr.splice(pos, 0, data);
            break;
          }
        }
      }
    } else {
      arr.push(data);
    }
  }

  _getLastNalUnit () {
    let avcSample = this.avcSample, lastUnit;
    // try to fallback to previous sample if current one is empty
    if (!avcSample || avcSample.units.length === 0) {
      let track = this._avcTrack, samples = track.samples;
      avcSample = samples[samples.length - 1];
    }
    if (avcSample) {
      let units = avcSample.units;
      lastUnit = units[units.length - 1];
    }
    return lastUnit;
  }

  _parseAVCNALu (array) {
    let i = 0, len = array.byteLength, value, overflow, track = this._avcTrack, state = track.naluState || 0, lastState = state;
    let units = [], unit, unitType, lastUnitStart = -1, lastUnitType;
    // logger.log('PES:' + Hex.hexDump(array));

    if (state === -1) {
    // special use case where we found 3 or 4-byte start codes exactly at the end of previous PES packet
      lastUnitStart = 0;
      // NALu type is value read from offset 0
      lastUnitType = array[0] & 0x1f;
      state = 0;
      i = 1;
    }

    while (i < len) {
      value = array[i++];
      // optimization. state 0 and 1 are the predominant case. let's handle them outside of the switch/case
      if (!state) {
        state = value ? 0 : 1;
        continue;
      }
      if (state === 1) {
        state = value ? 0 : 2;
        continue;
      }
      // here we have state either equal to 2 or 3
      if (!value) {
        state = 3;
      } else if (value === 1) {
        if (lastUnitStart >= 0) {
          unit = { data: array.subarray(lastUnitStart, i - state - 1), type: lastUnitType };
          // logger.log('pushing NALU, type/size:' + unit.type + '/' + unit.data.byteLength);
          units.push(unit);
        } else {
          // lastUnitStart is undefined => this is the first start code found in this PES packet
          // first check if start code delimiter is overlapping between 2 PES packets,
          // ie it started in last packet (lastState not zero)
          // and ended at the beginning of this PES packet (i <= 4 - lastState)
          let lastUnit = this._getLastNalUnit();
          if (lastUnit) {
            if (lastState && (i <= 4 - lastState)) {
              // start delimiter overlapping between PES packets
              // strip start delimiter bytes from the end of last NAL unit
              // check if lastUnit had a state different from zero
              if (lastUnit.state) {
                // strip last bytes
                lastUnit.data = lastUnit.data.subarray(0, lastUnit.data.byteLength - lastState);
              }
            }
            // If NAL units are not starting right at the beginning of the PES packet, push preceding data into previous NAL unit.
            overflow = i - state - 1;
            if (overflow > 0) {
              // logger.log('first NALU found with overflow:' + overflow);
              let tmp = new Uint8Array(lastUnit.data.byteLength + overflow);
              tmp.set(lastUnit.data, 0);
              tmp.set(array.subarray(0, overflow), lastUnit.data.byteLength);
              lastUnit.data = tmp;
            }
          }
        }
        // check if we can read unit type
        if (i < len) {
          unitType = array[i] & 0x1f;
          // logger.log('find NALU @ offset:' + i + ',type:' + unitType);
          lastUnitStart = i;
          lastUnitType = unitType;
          state = 0;
        } else {
          // not enough byte to read unit type. let's read it on next PES parsing
          state = -1;
        }
      } else {
        state = 0;
      }
    }
    if (lastUnitStart >= 0 && state >= 0) {
      unit = { data: array.subarray(lastUnitStart, len), type: lastUnitType, state: state };
      units.push(unit);
      // logger.log('pushing NALU, type/size/state:' + unit.type + '/' + unit.data.byteLength + '/' + state);
    }
    // no NALu found
    if (units.length === 0) {
      // append pes.data to previous NAL unit
      let lastUnit = this._getLastNalUnit();
      if (lastUnit) {
        let tmp = new Uint8Array(lastUnit.data.byteLength + array.byteLength);
        tmp.set(lastUnit.data, 0);
        tmp.set(array, lastUnit.data.byteLength);
        lastUnit.data = tmp;
      }
    }
    track.naluState = state;
    return units;
  }

  /**
   * remove Emulation Prevention bytes from a RBSP
   */
  discardEPB (data) {
    let length = data.byteLength,
      EPBPositions = [],
      i = 1,
      newLength, newData;

    // Find all `Emulation Prevention Bytes`
    while (i < length - 2) {
      if (data[i] === 0 &&
          data[i + 1] === 0 &&
          data[i + 2] === 0x03) {
        EPBPositions.push(i + 2);
        i += 2;
      } else {
        i++;
      }
    }

    // If no Emulation Prevention Bytes were found just return the original
    // array
    if (EPBPositions.length === 0) {
      return data;
    }

    // Create a new array to hold the NAL unit data
    newLength = length - EPBPositions.length;
    newData = new Uint8Array(newLength);
    let sourceIndex = 0;

    for (i = 0; i < newLength; sourceIndex++, i++) {
      if (sourceIndex === EPBPositions[0]) {
        // Skip this byte
        sourceIndex++;
        // Remove this position index
        EPBPositions.shift();
      }
      newData[i] = data[sourceIndex];
    }
    return newData;
  }

  _parseAACPES (pes) {
    let track = this._audioTrack,
      data = pes.data,
      pts = pes.pts,
      startOffset = 0,
      aacOverFlow = this.aacOverFlow,
      aacLastPTS = this.aacLastPTS,
      frameDuration, frameIndex, offset, stamp, len;
    if (aacOverFlow) {
      let tmp = new Uint8Array(aacOverFlow.byteLength + data.byteLength);
      tmp.set(aacOverFlow, 0);
      tmp.set(data, aacOverFlow.byteLength);
      // logger.log(`AAC: append overflowing ${aacOverFlow.byteLength} bytes to beginning of new PES`);
      data = tmp;
    }
    // look for ADTS header (0xFFFx)
    for (offset = startOffset, len = data.length; offset < len - 1; offset++) {
      if (ADTS.isHeader(data, offset)) {
        break;
      }
    }

    if (( offset > 0 ) && ( offset < len - 1)) {
        // console.warn( `AAC PES did not start with ADTS header,offset:${offset}` ) ;
        offset = 0 ;
    }
    else {
    // if ADTS header does not start straight from the beginning of the PES payload, raise an error
    if (offset) {
      let reason, fatal;
      if (offset < len - 1) {
        reason = `AAC PES did not start with ADTS header,offset:${offset}`;
        fatal = false;
      } else {
        reason = 'no ADTS header found in AAC PES';
        fatal = true;
      }
      logger.warn(`parsing error:${reason}`);
      this.observer.trigger(HlsEvents.ERROR, { type: ErrorTypes.MEDIA_ERROR, details: ErrorDetails.FRAG_PARSING_ERROR, fatal: fatal, reason: reason });
      if (fatal) {
        return;
      }
    }
    }

    ADTS.initTrackConfig(track, this.observer, data, offset, this.audioCodec);
    frameIndex = 0;
    frameDuration = ADTS.getFrameDuration(track.samplerate);

    // if last AAC frame is overflowing, we should ensure timestamps are contiguous:
    // first sample PTS should be equal to last sample PTS + frameDuration
    if (aacOverFlow && aacLastPTS) {
      let newPTS = aacLastPTS + frameDuration;
      if (Math.abs(newPTS - pts) > 1) {
        logger.log(`AAC: align PTS for overlapping frames by ${Math.round((newPTS - pts) / 90)}`);
        pts = newPTS;
      }
    }

    // scan for aac samples
    while (offset < len) {
      if (ADTS.isHeader(data, offset)) {
        if ((offset + 5) < len) {
          const frame = ADTS.appendFrame(track, data, offset, pts, frameIndex);
          if (frame) {
            offset += frame.length;
            stamp = frame.sample.pts;
            frameIndex++;
            continue;
          }
        }
        // We are at an ADTS header, but do not have enough data for a frame
        // Remaining data will be added to aacOverFlow
        break;
      } else {
        // nothing found, keep looking
        offset++;
      }
    }

    if (offset < len) {
      aacOverFlow = data.subarray(offset, len);
      // logger.log(`AAC: overflow detected:${len-offset}`);
    } else {
      aacOverFlow = null;
    }

    this.aacOverFlow = aacOverFlow;
    this.aacLastPTS = stamp;
  }

  _parseMPEGPES (pes) {
    let data = pes.data;
    let length = data.length;
    let frameIndex = 0;
    let offset = 0;
    let pts = pes.pts;

    while (offset < length) {
      if (MpegAudio.isHeader(data, offset)) {
        let frame = MpegAudio.appendFrame(this._audioTrack, data, offset, pts, frameIndex);
        if (frame) {
          offset += frame.length;
          frameIndex++;
        } else {
          // logger.log('Unable to parse Mpeg audio frame');
          break;
        }
      } else {
        // nothing found, keep looking
        offset++;
      }
    }
  }

  _parseID3PES (pes) {
    this._id3Track.samples.push(pes);
  }
}



/**
 *  AAC helper
 */

class AAC {
  static getSilentFrame (codec, channelCount) {
    switch (codec) {
    case 'mp4a.40.2':
      if (channelCount === 1) {
        return new Uint8Array([0x00, 0xc8, 0x00, 0x80, 0x23, 0x80]);
      } else if (channelCount === 2) {
        return new Uint8Array([0x21, 0x00, 0x49, 0x90, 0x02, 0x19, 0x00, 0x23, 0x80]);
      } else if (channelCount === 3) {
        return new Uint8Array([0x00, 0xc8, 0x00, 0x80, 0x20, 0x84, 0x01, 0x26, 0x40, 0x08, 0x64, 0x00, 0x8e]);
      } else if (channelCount === 4) {
        return new Uint8Array([0x00, 0xc8, 0x00, 0x80, 0x20, 0x84, 0x01, 0x26, 0x40, 0x08, 0x64, 0x00, 0x80, 0x2c, 0x80, 0x08, 0x02, 0x38]);
      } else if (channelCount === 5) {
        return new Uint8Array([0x00, 0xc8, 0x00, 0x80, 0x20, 0x84, 0x01, 0x26, 0x40, 0x08, 0x64, 0x00, 0x82, 0x30, 0x04, 0x99, 0x00, 0x21, 0x90, 0x02, 0x38]);
      } else if (channelCount === 6) {
        return new Uint8Array([0x00, 0xc8, 0x00, 0x80, 0x20, 0x84, 0x01, 0x26, 0x40, 0x08, 0x64, 0x00, 0x82, 0x30, 0x04, 0x99, 0x00, 0x21, 0x90, 0x02, 0x00, 0xb2, 0x00, 0x20, 0x08, 0xe0]);
      }

      break;
    // handle HE-AAC below (mp4a.40.5 / mp4a.40.29)
    default:
      if (channelCount === 1) {
        // ffmpeg -y -f lavfi -i "aevalsrc=0:d=0.05" -c:a libfdk_aac -profile:a aac_he -b:a 4k output.aac && hexdump -v -e '16/1 "0x%x," "\n"' -v output.aac
        return new Uint8Array([0x1, 0x40, 0x22, 0x80, 0xa3, 0x4e, 0xe6, 0x80, 0xba, 0x8, 0x0, 0x0, 0x0, 0x1c, 0x6, 0xf1, 0xc1, 0xa, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5e]);
      } else if (channelCount === 2) {
        // ffmpeg -y -f lavfi -i "aevalsrc=0|0:d=0.05" -c:a libfdk_aac -profile:a aac_he_v2 -b:a 4k output.aac && hexdump -v -e '16/1 "0x%x," "\n"' -v output.aac
        return new Uint8Array([0x1, 0x40, 0x22, 0x80, 0xa3, 0x5e, 0xe6, 0x80, 0xba, 0x8, 0x0, 0x0, 0x0, 0x0, 0x95, 0x0, 0x6, 0xf1, 0xa1, 0xa, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5e]);
      } else if (channelCount === 3) {
        // ffmpeg -y -f lavfi -i "aevalsrc=0|0|0:d=0.05" -c:a libfdk_aac -profile:a aac_he_v2 -b:a 4k output.aac && hexdump -v -e '16/1 "0x%x," "\n"' -v output.aac
        return new Uint8Array([0x1, 0x40, 0x22, 0x80, 0xa3, 0x5e, 0xe6, 0x80, 0xba, 0x8, 0x0, 0x0, 0x0, 0x0, 0x95, 0x0, 0x6, 0xf1, 0xa1, 0xa, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5a, 0x5e]);
      }
      break;
    }
    return null;
  }
}



/**
 * Generate MP4 Box
*/

const UINT32_MAX = Math.pow(2, 32) - 1;

class MP4 {
  static init () {
    MP4.types = {
      avc1: [], // codingname
      avcC: [],
      btrt: [],
      dinf: [],
      dref: [],
      esds: [],
      ftyp: [],
      hdlr: [],
      mdat: [],
      mdhd: [],
      mdia: [],
      mfhd: [],
      minf: [],
      moof: [],
      moov: [],
      mp4a: [],
      '.mp3': [],
      mvex: [],
      mvhd: [],
      pasp: [],
      sdtp: [],
      stbl: [],
      stco: [],
      stsc: [],
      stsd: [],
      stsz: [],
      stts: [],
      tfdt: [],
      tfhd: [],
      traf: [],
      trak: [],
      trun: [],
      trex: [],
      tkhd: [],
      vmhd: [],
      smhd: []
    };

    let i;
    for (i in MP4.types) {
      if (MP4.types.hasOwnProperty(i)) {
        MP4.types[i] = [
          i.charCodeAt(0),
          i.charCodeAt(1),
          i.charCodeAt(2),
          i.charCodeAt(3)
        ];
      }
    }

    let videoHdlr = new Uint8Array([
      0x00, // version 0
      0x00, 0x00, 0x00, // flags
      0x00, 0x00, 0x00, 0x00, // pre_defined
      0x76, 0x69, 0x64, 0x65, // handler_type: 'vide'
      0x00, 0x00, 0x00, 0x00, // reserved
      0x00, 0x00, 0x00, 0x00, // reserved
      0x00, 0x00, 0x00, 0x00, // reserved
      0x56, 0x69, 0x64, 0x65,
      0x6f, 0x48, 0x61, 0x6e,
      0x64, 0x6c, 0x65, 0x72, 0x00 // name: 'VideoHandler'
    ]);

    let audioHdlr = new Uint8Array([
      0x00, // version 0
      0x00, 0x00, 0x00, // flags
      0x00, 0x00, 0x00, 0x00, // pre_defined
      0x73, 0x6f, 0x75, 0x6e, // handler_type: 'soun'
      0x00, 0x00, 0x00, 0x00, // reserved
      0x00, 0x00, 0x00, 0x00, // reserved
      0x00, 0x00, 0x00, 0x00, // reserved
      0x53, 0x6f, 0x75, 0x6e,
      0x64, 0x48, 0x61, 0x6e,
      0x64, 0x6c, 0x65, 0x72, 0x00 // name: 'SoundHandler'
    ]);

    MP4.HDLR_TYPES = {
      'video': videoHdlr,
      'audio': audioHdlr
    };

    let dref = new Uint8Array([
      0x00, // version 0
      0x00, 0x00, 0x00, // flags
      0x00, 0x00, 0x00, 0x01, // entry_count
      0x00, 0x00, 0x00, 0x0c, // entry_size
      0x75, 0x72, 0x6c, 0x20, // 'url' type
      0x00, // version 0
      0x00, 0x00, 0x01 // entry_flags
    ]);

    let stco = new Uint8Array([
      0x00, // version
      0x00, 0x00, 0x00, // flags
      0x00, 0x00, 0x00, 0x00 // entry_count
    ]);

    MP4.STTS = MP4.STSC = MP4.STCO = stco;

    MP4.STSZ = new Uint8Array([
      0x00, // version
      0x00, 0x00, 0x00, // flags
      0x00, 0x00, 0x00, 0x00, // sample_size
      0x00, 0x00, 0x00, 0x00 // sample_count
    ]);
    MP4.VMHD = new Uint8Array([
      0x00, // version
      0x00, 0x00, 0x01, // flags
      0x00, 0x00, // graphicsmode
      0x00, 0x00,
      0x00, 0x00,
      0x00, 0x00 // opcolor
    ]);
    MP4.SMHD = new Uint8Array([
      0x00, // version
      0x00, 0x00, 0x00, // flags
      0x00, 0x00, // balance
      0x00, 0x00 // reserved
    ]);

    MP4.STSD = new Uint8Array([
      0x00, // version 0
      0x00, 0x00, 0x00, // flags
      0x00, 0x00, 0x00, 0x01]);// entry_count

    let majorBrand = new Uint8Array([105, 115, 111, 109]); // isom
    let avc1Brand = new Uint8Array([97, 118, 99, 49]); // avc1
    let minorVersion = new Uint8Array([0, 0, 0, 1]);

    MP4.FTYP = MP4.box(MP4.types.ftyp, majorBrand, minorVersion, majorBrand, avc1Brand);
    MP4.DINF = MP4.box(MP4.types.dinf, MP4.box(MP4.types.dref, dref));
  }

  static box (type) {
    let
      payload = Array.prototype.slice.call(arguments, 1),
      size = 8,
      i = payload.length,
      len = i,
      result;
    // calculate the total size we need to allocate
    while (i--) {
      size += payload[i].byteLength;
    }

    result = new Uint8Array(size);
    result[0] = (size >> 24) & 0xff;
    result[1] = (size >> 16) & 0xff;
    result[2] = (size >> 8) & 0xff;
    result[3] = size & 0xff;
    result.set(type, 4);
    // copy the payload into the result
    for (i = 0, size = 8; i < len; i++) {
      // copy payload[i] array @ offset size
      result.set(payload[i], size);
      size += payload[i].byteLength;
    }
    return result;
  }

  static hdlr (type) {
    return MP4.box(MP4.types.hdlr, MP4.HDLR_TYPES[type]);
  }

  static mdat (data) {
    return MP4.box(MP4.types.mdat, data);
  }

  static mdhd (timescale, duration) {
    duration *= timescale;
    const upperWordDuration = Math.floor(duration / (UINT32_MAX + 1));
    const lowerWordDuration = Math.floor(duration % (UINT32_MAX + 1));
    return MP4.box(MP4.types.mdhd, new Uint8Array([
      0x01, // version 1
      0x00, 0x00, 0x00, // flags
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, // creation_time
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, // modification_time
      (timescale >> 24) & 0xFF,
      (timescale >> 16) & 0xFF,
      (timescale >> 8) & 0xFF,
      timescale & 0xFF, // timescale
      (upperWordDuration >> 24),
      (upperWordDuration >> 16) & 0xFF,
      (upperWordDuration >> 8) & 0xFF,
      upperWordDuration & 0xFF,
      (lowerWordDuration >> 24),
      (lowerWordDuration >> 16) & 0xFF,
      (lowerWordDuration >> 8) & 0xFF,
      lowerWordDuration & 0xFF,
      0x55, 0xc4, // 'und' language (undetermined)
      0x00, 0x00
    ]));
  }

  static mdia (track) {
    return MP4.box(MP4.types.mdia, MP4.mdhd(track.timescale, track.duration), MP4.hdlr(track.type), MP4.minf(track));
  }

  static mfhd (sequenceNumber) {
    return MP4.box(MP4.types.mfhd, new Uint8Array([
      0x00,
      0x00, 0x00, 0x00, // flags
      (sequenceNumber >> 24),
      (sequenceNumber >> 16) & 0xFF,
      (sequenceNumber >> 8) & 0xFF,
      sequenceNumber & 0xFF // sequence_number
    ]));
  }

  static minf (track) {
    if (track.type === 'audio') {
      return MP4.box(MP4.types.minf, MP4.box(MP4.types.smhd, MP4.SMHD), MP4.DINF, MP4.stbl(track));
    } else {
      return MP4.box(MP4.types.minf, MP4.box(MP4.types.vmhd, MP4.VMHD), MP4.DINF, MP4.stbl(track));
    }
  }

  static moof (sn, baseMediaDecodeTime, track) {
    return MP4.box(MP4.types.moof, MP4.mfhd(sn), MP4.traf(track, baseMediaDecodeTime));
  }
  /**
 * @param tracks... (optional) {array} the tracks associated with this movie
 */
  static moov (tracks) {
    let
      i = tracks.length,
      boxes = [];

    while (i--) {
      boxes[i] = MP4.trak(tracks[i]);
    }

    return MP4.box.apply(null, [MP4.types.moov, MP4.mvhd(tracks[0].timescale, tracks[0].duration)].concat(boxes).concat(MP4.mvex(tracks)));
  }

  static mvex (tracks) {
    let
      i = tracks.length,
      boxes = [];

    while (i--) {
      boxes[i] = MP4.trex(tracks[i]);
    }

    return MP4.box.apply(null, [MP4.types.mvex].concat(boxes));
  }

  static mvhd (timescale, duration) {
    duration *= timescale;
    const upperWordDuration = Math.floor(duration / (UINT32_MAX + 1));
    const lowerWordDuration = Math.floor(duration % (UINT32_MAX + 1));
    let
      bytes = new Uint8Array([
        0x01, // version 1
        0x00, 0x00, 0x00, // flags
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, // creation_time
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, // modification_time
        (timescale >> 24) & 0xFF,
        (timescale >> 16) & 0xFF,
        (timescale >> 8) & 0xFF,
        timescale & 0xFF, // timescale
        (upperWordDuration >> 24),
        (upperWordDuration >> 16) & 0xFF,
        (upperWordDuration >> 8) & 0xFF,
        upperWordDuration & 0xFF,
        (lowerWordDuration >> 24),
        (lowerWordDuration >> 16) & 0xFF,
        (lowerWordDuration >> 8) & 0xFF,
        lowerWordDuration & 0xFF,
        0x00, 0x01, 0x00, 0x00, // 1.0 rate
        0x01, 0x00, // 1.0 volume
        0x00, 0x00, // reserved
        0x00, 0x00, 0x00, 0x00, // reserved
        0x00, 0x00, 0x00, 0x00, // reserved
        0x00, 0x01, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x01, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x40, 0x00, 0x00, 0x00, // transformation: unity matrix
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, // pre_defined
        0xff, 0xff, 0xff, 0xff // next_track_ID
      ]);
    return MP4.box(MP4.types.mvhd, bytes);
  }

  static sdtp (track) {
    let
      samples = track.samples || [],
      bytes = new Uint8Array(4 + samples.length),
      flags,
      i;
    // leave the full box header (4 bytes) all zero
    // write the sample table
    for (i = 0; i < samples.length; i++) {
      flags = samples[i].flags;
      bytes[i + 4] = (flags.dependsOn << 4) |
        (flags.isDependedOn << 2) |
        (flags.hasRedundancy);
    }

    return MP4.box(MP4.types.sdtp, bytes);
  }

  static stbl (track) {
    return MP4.box(MP4.types.stbl, MP4.stsd(track), MP4.box(MP4.types.stts, MP4.STTS), MP4.box(MP4.types.stsc, MP4.STSC), MP4.box(MP4.types.stsz, MP4.STSZ), MP4.box(MP4.types.stco, MP4.STCO));
  }

  static avc1 (track) {
    let sps = [], pps = [], i, data, len;
    // assemble the SPSs

    for (i = 0; i < track.sps.length; i++) {
      data = track.sps[i];
      len = data.byteLength;
      sps.push((len >>> 8) & 0xFF);
      sps.push((len & 0xFF));

      // SPS
      sps = sps.concat(Array.prototype.slice.call(data));
    }

    // assemble the PPSs
    for (i = 0; i < track.pps.length; i++) {
      data = track.pps[i];
      len = data.byteLength;
      pps.push((len >>> 8) & 0xFF);
      pps.push((len & 0xFF));

      pps = pps.concat(Array.prototype.slice.call(data));
    }

    let avcc = MP4.box(MP4.types.avcC, new Uint8Array([
        0x01, // version
        sps[3], // profile
        sps[4], // profile compat
        sps[5], // level
        0xfc | 3, // lengthSizeMinusOne, hard-coded to 4 bytes
        0xE0 | track.sps.length // 3bit reserved (111) + numOfSequenceParameterSets
      ].concat(sps).concat([
        track.pps.length // numOfPictureParameterSets
      ]).concat(pps))), // "PPS"
      width = track.width,
      height = track.height,
      hSpacing = track.pixelRatio[0],
      vSpacing = track.pixelRatio[1];

    return MP4.box(MP4.types.avc1, new Uint8Array([
      0x00, 0x00, 0x00, // reserved
      0x00, 0x00, 0x00, // reserved
      0x00, 0x01, // data_reference_index
      0x00, 0x00, // pre_defined
      0x00, 0x00, // reserved
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, // pre_defined
      (width >> 8) & 0xFF,
      width & 0xff, // width
      (height >> 8) & 0xFF,
      height & 0xff, // height
      0x00, 0x48, 0x00, 0x00, // horizresolution
      0x00, 0x48, 0x00, 0x00, // vertresolution
      0x00, 0x00, 0x00, 0x00, // reserved
      0x00, 0x01, // frame_count
      0x12,
      0x64, 0x61, 0x69, 0x6C, // dailymotion/hls.js
      0x79, 0x6D, 0x6F, 0x74,
      0x69, 0x6F, 0x6E, 0x2F,
      0x68, 0x6C, 0x73, 0x2E,
      0x6A, 0x73, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, // compressorname
      0x00, 0x18, // depth = 24
      0x11, 0x11]), // pre_defined = -1
    avcc,
    MP4.box(MP4.types.btrt, new Uint8Array([
      0x00, 0x1c, 0x9c, 0x80, // bufferSizeDB
      0x00, 0x2d, 0xc6, 0xc0, // maxBitrate
      0x00, 0x2d, 0xc6, 0xc0])), // avgBitrate
    MP4.box(MP4.types.pasp, new Uint8Array([
      (hSpacing >> 24), // hSpacing
      (hSpacing >> 16) & 0xFF,
      (hSpacing >> 8) & 0xFF,
      hSpacing & 0xFF,
      (vSpacing >> 24), // vSpacing
      (vSpacing >> 16) & 0xFF,
      (vSpacing >> 8) & 0xFF,
      vSpacing & 0xFF]))
    );
  }

  static esds (track) {
    let configlen = track.config.length;
    return new Uint8Array([
      0x00, // version 0
      0x00, 0x00, 0x00, // flags

      0x03, // descriptor_type
      0x17 + configlen, // length
      0x00, 0x01, // es_id
      0x00, // stream_priority

      0x04, // descriptor_type
      0x0f + configlen, // length
      0x40, // codec : mpeg4_audio
      0x15, // stream_type
      0x00, 0x00, 0x00, // buffer_size
      0x00, 0x00, 0x00, 0x00, // maxBitrate
      0x00, 0x00, 0x00, 0x00, // avgBitrate

      0x05 // descriptor_type
    ].concat([configlen]).concat(track.config).concat([0x06, 0x01, 0x02])); // GASpecificConfig)); // length + audio config descriptor
  }

  static mp4a (track) {
    let samplerate = track.samplerate;
    return MP4.box(MP4.types.mp4a, new Uint8Array([
      0x00, 0x00, 0x00, // reserved
      0x00, 0x00, 0x00, // reserved
      0x00, 0x01, // data_reference_index
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, // reserved
      0x00, track.channelCount, // channelcount
      0x00, 0x10, // sampleSize:16bits
      0x00, 0x00, 0x00, 0x00, // reserved2
      (samplerate >> 8) & 0xFF,
      samplerate & 0xff, //
      0x00, 0x00]),
    MP4.box(MP4.types.esds, MP4.esds(track)));
  }

  static mp3 (track) {
    let samplerate = track.samplerate;
    return MP4.box(MP4.types['.mp3'], new Uint8Array([
      0x00, 0x00, 0x00, // reserved
      0x00, 0x00, 0x00, // reserved
      0x00, 0x01, // data_reference_index
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, // reserved
      0x00, track.channelCount, // channelcount
      0x00, 0x10, // sampleSize:16bits
      0x00, 0x00, 0x00, 0x00, // reserved2
      (samplerate >> 8) & 0xFF,
      samplerate & 0xff, //
      0x00, 0x00]));
  }

  static stsd (track) {
    if (track.type === 'audio') {
      if (!track.isAAC && track.codec === 'mp3') {
        return MP4.box(MP4.types.stsd, MP4.STSD, MP4.mp3(track));
      }

      return MP4.box(MP4.types.stsd, MP4.STSD, MP4.mp4a(track));
    } else {
      return MP4.box(MP4.types.stsd, MP4.STSD, MP4.avc1(track));
    }
  }

  static tkhd (track) {
    let id = track.id,
      duration = track.duration * track.timescale,
      width = track.width,
      height = track.height,
      upperWordDuration = Math.floor(duration / (UINT32_MAX + 1)),
      lowerWordDuration = Math.floor(duration % (UINT32_MAX + 1));
    return MP4.box(MP4.types.tkhd, new Uint8Array([
      0x01, // version 1
      0x00, 0x00, 0x07, // flags
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, // creation_time
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, // modification_time
      (id >> 24) & 0xFF,
      (id >> 16) & 0xFF,
      (id >> 8) & 0xFF,
      id & 0xFF, // track_ID
      0x00, 0x00, 0x00, 0x00, // reserved
      (upperWordDuration >> 24),
      (upperWordDuration >> 16) & 0xFF,
      (upperWordDuration >> 8) & 0xFF,
      upperWordDuration & 0xFF,
      (lowerWordDuration >> 24),
      (lowerWordDuration >> 16) & 0xFF,
      (lowerWordDuration >> 8) & 0xFF,
      lowerWordDuration & 0xFF,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, // reserved
      0x00, 0x00, // layer
      0x00, 0x00, // alternate_group
      0x00, 0x00, // non-audio track volume
      0x00, 0x00, // reserved
      0x00, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x40, 0x00, 0x00, 0x00, // transformation: unity matrix
      (width >> 8) & 0xFF,
      width & 0xFF,
      0x00, 0x00, // width
      (height >> 8) & 0xFF,
      height & 0xFF,
      0x00, 0x00 // height
    ]));
  }

  static traf (track, baseMediaDecodeTime) {
    let sampleDependencyTable = MP4.sdtp(track),
      id = track.id,
      upperWordBaseMediaDecodeTime = Math.floor(baseMediaDecodeTime / (UINT32_MAX + 1)),
      lowerWordBaseMediaDecodeTime = Math.floor(baseMediaDecodeTime % (UINT32_MAX + 1));
    return MP4.box(MP4.types.traf,
      MP4.box(MP4.types.tfhd, new Uint8Array([
        0x00, // version 0
        0x00, 0x00, 0x00, // flags
        (id >> 24),
        (id >> 16) & 0XFF,
        (id >> 8) & 0XFF,
        (id & 0xFF) // track_ID
      ])),
      MP4.box(MP4.types.tfdt, new Uint8Array([
        0x01, // version 1
        0x00, 0x00, 0x00, // flags
        (upperWordBaseMediaDecodeTime >> 24),
        (upperWordBaseMediaDecodeTime >> 16) & 0XFF,
        (upperWordBaseMediaDecodeTime >> 8) & 0XFF,
        (upperWordBaseMediaDecodeTime & 0xFF),
        (lowerWordBaseMediaDecodeTime >> 24),
        (lowerWordBaseMediaDecodeTime >> 16) & 0XFF,
        (lowerWordBaseMediaDecodeTime >> 8) & 0XFF,
        (lowerWordBaseMediaDecodeTime & 0xFF)
      ])),
      MP4.trun(track,
        sampleDependencyTable.length +
                    16 + // tfhd
                    20 + // tfdt
                    8 + // traf header
                    16 + // mfhd
                    8 + // moof header
                    8), // mdat header
      sampleDependencyTable);
  }

  /**
   * Generate a track box.
   * @param track {object} a track definition
   * @return {Uint8Array} the track box
   */
  static trak (track) {
    track.duration = track.duration || 0xffffffff;
    return MP4.box(MP4.types.trak, MP4.tkhd(track), MP4.mdia(track));
  }

  static trex (track) {
    let id = track.id;
    return MP4.box(MP4.types.trex, new Uint8Array([
      0x00, // version 0
      0x00, 0x00, 0x00, // flags
      (id >> 24),
      (id >> 16) & 0XFF,
      (id >> 8) & 0XFF,
      (id & 0xFF), // track_ID
      0x00, 0x00, 0x00, 0x01, // default_sample_description_index
      0x00, 0x00, 0x00, 0x00, // default_sample_duration
      0x00, 0x00, 0x00, 0x00, // default_sample_size
      0x00, 0x01, 0x00, 0x01 // default_sample_flags
    ]));
  }

  static trun (track, offset) {
    let samples = track.samples || [],
      len = samples.length,
      arraylen = 12 + (16 * len),
      array = new Uint8Array(arraylen),
      i, sample, duration, size, flags, cts;
    offset += 8 + arraylen;
    array.set([
      0x00, // version 0
      0x00, 0x0f, 0x01, // flags
      (len >>> 24) & 0xFF,
      (len >>> 16) & 0xFF,
      (len >>> 8) & 0xFF,
      len & 0xFF, // sample_count
      (offset >>> 24) & 0xFF,
      (offset >>> 16) & 0xFF,
      (offset >>> 8) & 0xFF,
      offset & 0xFF // data_offset
    ], 0);
    for (i = 0; i < len; i++) {
      sample = samples[i];
      duration = sample.duration;
      size = sample.size;
      flags = sample.flags;
      cts = sample.cts;
      array.set([
        (duration >>> 24) & 0xFF,
        (duration >>> 16) & 0xFF,
        (duration >>> 8) & 0xFF,
        duration & 0xFF, // sample_duration
        (size >>> 24) & 0xFF,
        (size >>> 16) & 0xFF,
        (size >>> 8) & 0xFF,
        size & 0xFF, // sample_size
        (flags.isLeading << 2) | flags.dependsOn,
        (flags.isDependedOn << 6) |
          (flags.hasRedundancy << 4) |
          (flags.paddingValue << 1) |
          flags.isNonSync,
        flags.degradPrio & 0xF0 << 8,
        flags.degradPrio & 0x0F, // sample_flags
        (cts >>> 24) & 0xFF,
        (cts >>> 16) & 0xFF,
        (cts >>> 8) & 0xFF,
        cts & 0xFF // sample_composition_time_offset
      ], 12 + 16 * i);
    }
    return MP4.box(MP4.types.trun, array);
  }

  static initSegment (tracks) {
    if (!MP4.types) {
      MP4.init();
    }

    let movie = MP4.moov(tracks), result;
    result = new Uint8Array(MP4.FTYP.byteLength + movie.byteLength);
    result.set(MP4.FTYP);
    result.set(movie, MP4.FTYP.byteLength);
    return result;
  }
}



/**
 * fMP4 remuxer
*/











const MAX_SILENT_FRAME_DURATION_90KHZ = toMpegTsClockFromTimescale(10);
const PTS_DTS_SHIFT_TOLERANCE_90KHZ = toMpegTsClockFromTimescale(0.2);

let chromeVersion = null;

class MP4Remuxer {
  constructor (observer, config, typeSupported, vendor) {
    this.observer = observer;
    this.config = config;
    this.typeSupported = typeSupported;
    this.ISGenerated = false;
    if (chromeVersion === null) {
      const result = 'Android'.match(/Chrome\/(\d+)/i);
      chromeVersion = result ? parseInt(result[1]) : 0;
    }
  }

  destroy () {
  }

  resetTimeStamp (defaultTimeStamp) {
    this._initPTS = this._initDTS = defaultTimeStamp;
  }

  resetInitSegment () {
    this.ISGenerated = false;
  }

  getVideoStartPts (videoSamples) {
    let rolloverDetected = false;
    const startPTS = videoSamples.reduce((minPTS, sample) => {
      const delta = sample.pts - minPTS;
      if (delta < -4294967296) { // 2^32, see PTSNormalize for reasoning, but we're hitting a rollover here, and we don't want that to impact the timeOffset calculation
        rolloverDetected = true;
        return minPTS;
      } else if (delta > 0) {
        return minPTS;
      } else {
        return sample.pts;
      }
    }, videoSamples[0].pts);
    if (rolloverDetected) {
      logger.debug('PTS rollover detected');
    }
    return startPTS;
  }

  remux (audioTrack, videoTrack, id3Track, textTrack, timeOffset, contiguous, accurateTimeOffset) {
    // generate Init Segment if needed
    if (!this.ISGenerated) {
      this.generateIS(audioTrack, videoTrack, timeOffset);
    }

    if (this.ISGenerated) {
      const nbAudioSamples = audioTrack.samples.length;
      const nbVideoSamples = videoTrack.samples.length;
      let audioTimeOffset = timeOffset;
      let videoTimeOffset = timeOffset;
      if (nbAudioSamples && nbVideoSamples) {
        // timeOffset is expected to be the offset of the first timestamp of this fragment (first DTS)
        // if first audio DTS is not aligned with first video DTS then we need to take that into account
        // when providing timeOffset to remuxAudio / remuxVideo. if we don't do that, there might be a permanent / small
        // drift between audio and video streams
        const startPTS = this.getVideoStartPts(videoTrack.samples);
        const tsDelta = audioTrack.samples[0].pts - startPTS;
        const audiovideoTimestampDelta = tsDelta / videoTrack.inputTimeScale;
        audioTimeOffset += Math.max(0, audiovideoTimestampDelta);
        videoTimeOffset += Math.max(0, -audiovideoTimestampDelta);
      }
      // Purposefully remuxing audio before video, so that remuxVideo can use nextAudioPts, which is
      // calculated in remuxAudio.
      // logger.log('nb AAC samples:' + audioTrack.samples.length);
      if (nbAudioSamples) {
        // if initSegment was generated without video samples, regenerate it again
        if (!audioTrack.timescale) {
          logger.warn('regenerate InitSegment as audio detected');
          this.generateIS(audioTrack, videoTrack, timeOffset);
        }
        let audioData = this.remuxAudio(audioTrack, audioTimeOffset, contiguous, accurateTimeOffset, videoTimeOffset);
        // logger.log('nb AVC samples:' + videoTrack.samples.length);
        if (nbVideoSamples) {
          let audioTrackLength;
          if (audioData) {
            audioTrackLength = audioData.endPTS - audioData.startPTS;
          }

          // if initSegment was generated without video samples, regenerate it again
          if (!videoTrack.timescale) {
            logger.warn('regenerate InitSegment as video detected');
            this.generateIS(audioTrack, videoTrack, timeOffset);
          }
          this.remuxVideo(videoTrack, videoTimeOffset, contiguous, audioTrackLength);
        }
      } else {
        // logger.log('nb AVC samples:' + videoTrack.samples.length);
        if (nbVideoSamples) {
          let videoData = this.remuxVideo(videoTrack, videoTimeOffset, contiguous, 0);
          if (videoData && audioTrack.codec) {
            this.remuxEmptyAudio(audioTrack, audioTimeOffset, contiguous, videoData);
          }
        }
      }
    }
    // logger.log('nb ID3 samples:' + audioTrack.samples.length);
    if (id3Track.samples.length) {
      this.remuxID3(id3Track, timeOffset);
    }

    // logger.log('nb ID3 samples:' + audioTrack.samples.length);
    if (textTrack.samples.length) {
      this.remuxText(textTrack, timeOffset);
    }

    // notify end of parsing
    this.observer.trigger(HlsEvents.FRAG_PARSED);
  }

  generateIS (audioTrack, videoTrack, timeOffset) {
    let observer = this.observer,
      audioSamples = audioTrack.samples,
      videoSamples = videoTrack.samples,
      typeSupported = this.typeSupported,
      container = 'audio/mp4',
      tracks = {},
      data = { tracks },
      computePTSDTS = (this._initPTS === undefined),
      initPTS, initDTS;

    if (computePTSDTS) {
      initPTS = initDTS = Infinity;
    }

    if (audioTrack.config && audioSamples.length) {
      // let's use audio sampling rate as MP4 time scale.
      // rationale is that there is a integer nb of audio frames per audio sample (1024 for AAC)
      // using audio sampling rate here helps having an integer MP4 frame duration
      // this avoids potential rounding issue and AV sync issue
      audioTrack.timescale = audioTrack.samplerate;
      logger.log(`audio sampling rate : ${audioTrack.samplerate}`);
      if (!audioTrack.isAAC) {
        if (typeSupported.mpeg) { // Chrome and Safari
          container = 'audio/mpeg';
          audioTrack.codec = '';
        } else if (typeSupported.mp3) { // Firefox
          audioTrack.codec = 'mp3';
        }
      }
      tracks.audio = {
        container: container,
        codec: audioTrack.codec,
        initSegment: !audioTrack.isAAC && typeSupported.mpeg ? new Uint8Array() : MP4.initSegment([audioTrack]),
        metadata: {
          channelCount: audioTrack.channelCount
        }
      };
      if (computePTSDTS) {
        // remember first PTS of this demuxing context. for audio, PTS = DTS
        initPTS = initDTS = audioSamples[0].pts - Math.round(audioTrack.inputTimeScale * timeOffset);
      }
    }

    if (videoTrack.sps && videoTrack.pps && videoSamples.length) {
      // let's use input time scale as MP4 video timescale
      // we use input time scale straight away to avoid rounding issues on frame duration / cts computation
      const inputTimeScale = videoTrack.inputTimeScale;
      videoTrack.timescale = inputTimeScale;
      tracks.video = {
        container: 'video/mp4',
        codec: videoTrack.codec,
        initSegment: MP4.initSegment([videoTrack]),
        metadata: {
          width: videoTrack.width,
          height: videoTrack.height
        }
      };
      if (computePTSDTS) {
        const startPTS = this.getVideoStartPts(videoSamples);
        const startOffset = Math.round(inputTimeScale * timeOffset);
        initDTS = Math.min(initDTS, videoSamples[0].dts - startOffset);
        initPTS = Math.min(initPTS, startPTS - startOffset);
        this.observer.trigger(HlsEvents.INIT_PTS_FOUND, { initPTS });
      }
    } else if (computePTSDTS && tracks.audio) {
      // initPTS found for audio-only stream with main and alt audio
      this.observer.trigger(HlsEvents.INIT_PTS_FOUND, { initPTS });
    }

    if (Object.keys(tracks).length) {
      observer.trigger(HlsEvents.FRAG_PARSING_INIT_SEGMENT, data);
      this.ISGenerated = true;
      if (computePTSDTS) {
        this._initPTS = initPTS;
        this._initDTS = initDTS;
      }
    } else {
      observer.trigger(HlsEvents.ERROR, { type: ErrorTypes.MEDIA_ERROR, details: ErrorDetails.FRAG_PARSING_ERROR, fatal: false, reason: 'no audio/video samples found' });
    }
  }

  remuxVideo (track, timeOffset, contiguous, audioTrackLength) {
    const timeScale = track.timescale;
    const inputSamples = track.samples;
    const outputSamples = [];
    const nbSamples = inputSamples.length;
    const initPTS = this._initPTS;

    let offset = 8;
    let mp4SampleDuration;
    let mdat;
    let moof;
    let firstDTS;
    let lastDTS;
    let minPTS = Number.POSITIVE_INFINITY;
    let maxPTS = Number.NEGATIVE_INFINITY;
    let ptsDtsShift = 0;
    let sortSamples = false;

    // if parsed fragment is contiguous with last one, let's use last DTS value as reference
    let nextAvcDts = this.nextAvcDts;

    if (nbSamples === 0) {
      return;
    }

    if (!contiguous) {
      const pts = timeOffset * timeScale;
      const cts = inputSamples[0].pts - PTSNormalize(inputSamples[0].dts, inputSamples[0].pts);
      // if not contiguous, let's use target timeOffset
      nextAvcDts = pts - cts;
    }

    // PTS is coded on 33bits, and can loop from -2^32 to 2^32
    // PTSNormalize will make PTS/DTS value monotonic, we use last known DTS value as reference value
    for (let i = 0; i < nbSamples; i++) {
      const sample = inputSamples[i];
      sample.pts = PTSNormalize(sample.pts - initPTS, nextAvcDts);
      sample.dts = PTSNormalize(sample.dts - initPTS, nextAvcDts);
      if (sample.dts > sample.pts) {
        ptsDtsShift = Math.max(Math.min(ptsDtsShift, sample.pts - sample.dts), -1 * PTS_DTS_SHIFT_TOLERANCE_90KHZ);
      }
      if (sample.dts < inputSamples[i > 0 ? i - 1 : i].dts) {
        sortSamples = true;
      }
    }

    // sort video samples by DTS then PTS then demux id order
    if (sortSamples) {
      inputSamples.sort(function (a, b) {
        const deltadts = a.dts - b.dts;
        const deltapts = a.pts - b.pts;
        return deltadts || (deltapts || (a.id - b.id));
      });
    }

    // Get first/last DTS
    firstDTS = inputSamples[0].dts;
    lastDTS = inputSamples[nbSamples - 1].dts;

    // on Safari let's signal the same sample duration for all samples
    // sample duration (as expected by trun MP4 boxes), should be the delta between sample DTS
    // set this constant duration as being the avg delta between consecutive DTS.
    const averageSampleDuration = Math.round((lastDTS - firstDTS) / (nbSamples - 1));

    // handle broken streams with PTS < DTS, tolerance up 0.2 seconds
    if (ptsDtsShift < 0) {
      if (ptsDtsShift < averageSampleDuration * -2) {
        // Fix for "CNN special report, with CC" in test-streams (including Safari browser)
        logger.warn(`PTS < DTS detected in video samples, offsetting DTS to PTS ${toMsFromMpegTsClock(-averageSampleDuration, true)} ms`);
        for (let i = 0; i < nbSamples; i++) {
          inputSamples[i].dts = inputSamples[i].pts - averageSampleDuration;
        }
      } else {
        // Fix for "Custom IV with bad PTS DTS" in test-streams
        logger.warn(`PTS < DTS detected in video samples, shifting DTS by ${toMsFromMpegTsClock(ptsDtsShift, true)} ms to overcome this issue`);
        for (let i = 0; i < nbSamples; i++) {
          inputSamples[i].dts = inputSamples[i].dts + ptsDtsShift;
        }
      }
      firstDTS = inputSamples[0].dts;
      lastDTS = inputSamples[nbSamples - 1].dts;
    }

    // if fragment are contiguous, detect hole/overlapping between fragments
    if (contiguous) {
      // check timestamp continuity across consecutive fragments (this is to remove inter-fragment gap/hole)
      const delta = firstDTS - nextAvcDts;
      const foundHole = delta > averageSampleDuration;
      const foundOverlap = delta < -1;
      if (foundHole || foundOverlap) {
        if (foundHole) {
          logger.warn(`AVC: ${toMsFromMpegTsClock(delta, true)} ms (${delta}dts) hole between fragments detected, filling it`);
        } else {
          logger.warn(`AVC: ${toMsFromMpegTsClock(-delta, true)} ms (${delta}dts) overlapping between fragments detected`);
        }
        firstDTS = nextAvcDts;
        const firstPTS = inputSamples[0].pts - delta;
        inputSamples[0].dts = firstDTS;
        inputSamples[0].pts = firstPTS;
        logger.log(`Video: First PTS/DTS adjusted: ${toMsFromMpegTsClock(firstPTS, true)}/${toMsFromMpegTsClock(firstDTS, true)}, delta: ${toMsFromMpegTsClock(delta, true)} ms`);
      }
    }

    if (chromeVersion && chromeVersion < 75) {
      firstDTS = Math.max(0, firstDTS);
    }
    let nbNalu = 0;
    let naluLen = 0;
    for (let i = 0; i < nbSamples; i++) {
      // compute total/avc sample length and nb of NAL units
      const sample = inputSamples[i];
      const units = sample.units;
      const nbUnits = units.length;
      let sampleLen = 0;
      for (let j = 0; j < nbUnits; j++) {
        sampleLen += units[j].data.length;
      }

      naluLen += sampleLen;
      nbNalu += nbUnits;
      sample.length = sampleLen;

      // normalize PTS/DTS
      // ensure sample monotonic DTS
      sample.dts = Math.max(sample.dts, firstDTS);
      // ensure that computed value is greater or equal than sample DTS
      sample.pts = Math.max(sample.pts, sample.dts, 0);
      minPTS = Math.min(sample.pts, minPTS);
      maxPTS = Math.max(sample.pts, maxPTS);
    }
    lastDTS = inputSamples[nbSamples - 1].dts;

    /* concatenate the video data and construct the mdat in place
      (need 8 more bytes to fill length and mpdat type) */
    let mdatSize = naluLen + (4 * nbNalu) + 8;
    try {
      mdat = new Uint8Array(mdatSize);
    } catch (err) {
      this.observer.trigger(HlsEvents.ERROR, { type: ErrorTypes.MUX_ERROR, details: ErrorDetails.REMUX_ALLOC_ERROR, fatal: false, bytes: mdatSize, reason: `fail allocating video mdat ${mdatSize}` });
      return;
    }
    let view = new DataView(mdat.buffer);
    view.setUint32(0, mdatSize);
    mdat.set(MP4.types.mdat, 4);

    for (let i = 0; i < nbSamples; i++) {
      const avcSample = inputSamples[i];
      const avcSampleUnits = avcSample.units;
      let mp4SampleLength = 0;
      let compositionTimeOffset;
      // convert NALU bitstream to MP4 format (prepend NALU with size field)
      for (let j = 0, nbUnits = avcSampleUnits.length; j < nbUnits; j++) {
        const unit = avcSampleUnits[j];
        const unitData = unit.data;
        const unitDataLen = unit.data.byteLength;
        view.setUint32(offset, unitDataLen);
        offset += 4;
        mdat.set(unitData, offset);
        offset += unitDataLen;
        mp4SampleLength += 4 + unitDataLen;
      }

      // expected sample duration is the Decoding Timestamp diff of consecutive samples
      if (i < nbSamples - 1) {
        mp4SampleDuration = inputSamples[i + 1].dts - avcSample.dts;
      } else {
        const config = this.config;
        const lastFrameDuration = avcSample.dts - inputSamples[i > 0 ? i - 1 : i].dts;
        if (config.stretchShortVideoTrack) {
          // In some cases, a segment's audio track duration may exceed the video track duration.
          // Since we've already remuxed audio, and we know how long the audio track is, we look to
          // see if the delta to the next segment is longer than maxBufferHole.
          // If so, playback would potentially get stuck, so we artificially inflate
          // the duration of the last frame to minimize any potential gap between segments.
          const maxBufferHole = config.maxBufferHole;
          const gapTolerance = Math.floor(maxBufferHole * timeScale);
          const deltaToFrameEnd = (audioTrackLength ? minPTS + audioTrackLength * timeScale : this.nextAudioPts) - avcSample.pts;
          if (deltaToFrameEnd > gapTolerance) {
            // We subtract lastFrameDuration from deltaToFrameEnd to try to prevent any video
            // frame overlap. maxBufferHole should be >> lastFrameDuration anyway.
            mp4SampleDuration = deltaToFrameEnd - lastFrameDuration;
            if (mp4SampleDuration < 0) {
              mp4SampleDuration = lastFrameDuration;
            }

            logger.log(`It is approximately ${toMsFromMpegTsClock(deltaToFrameEnd, false)} ms to the next segment; using duration ${toMsFromMpegTsClock(mp4SampleDuration, false)} ms for the last video frame.`);
          } else {
            mp4SampleDuration = lastFrameDuration;
          }
        } else {
          mp4SampleDuration = lastFrameDuration;
        }
      }
      compositionTimeOffset = Math.round(avcSample.pts - avcSample.dts);

      // console.log('PTS/DTS/initDTS/normPTS/normDTS/relative PTS : ${avcSample.pts}/${avcSample.dts}/${initDTS}/${ptsnorm}/${dtsnorm}/${(avcSample.pts/4294967296).toFixed(3)}');
      outputSamples.push({
        size: mp4SampleLength,
        // constant duration
        duration: mp4SampleDuration,
        cts: compositionTimeOffset,
        flags: {
          isLeading: 0,
          isDependedOn: 0,
          hasRedundancy: 0,
          degradPrio: 0,
          dependsOn: avcSample.key ? 2 : 1,
          isNonSync: avcSample.key ? 0 : 1
        }
      });
    }
    // next AVC sample DTS should be equal to last sample DTS + last sample duration (in PES timescale)
    this.nextAvcDts = lastDTS + mp4SampleDuration;
    const dropped = track.dropped;
    track.nbNalu = 0;
    track.dropped = 0;
    if (outputSamples.length && 'Android'.toLowerCase().indexOf('chrome') > -1) {
      const flags = outputSamples[0].flags;
      // chrome workaround, mark first sample as being a Random Access Point to avoid sourcebuffer append issue
      // https://code.google.com/p/chromium/issues/detail?id=229412
      flags.dependsOn = 2;
      flags.isNonSync = 0;
    }
    track.samples = outputSamples;
    moof = MP4.moof(track.sequenceNumber++, firstDTS, track);
    track.samples = [];

    const data = {
      data1: moof,
      data2: mdat,
      startPTS: minPTS / timeScale,
      endPTS: (maxPTS + mp4SampleDuration) / timeScale,
      startDTS: firstDTS / timeScale,
      endDTS: this.nextAvcDts / timeScale,
      type: 'video',
      hasAudio: false,
      hasVideo: true,
      nb: outputSamples.length,
      dropped: dropped
    };
    this.observer.trigger(HlsEvents.FRAG_PARSING_DATA, data);
    return data;
  }

  remuxAudio (track, timeOffset, contiguous, accurateTimeOffset, videoTimeOffset) {
    const inputTimeScale = track.inputTimeScale;
    const mp4timeScale = track.timescale;
    const scaleFactor = inputTimeScale / mp4timeScale;
    const mp4SampleDuration = track.isAAC ? 1024 : 1152;
    const inputSampleDuration = mp4SampleDuration * scaleFactor;
    const initPTS = this._initPTS;
    const rawMPEG = !track.isAAC && this.typeSupported.mpeg;

    let mp4Sample;
    let fillFrame;
    let mdat;
    let moof;
    let firstPTS;
    let lastPTS;
    let offset = (rawMPEG ? 0 : 8);
    let inputSamples = track.samples;
    let outputSamples = [];
    let nextAudioPts = this.nextAudioPts;

    // for audio samples, also consider consecutive fragments as being contiguous (even if a level switch occurs),
    // for sake of clarity:
    // consecutive fragments are frags with
    //  - less than 100ms gaps between new time offset (if accurate) and next expected PTS OR
    //  - less than 20 audio frames distance
    // contiguous fragments are consecutive fragments from same quality level (same level, new SN = old SN + 1)
    // this helps ensuring audio continuity
    // and this also avoids audio glitches/cut when switching quality, or reporting wrong duration on first audio frame
    contiguous |= (inputSamples.length && nextAudioPts &&
                   ((accurateTimeOffset && Math.abs(timeOffset - nextAudioPts / inputTimeScale) < 0.1) ||
                    Math.abs((inputSamples[0].pts - nextAudioPts - initPTS)) < 20 * inputSampleDuration)
    );

    // compute normalized PTS
    inputSamples.forEach(function (sample) {
      sample.pts = sample.dts = PTSNormalize(sample.pts - initPTS, timeOffset * inputTimeScale);
    });

    // filter out sample with negative PTS that are not playable anyway
    // if we don't remove these negative samples, they will shift all audio samples forward.
    // leading to audio overlap between current / next fragment
    inputSamples = inputSamples.filter((sample) => sample.pts >= 0);

    // in case all samples have negative PTS, and have been filtered out, return now
    if (inputSamples.length === 0) {
      return;
    }

    if (!contiguous) {
      if (videoTimeOffset === 0) {
        // Set the start to 0 to match video so that start gaps larger than inputSampleDuration are filled with silence
        nextAudioPts = 0;
      } else if (accurateTimeOffset) {
        // When not seeking, not live, and LevelDetails.PTSKnown, use fragment start as predicted next audio PTS
        nextAudioPts = Math.max(0, timeOffset * inputTimeScale);
      } else {
        // if frags are not contiguous and if we cant trust time offset, let's use first sample PTS as next audio PTS
        nextAudioPts = inputSamples[0].pts;
      }
    }

    // If the audio track is missing samples, the frames seem to get "left-shifted" within the
    // resulting mp4 segment, causing sync issues and leaving gaps at the end of the audio segment.
    // In an effort to prevent this from happening, we inject frames here where there are gaps.
    // When possible, we inject a silent frame; when that's not possible, we duplicate the last
    // frame.

    if (track.isAAC) {
      const maxAudioFramesDrift = this.config.maxAudioFramesDrift;
      for (let i = 0, nextPts = nextAudioPts; i < inputSamples.length;) {
        // First, let's see how far off this frame is from where we expect it to be
        const sample = inputSamples[i];
        let pts = sample.pts;
        let delta = pts - nextPts;

        // If we're overlapping by more than a duration, drop this sample
        if (delta <= -maxAudioFramesDrift * inputSampleDuration) {
          if (contiguous || i > 0) {
            logger.warn(`Dropping 1 audio frame @ ${toMsFromMpegTsClock(nextPts, true) / 1000}s due to ${toMsFromMpegTsClock(delta, true)} ms overlap.`);
            inputSamples.splice(i, 1);
            // Don't touch nextPtsNorm or i
          } else {
            // When changing qualities we can't trust that audio has been appended up to nextAudioPts
            // Warn about the overlap but do not drop samples as that can introduce buffer gaps
            logger.warn(`Audio frame @ ${toMsFromMpegTsClock(pts, true) / 1000}s overlaps nextAudioPts by ${toMsFromMpegTsClock(delta, true)} ms.`);
            nextPts = pts + inputSampleDuration;
            i++;
          }
        } // eslint-disable-line brace-style

        // Insert missing frames if:
        // 1: We're more than maxAudioFramesDrift frame away
        // 2: Not more than MAX_SILENT_FRAME_DURATION away
        else if (delta >= maxAudioFramesDrift * inputSampleDuration && delta < MAX_SILENT_FRAME_DURATION_90KHZ) {
          const missing = Math.floor(delta / inputSampleDuration);
          // Adjust nextPts so that silent samples are aligned with media pts. This will prevent media samples from
          // later being shifted if nextPts is based on timeOffset and delta is not a multiple of inputSampleDuration.
          nextPts = pts - missing * inputSampleDuration;
          logger.warn(`Injecting ${missing} audio frames @ ${toMsFromMpegTsClock(nextPts, true) / 1000}s due to ${toMsFromMpegTsClock(delta, true)} ms gap.`);
          for (let j = 0; j < missing; j++) {
            let newStamp = Math.max(nextPts, 0);
            fillFrame = AAC.getSilentFrame(track.manifestCodec || track.codec, track.channelCount);
            if (!fillFrame) {
              logger.log('Unable to get silent frame for given audio codec; duplicating last frame instead.');
              fillFrame = sample.unit.subarray();
            }
            inputSamples.splice(i, 0, { unit: fillFrame, pts: newStamp, dts: newStamp });
            nextPts += inputSampleDuration;
            i++;
          }

          // Adjust sample to next expected pts
          sample.pts = sample.dts = nextPts;
          nextPts += inputSampleDuration;
          i++;
        } else {
          // Otherwise, just adjust pts
          if (Math.abs(delta) > (0.1 * inputSampleDuration)) {
            // logger.log(`Invalid frame delta ${Math.round(delta + inputSampleDuration)} at PTS ${Math.round(pts / 90)} (should be ${Math.round(inputSampleDuration)}).`);
          }
          sample.pts = sample.dts = nextPts;
          nextPts += inputSampleDuration;
          i++;
        }
      }
    }

    // compute mdat size, as we eventually filtered/added some samples
    let nbSamples = inputSamples.length;
    let mdatSize = 0;
    while (nbSamples--) {
      mdatSize += inputSamples[nbSamples].unit.byteLength;
    }

    for (let j = 0, nbSamples = inputSamples.length; j < nbSamples; j++) {
      let audioSample = inputSamples[j];
      let unit = audioSample.unit;
      let pts = audioSample.pts;

      // logger.log(`Audio/PTS:${toMsFromMpegTsClock(pts, true)}`);
      // if not first sample

      if (lastPTS !== undefined && mp4Sample) {
        mp4Sample.duration = Math.round((pts - lastPTS) / scaleFactor);
      } else {
        let delta = pts - nextAudioPts;
        let numMissingFrames = 0;

        // if fragment are contiguous, detect hole/overlapping between fragments
        // contiguous fragments are consecutive fragments from same quality level (same level, new SN = old SN + 1)
        if (contiguous && track.isAAC) {
          // log delta
          if (delta) {
            if (delta > 0 && delta < MAX_SILENT_FRAME_DURATION_90KHZ) {
              // Q: why do we have to round here, shouldn't this always result in an integer if timestamps are correct,
              // and if not, shouldn't we actually Math.ceil() instead?
              numMissingFrames = Math.round((pts - nextAudioPts) / inputSampleDuration);

              logger.log(`${toMsFromMpegTsClock(delta, true)} ms hole between AAC samples detected,filling it`);
              if (numMissingFrames > 0) {
                fillFrame = AAC.getSilentFrame(track.manifestCodec || track.codec, track.channelCount);
                if (!fillFrame) {
                  fillFrame = unit.subarray();
                }

                mdatSize += numMissingFrames * fillFrame.length;
              }
              // if we have frame overlap, overlapping for more than half a frame duraion
            } else if (delta < -12) {
              // drop overlapping audio frames... browser will deal with it
              logger.log(`drop overlapping AAC sample, expected/parsed/delta: ${toMsFromMpegTsClock(nextAudioPts, true)} ms / ${toMsFromMpegTsClock(pts, true)} ms / ${toMsFromMpegTsClock(-delta, true)} ms`);
              mdatSize -= unit.byteLength;
              continue;
            }
            // set PTS/DTS to expected PTS/DTS
            pts = nextAudioPts;
          }
        }
        // remember first PTS of our audioSamples
        firstPTS = pts;
        if (mdatSize > 0) {
          mdatSize += offset;
          try {
            mdat = new Uint8Array(mdatSize);
          } catch (err) {
            this.observer.trigger(HlsEvents.ERROR, { type: ErrorTypes.MUX_ERROR, details: ErrorDetails.REMUX_ALLOC_ERROR, fatal: false, bytes: mdatSize, reason: `fail allocating audio mdat ${mdatSize}` });
            return;
          }
          if (!rawMPEG) {
            const view = new DataView(mdat.buffer);
            view.setUint32(0, mdatSize);
            mdat.set(MP4.types.mdat, 4);
          }
        } else {
          // no audio samples
          return;
        }
        for (let i = 0; i < numMissingFrames; i++) {
          fillFrame = AAC.getSilentFrame(track.manifestCodec || track.codec, track.channelCount);
          if (!fillFrame) {
            logger.log('Unable to get silent frame for given audio codec; duplicating this frame instead.');
            fillFrame = unit.subarray();
          }
          mdat.set(fillFrame, offset);
          offset += fillFrame.byteLength;
          mp4Sample = {
            size: fillFrame.byteLength,
            cts: 0,
            duration: 1024,
            flags: {
              isLeading: 0,
              isDependedOn: 0,
              hasRedundancy: 0,
              degradPrio: 0,
              dependsOn: 1
            }
          };
          outputSamples.push(mp4Sample);
        }
      }
      mdat.set(unit, offset);
      let unitLen = unit.byteLength;
      offset += unitLen;
      // console.log('PTS/DTS/initDTS/normPTS/normDTS/relative PTS : ${audioSample.pts}/${audioSample.dts}/${initDTS}/${ptsnorm}/${dtsnorm}/${(audioSample.pts/4294967296).toFixed(3)}');
      mp4Sample = {
        size: unitLen,
        cts: 0,
        duration: 0,
        flags: {
          isLeading: 0,
          isDependedOn: 0,
          hasRedundancy: 0,
          degradPrio: 0,
          dependsOn: 1
        }
      };
      outputSamples.push(mp4Sample);
      lastPTS = pts;
    }
    let lastSampleDuration = 0;
    nbSamples = outputSamples.length;
    // set last sample duration as being identical to previous sample
    if (nbSamples >= 2) {
      lastSampleDuration = outputSamples[nbSamples - 2].duration;
      mp4Sample.duration = lastSampleDuration;
    }
    if (nbSamples) {
      // next audio sample PTS should be equal to last sample PTS + duration
      this.nextAudioPts = nextAudioPts = lastPTS + scaleFactor * lastSampleDuration;
      // logger.log('Audio/PTS/PTSend:' + audioSample.pts.toFixed(0) + '/' + this.nextAacDts.toFixed(0));
      track.samples = outputSamples;
      if (rawMPEG) {
        moof = new Uint8Array();
      } else {
        moof = MP4.moof(track.sequenceNumber++, firstPTS / scaleFactor, track);
      }

      track.samples = [];
      const start = firstPTS / inputTimeScale;
      const end = nextAudioPts / inputTimeScale;
      const audioData = {
        data1: moof,
        data2: mdat,
        startPTS: start,
        endPTS: end,
        startDTS: start,
        endDTS: end,
        type: 'audio',
        hasAudio: true,
        hasVideo: false,
        nb: nbSamples
      };
      this.observer.trigger(HlsEvents.FRAG_PARSING_DATA, audioData);
      return audioData;
    }
    return null;
  }

  remuxEmptyAudio (track, timeOffset, contiguous, videoData) {
    let inputTimeScale = track.inputTimeScale;
    let mp4timeScale = track.samplerate ? track.samplerate : inputTimeScale;
    let scaleFactor = inputTimeScale / mp4timeScale;
    let nextAudioPts = this.nextAudioPts;

    // sync with video's timestamp
    let startDTS = (nextAudioPts !== undefined ? nextAudioPts : videoData.startDTS * inputTimeScale) + this._initDTS;
    let endDTS = videoData.endDTS * inputTimeScale + this._initDTS;
    // one sample's duration value
    let sampleDuration = 1024;
    let frameDuration = scaleFactor * sampleDuration;

    // samples count of this segment's duration
    let nbSamples = Math.ceil((endDTS - startDTS) / frameDuration);

    // silent frame
    let silentFrame = AAC.getSilentFrame(track.manifestCodec || track.codec, track.channelCount);

    logger.warn('remux empty Audio');
    // Can't remux if we can't generate a silent frame...
    if (!silentFrame) {
      logger.trace('Unable to remuxEmptyAudio since we were unable to get a silent frame for given audio codec!');
      return;
    }

    let samples = [];
    for (let i = 0; i < nbSamples; i++) {
      let stamp = startDTS + i * frameDuration;
      samples.push({ unit: silentFrame, pts: stamp, dts: stamp });
    }
    track.samples = samples;

    this.remuxAudio(track, timeOffset, contiguous);
  }

  remuxID3 (track, timeOffset) {
    const length = track.samples.length;
    if (!length) {
      return;
    }
    const inputTimeScale = track.inputTimeScale;
    const initPTS = this._initPTS;
    const initDTS = this._initDTS;
    // consume samples
    for (let index = 0; index < length; index++) {
      const sample = track.samples[index];
      // setting id3 pts, dts to relative time
      // using this._initPTS and this._initDTS to calculate relative time
      sample.pts = PTSNormalize(sample.pts - initPTS, timeOffset * inputTimeScale) / inputTimeScale;
      sample.dts = PTSNormalize(sample.dts - initDTS, timeOffset * inputTimeScale) / inputTimeScale;
    }
    this.observer.trigger(HlsEvents.FRAG_PARSING_METADATA, {
      samples: track.samples
    });

    track.samples = [];
  }

  remuxText (track, timeOffset) {
    const length = track.samples.length;
    const inputTimeScale = track.inputTimeScale;
    const initPTS = this._initPTS;
    // consume samples
    if (length) {
      for (let index = 0; index < length; index++) {
        const sample = track.samples[index];
        // setting text pts, dts to relative time
        // using this._initPTS and this._initDTS to calculate relative time
        sample.pts = PTSNormalize(sample.pts - initPTS, timeOffset * inputTimeScale) / inputTimeScale;
      }
      track.samples.sort(function (a, b) {
        return (a.pts - b.pts);
      });
      this.observer.trigger(HlsEvents.FRAG_PARSING_USERDATA, {
        samples: track.samples
      });
    }

    track.samples = [];
  }
}

function PTSNormalize (value, reference) {
  let offset;
  if (reference === undefined) {
    return value;
  }

  if (reference < value) {
    // - 2^33
    offset = -8589934592;
  } else {
    // + 2^33
    offset = 8589934592;
  }
  /* PTS is 33bit (from 0 to 2^33 -1)
    if diff between value and reference is bigger than half of the amplitude (2^32) then it means that
    PTS looping occured. fill the gap */
  while (Math.abs(value - reference) > 4294967296) {
    value += offset;
  }

  return value;
}



/**
 * MP4 demuxer
 */





class MP4Demuxer {
  constructor (observer, remuxer) {
    this.observer = observer;
    this.remuxer = remuxer;
  }

  resetTimeStamp (initPTS) {
    this.initPTS = initPTS;
  }

  resetInitSegment (initSegment, audioCodec, videoCodec, duration) {
    // jshint unused:false
    if (initSegment && initSegment.byteLength) {
      const initData = this.initData = MP4Demuxer.parseInitSegment(initSegment);

      // default audio codec if nothing specified
      // TODO : extract that from initsegment
      if (audioCodec == null) {
        audioCodec = 'mp4a.40.5';
      }

      if (videoCodec == null) {
        videoCodec = 'avc1.42e01e';
      }

      const tracks = {};
      if (initData.audio && initData.video) {
        tracks.audiovideo = { container: 'video/mp4', codec: audioCodec + ',' + videoCodec, initSegment: duration ? initSegment : null };
      } else {
        if (initData.audio) {
          tracks.audio = { container: 'audio/mp4', codec: audioCodec, initSegment: duration ? initSegment : null };
        }

        if (initData.video) {
          tracks.video = { container: 'video/mp4', codec: videoCodec, initSegment: duration ? initSegment : null };
        }
      }
      this.observer.trigger(HlsEvents.FRAG_PARSING_INIT_SEGMENT, { tracks });
    } else {
      if (audioCodec) {
        this.audioCodec = audioCodec;
      }

      if (videoCodec) {
        this.videoCodec = videoCodec;
      }
    }
  }

  static probe (data) {
    // ensure we find a moof box in the first 16 kB
    return MP4Demuxer.findBox({ data: data, start: 0, end: Math.min(data.length, 16384) }, ['moof']).length > 0;
  }

  static bin2str (buffer) {
    return String.fromCharCode.apply(null, buffer);
  }

  static readUint16 (buffer, offset) {
    if (buffer.data) {
      offset += buffer.start;
      buffer = buffer.data;
    }

    const val = buffer[offset] << 8 |
                buffer[offset + 1];

    return val < 0 ? 65536 + val : val;
  }

  static readUint32 (buffer, offset) {
    if (buffer.data) {
      offset += buffer.start;
      buffer = buffer.data;
    }

    const val = buffer[offset] << 24 |
                buffer[offset + 1] << 16 |
                buffer[offset + 2] << 8 |
                buffer[offset + 3];
    return val < 0 ? 4294967296 + val : val;
  }

  static writeUint32 (buffer, offset, value) {
    if (buffer.data) {
      offset += buffer.start;
      buffer = buffer.data;
    }
    buffer[offset] = value >> 24;
    buffer[offset + 1] = (value >> 16) & 0xff;
    buffer[offset + 2] = (value >> 8) & 0xff;
    buffer[offset + 3] = value & 0xff;
  }

  // Find the data for a box specified by its path
  static findBox (data, path) {
    let results = [],
      i, size, type, end, subresults, start, endbox;

    if (data.data) {
      start = data.start;
      end = data.end;
      data = data.data;
    } else {
      start = 0;
      end = data.byteLength;
    }

    if (!path.length) {
      // short-circuit the search for empty paths
      return null;
    }

    for (i = start; i < end;) {
      size = MP4Demuxer.readUint32(data, i);
      type = MP4Demuxer.bin2str(data.subarray(i + 4, i + 8));
      endbox = size > 1 ? i + size : end;

      if (type === path[0]) {
        if (path.length === 1) {
          // this is the end of the path and we've found the box we were
          // looking for
          results.push({ data: data, start: i + 8, end: endbox });
        } else {
          // recursively search for the next box along the path
          subresults = MP4Demuxer.findBox({ data: data, start: i + 8, end: endbox }, path.slice(1));
          if (subresults.length) {
            results = results.concat(subresults);
          }
        }
      }
      i = endbox;
    }

    // we've finished searching all of data
    return results;
  }

  static parseSegmentIndex (initSegment) {
    const moov = MP4Demuxer.findBox(initSegment, ['moov'])[0];
    const moovEndOffset = moov ? moov.end : null; // we need this in case we need to chop of garbage of the end of current data

    let index = 0;
    let sidx = MP4Demuxer.findBox(initSegment, ['sidx']);
    let references;

    if (!sidx || !sidx[0]) {
      return null;
    }

    references = [];
    sidx = sidx[0];

    const version = sidx.data[0];

    // set initial offset, we skip the reference ID (not needed)
    index = version === 0 ? 8 : 16;

    const timescale = MP4Demuxer.readUint32(sidx, index);
    index += 4;

    // TODO: parse earliestPresentationTime and firstOffset
    // usually zero in our case
    let earliestPresentationTime = 0;
    let firstOffset = 0;

    if (version === 0) {
      index += 8;
    } else {
      index += 16;
    }

    // skip reserved
    index += 2;

    let startByte = sidx.end + firstOffset;

    const referencesCount = MP4Demuxer.readUint16(sidx, index);
    index += 2;

    for (let i = 0; i < referencesCount; i++) {
      let referenceIndex = index;

      const referenceInfo = MP4Demuxer.readUint32(sidx, referenceIndex);
      referenceIndex += 4;

      const referenceSize = referenceInfo & 0x7FFFFFFF;
      const referenceType = (referenceInfo & 0x80000000) >>> 31;

      if (referenceType === 1) {
        console.warn('SIDX has hierarchical references (not supported)');
        return;
      }

      const subsegmentDuration = MP4Demuxer.readUint32(sidx, referenceIndex);
      referenceIndex += 4;

      references.push({
        referenceSize,
        subsegmentDuration, // unscaled
        info: {
          duration: subsegmentDuration / timescale,
          start: startByte,
          end: startByte + referenceSize - 1
        }
      });

      startByte += referenceSize;

      // Skipping 1 bit for |startsWithSap|, 3 bits for |sapType|, and 28 bits
      // for |sapDelta|.
      referenceIndex += 4;

      // skip to next ref
      index = referenceIndex;
    }

    return {
      earliestPresentationTime,
      timescale,
      version,
      referencesCount,
      references,
      moovEndOffset
    };
  }

  /**
   * Parses an MP4 initialization segment and extracts stream type and
   * timescale values for any declared tracks. Timescale values indicate the
   * number of clock ticks per second to assume for time-based values
   * elsewhere in the MP4.
   *
   * To determine the start time of an MP4, you need two pieces of
   * information: the timescale unit and the earliest base media decode
   * time. Multiple timescales can be specified within an MP4 but the
   * base media decode time is always expressed in the timescale from
   * the media header box for the track:
   * ```
   * moov > trak > mdia > mdhd.timescale
   * moov > trak > mdia > hdlr
   * ```
   * @param init {Uint8Array} the bytes of the init segment
   * @return {object} a hash of track type to timescale values or null if
   * the init segment is malformed.
   */
  static parseInitSegment (initSegment) {
    let result = [];
    let traks = MP4Demuxer.findBox(initSegment, ['moov', 'trak']);

    traks.forEach(trak => {
      const tkhd = MP4Demuxer.findBox(trak, ['tkhd'])[0];
      if (tkhd) {
        let version = tkhd.data[tkhd.start];
        let index = version === 0 ? 12 : 20;
        let trackId = MP4Demuxer.readUint32(tkhd, index);

        const mdhd = MP4Demuxer.findBox(trak, ['mdia', 'mdhd'])[0];
        if (mdhd) {
          version = mdhd.data[mdhd.start];
          index = version === 0 ? 12 : 20;
          const timescale = MP4Demuxer.readUint32(mdhd, index);

          const hdlr = MP4Demuxer.findBox(trak, ['mdia', 'hdlr'])[0];
          if (hdlr) {
            const hdlrType = MP4Demuxer.bin2str(hdlr.data.subarray(hdlr.start + 8, hdlr.start + 12));
            let type = { 'soun': 'audio', 'vide': 'video' }[hdlrType];
            if (type) {
              // extract codec info. TODO : parse codec details to be able to build MIME type
              let codecBox = MP4Demuxer.findBox(trak, ['mdia', 'minf', 'stbl', 'stsd']);
              if (codecBox.length) {
                codecBox = codecBox[0];
                let codecType = MP4Demuxer.bin2str(codecBox.data.subarray(codecBox.start + 12, codecBox.start + 16));
                logger.log(`MP4Demuxer:${type}:${codecType} found`);
              }
              result[trackId] = { timescale: timescale, type: type };
              result[type] = { timescale: timescale, id: trackId };
            }
          }
        }
      }
    });
    return result;
  }

  /**
 * Determine the base media decode start time, in seconds, for an MP4
 * fragment. If multiple fragments are specified, the earliest time is
 * returned.
 *
 * The base media decode time can be parsed from track fragment
 * metadata:
 * ```
 * moof > traf > tfdt.baseMediaDecodeTime
 * ```
 * It requires the timescale value from the mdhd to interpret.
 *
 * @param timescale {object} a hash of track ids to timescale values.
 * @return {number} the earliest base media decode start time for the
 * fragment, in seconds
 */
  static getStartDTS (initData, fragment) {
    let trafs, baseTimes, result;

    // we need info from two childrend of each track fragment box
    trafs = MP4Demuxer.findBox(fragment, ['moof', 'traf']);

    // determine the start times for each track
    baseTimes = [].concat.apply([], trafs.map(function (traf) {
      return MP4Demuxer.findBox(traf, ['tfhd']).map(function (tfhd) {
        let id, scale, baseTime;

        // get the track id from the tfhd
        id = MP4Demuxer.readUint32(tfhd, 4);
        // assume a 90kHz clock if no timescale was specified
        scale = initData[id].timescale || 90e3;

        // get the base media decode time from the tfdt
        baseTime = MP4Demuxer.findBox(traf, ['tfdt']).map(function (tfdt) {
          let version, result;

          version = tfdt.data[tfdt.start];
          result = MP4Demuxer.readUint32(tfdt, 4);
          if (version === 1) {
            result *= Math.pow(2, 32);

            result += MP4Demuxer.readUint32(tfdt, 8);
          }
          return result;
        })[0];
        // convert base time to seconds
        return baseTime / scale;
      });
    }));

    // return the minimum
    result = Math.min.apply(null, baseTimes);
    return isFinite(result) ? result : 0;
  }

  static offsetStartDTS (initData, fragment, timeOffset) {
    MP4Demuxer.findBox(fragment, ['moof', 'traf']).map(function (traf) {
      return MP4Demuxer.findBox(traf, ['tfhd']).map(function (tfhd) {
      // get the track id from the tfhd
        let id = MP4Demuxer.readUint32(tfhd, 4);
        // assume a 90kHz clock if no timescale was specified
        let timescale = initData[id].timescale || 90e3;

        // get the base media decode time from the tfdt
        MP4Demuxer.findBox(traf, ['tfdt']).map(function (tfdt) {
          let version = tfdt.data[tfdt.start];
          let baseMediaDecodeTime = MP4Demuxer.readUint32(tfdt, 4);
          if (version === 0) {
            MP4Demuxer.writeUint32(tfdt, 4, baseMediaDecodeTime - timeOffset * timescale);
          } else {
            baseMediaDecodeTime *= Math.pow(2, 32);
            baseMediaDecodeTime += MP4Demuxer.readUint32(tfdt, 8);
            baseMediaDecodeTime -= timeOffset * timescale;
            baseMediaDecodeTime = Math.max(baseMediaDecodeTime, 0);
            const upper = Math.floor(baseMediaDecodeTime / (UINT32_MAX + 1));
            const lower = Math.floor(baseMediaDecodeTime % (UINT32_MAX + 1));
            MP4Demuxer.writeUint32(tfdt, 4, upper);
            MP4Demuxer.writeUint32(tfdt, 8, lower);
          }
        });
      });
    });
  }

  // feed incoming data to the front of the parsing pipeline
  append (data, timeOffset, contiguous, accurateTimeOffset) {
    let initData = this.initData;
    if (!initData) {
      this.resetInitSegment(data, this.audioCodec, this.videoCodec, false);
      initData = this.initData;
    }
    let startDTS, initPTS = this.initPTS;
    if (initPTS === undefined) {
      let startDTS = MP4Demuxer.getStartDTS(initData, data);
      this.initPTS = initPTS = startDTS - timeOffset;
      this.observer.trigger(HlsEvents.INIT_PTS_FOUND, { initPTS: initPTS });
    }
    MP4Demuxer.offsetStartDTS(initData, data, initPTS);
    startDTS = MP4Demuxer.getStartDTS(initData, data);
    this.remuxer.remux(initData.audio, initData.video, null, null, startDTS, contiguous, accurateTimeOffset, data);
  }

  destroy () {}
}



/**
 * passthrough remuxer
*/


class PassThroughRemuxer {
  constructor (observer) {
    this.observer = observer;
  }

  destroy () {
  }

  resetTimeStamp () {
  }

  resetInitSegment () {
  }

  remux (audioTrack, videoTrack, id3Track, textTrack, timeOffset, contiguous, accurateTimeOffset, rawData) {
    let observer = this.observer;
    let streamType = '';
    if (audioTrack) {
      streamType += 'audio';
    }

    if (videoTrack) {
      streamType += 'video';
    }

    observer.trigger(HlsEvents.FRAG_PARSING_DATA, {
      data1: rawData,
      startPTS: timeOffset,
      startDTS: timeOffset,
      type: streamType,
      hasAudio: !!audioTrack,
      hasVideo: !!videoTrack,
      nb: 1,
      dropped: 0
    });
    // notify end of parsing
    observer.trigger(HlsEvents.FRAG_PARSED);
  }
}





/**
 * ID3 parser
 */
class ID3 {
  /**
   * Returns true if an ID3 header can be found at offset in data
   * @param {Uint8Array} data - The data to search in
   * @param {number} offset - The offset at which to start searching
   * @return {boolean} - True if an ID3 header is found
   */
  static isHeader (data, offset) {
    /*
    * http://id3.org/id3v2.3.0
    * [0]     = 'I'
    * [1]     = 'D'
    * [2]     = '3'
    * [3,4]   = {Version}
    * [5]     = {Flags}
    * [6-9]   = {ID3 Size}
    *
    * An ID3v2 tag can be detected with the following pattern:
    *  $49 44 33 yy yy xx zz zz zz zz
    * Where yy is less than $FF, xx is the 'flags' byte and zz is less than $80
    */
    if (offset + 10 <= data.length) {
      // look for 'ID3' identifier
      if (data[offset] === 0x49 && data[offset + 1] === 0x44 && data[offset + 2] === 0x33) {
        // check version is within range
        if (data[offset + 3] < 0xFF && data[offset + 4] < 0xFF) {
          // check size is within range
          if (data[offset + 6] < 0x80 && data[offset + 7] < 0x80 && data[offset + 8] < 0x80 && data[offset + 9] < 0x80) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Returns true if an ID3 footer can be found at offset in data
   * @param {Uint8Array} data - The data to search in
   * @param {number} offset - The offset at which to start searching
   * @return {boolean} - True if an ID3 footer is found
   */
  static isFooter (data, offset) {
    /*
    * The footer is a copy of the header, but with a different identifier
    */
    if (offset + 10 <= data.length) {
      // look for '3DI' identifier
      if (data[offset] === 0x33 && data[offset + 1] === 0x44 && data[offset + 2] === 0x49) {
        // check version is within range
        if (data[offset + 3] < 0xFF && data[offset + 4] < 0xFF) {
          // check size is within range
          if (data[offset + 6] < 0x80 && data[offset + 7] < 0x80 && data[offset + 8] < 0x80 && data[offset + 9] < 0x80) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Returns any adjacent ID3 tags found in data starting at offset, as one block of data
   * @param {Uint8Array} data - The data to search in
   * @param {number} offset - The offset at which to start searching
   * @return {Uint8Array} - The block of data containing any ID3 tags found
   */
  static getID3Data (data, offset) {
    const front = offset;
    let length = 0;

    while (ID3.isHeader(data, offset)) {
      // ID3 header is 10 bytes
      length += 10;

      const size = ID3._readSize(data, offset + 6);
      length += size;

      if (ID3.isFooter(data, offset + 10)) {
        // ID3 footer is 10 bytes
        length += 10;
      }

      offset += length;
    }

    if (length > 0) {
      return data.subarray(front, front + length);
    }

    return undefined;
  }

  static _readSize (data, offset) {
    let size = 0;
    size = ((data[offset] & 0x7f) << 21);
    size |= ((data[offset + 1] & 0x7f) << 14);
    size |= ((data[offset + 2] & 0x7f) << 7);
    size |= (data[offset + 3] & 0x7f);
    return size;
  }

  /**
   * Searches for the Elementary Stream timestamp found in the ID3 data chunk
   * @param {Uint8Array} data - Block of data containing one or more ID3 tags
   * @return {number} - The timestamp
   */
  static getTimeStamp (data) {
    const frames = ID3.getID3Frames(data);
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (ID3.isTimeStampFrame(frame)) {
        return ID3._readTimeStamp(frame);
      }
    }

    return undefined;
  }

  /**
   * Returns true if the ID3 frame is an Elementary Stream timestamp frame
   * @param {ID3 frame} frame
   */
  static isTimeStampFrame (frame) {
    return (frame && frame.key === 'PRIV' && frame.info === 'com.apple.streaming.transportStreamTimestamp');
  }

  static _getFrameData (data) {
    /*
    Frame ID       $xx xx xx xx (four characters)
    Size           $xx xx xx xx
    Flags          $xx xx
    */
    const type = String.fromCharCode(data[0], data[1], data[2], data[3]);
    const size = ID3._readSize(data, 4);

    // skip frame id, size, and flags
    let offset = 10;

    return { type, size, data: data.subarray(offset, offset + size) };
  }

  /**
   * Returns an array of ID3 frames found in all the ID3 tags in the id3Data
   * @param {Uint8Array} id3Data - The ID3 data containing one or more ID3 tags
   * @return {ID3 frame[]} - Array of ID3 frame objects
   */
  static getID3Frames (id3Data) {
    let offset = 0;
    const frames = [];

    while (ID3.isHeader(id3Data, offset)) {
      const size = ID3._readSize(id3Data, offset + 6);
      // skip past ID3 header
      offset += 10;
      const end = offset + size;
      // loop through frames in the ID3 tag
      while (offset + 8 < end) {
        const frameData = ID3._getFrameData(id3Data.subarray(offset));
        const frame = ID3._decodeFrame(frameData);
        if (frame) {
          frames.push(frame);
        }

        // skip frame header and frame data
        offset += frameData.size + 10;
      }

      if (ID3.isFooter(id3Data, offset)) {
        offset += 10;
      }
    }

    return frames;
  }

  static _decodeFrame (frame) {
    if (frame.type === 'PRIV') {
      return ID3._decodePrivFrame(frame);
    } else if (frame.type[0] === 'T') {
      return ID3._decodeTextFrame(frame);
    } else if (frame.type[0] === 'W') {
      return ID3._decodeURLFrame(frame);
    }

    return undefined;
  }

  static _readTimeStamp (timeStampFrame) {
    if (timeStampFrame.data.byteLength === 8) {
      const data = new Uint8Array(timeStampFrame.data);
      // timestamp is 33 bit expressed as a big-endian eight-octet number,
      // with the upper 31 bits set to zero.
      const pts33Bit = data[3] & 0x1;
      let timestamp = (data[4] << 23) +
                      (data[5] << 15) +
                      (data[6] << 7) +
                       data[7];
      timestamp /= 45;

      if (pts33Bit) {
        timestamp += 47721858.84;
      } // 2^32 / 90

      return Math.round(timestamp);
    }

    return undefined;
  }

  static _decodePrivFrame (frame) {
    /*
    Format: <text string>\0<binary data>
    */
    if (frame.size < 2) {
      return undefined;
    }

    const owner = ID3._utf8ArrayToStr(frame.data, true);
    const privateData = new Uint8Array(frame.data.subarray(owner.length + 1));

    return { key: frame.type, info: owner, data: privateData.buffer };
  }

  static _decodeTextFrame (frame) {
    if (frame.size < 2) {
      return undefined;
    }

    if (frame.type === 'TXXX') {
      /*
      Format:
      [0]   = {Text Encoding}
      [1-?] = {Description}\0{Value}
      */
      let index = 1;
      const description = ID3._utf8ArrayToStr(frame.data.subarray(index), true);

      index += description.length + 1;
      const value = ID3._utf8ArrayToStr(frame.data.subarray(index));

      return { key: frame.type, info: description, data: value };
    } else {
      /*
      Format:
      [0]   = {Text Encoding}
      [1-?] = {Value}
      */
      const text = ID3._utf8ArrayToStr(frame.data.subarray(1));
      return { key: frame.type, data: text };
    }
  }

  static _decodeURLFrame (frame) {
    if (frame.type === 'WXXX') {
      /*
      Format:
      [0]   = {Text Encoding}
      [1-?] = {Description}\0{URL}
      */
      if (frame.size < 2) {
        return undefined;
      }

      let index = 1;
      const description = ID3._utf8ArrayToStr(frame.data.subarray(index), true);

      index += description.length + 1;
      const value = ID3._utf8ArrayToStr(frame.data.subarray(index));

      return { key: frame.type, info: description, data: value };
    } else {
      /*
      Format:
      [0-?] = {URL}
      */
      const url = ID3._utf8ArrayToStr(frame.data);
      return { key: frame.type, data: url };
    }
  }

  // http://stackoverflow.com/questions/8936984/uint8array-to-string-in-javascript/22373197
  // http://www.onicos.com/staff/iz/amuse/javascript/expert/utf.txt
  /* utf.js - UTF-8 <=> UTF-16 convertion
   *
   * Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
   * Version: 1.0
   * LastModified: Dec 25 1999
   * This library is free.  You can redistribute it and/or modify it.
   */
  static _utf8ArrayToStr (array, exitOnNull = false) {
    const decoder = getTextDecoder();
    if (decoder) {
      const decoded = decoder.decode(array);

      if (exitOnNull) {
        // grab up to the first null
        const idx = decoded.indexOf('\0');
        return idx !== -1 ? decoded.substring(0, idx) : decoded;
      }

      // remove any null characters
      return decoded.replace(/\0/g, '');
    }

    const len = array.length;
    let c;
    let char2;
    let char3;
    let out = '';
    let i = 0;
    while (i < len) {
      c = array[i++];
      if (c === 0x00 && exitOnNull) {
        return out;
      } else if (c === 0x00 || c === 0x03) {
        // If the character is 3 (END_OF_TEXT) or 0 (NULL) then skip it
        continue;
      }
      switch (c >> 4) {
      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c);
        break;
      case 12: case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++];
        out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
        break;
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++];
        char3 = array[i++];
        out += String.fromCharCode(((c & 0x0F) << 12) |
                    ((char2 & 0x3F) << 6) |
                    ((char3 & 0x3F) << 0));
        break;
      default:
      }
    }
    return out;
  }
}

let decoder;

function getTextDecoder () {
  const global = getSelfScope(); // safeguard for code that might run both on worker and main thread
  if (!decoder && typeof global.TextDecoder !== 'undefined') {
    decoder = new global.TextDecoder('utf-8');
  }

  return decoder;
}

const utf8ArrayToStr = ID3._utf8ArrayToStr;





/**
 * AAC demuxer
 */




class AACDemuxer {
  constructor (observer, remuxer, config) {
    this.observer = observer;
    this.config = config;
    this.remuxer = remuxer;
  }

  resetInitSegment (initSegment, audioCodec, videoCodec, duration) {
    this._audioTrack = { container: 'audio/adts', type: 'audio', id: 0, sequenceNumber: 0, isAAC: true, samples: [], len: 0, manifestCodec: audioCodec, duration: duration, inputTimeScale: 90000 };
  }

  resetTimeStamp () {
  }

  static probe (data) {
    if (!data) {
      return false;
    }

    // Check for the ADTS sync word
    // Look for ADTS header | 1111 1111 | 1111 X00X | where X can be either 0 or 1
    // Layer bits (position 14 and 15) in header should be always 0 for ADTS
    // More info https://wiki.multimedia.cx/index.php?title=ADTS
    const id3Data = ID3.getID3Data(data, 0) || [];
    let offset = id3Data.length;

    for (let length = data.length; offset < length; offset++) {
      if (ADTS.probe(data, offset)) {
        logger.log('ADTS sync word found !');
        return true;
      }
    }
    return false;
  }

  // feed incoming data to the front of the parsing pipeline
  append (data, timeOffset, contiguous, accurateTimeOffset) {
    let track = this._audioTrack;
    let id3Data = ID3.getID3Data(data, 0) || [];
    let timestamp = ID3.getTimeStamp(id3Data);
    let pts = Number.isFinite(timestamp) ? timestamp * 90 : timeOffset * 90000;
    let frameIndex = 0;
    let stamp = pts;
    let length = data.length;
    let offset = id3Data.length;

    let id3Samples = [{ pts: stamp, dts: stamp, data: id3Data }];

    while (offset < length - 1) {
      if (ADTS.isHeader(data, offset) && (offset + 5) < length) {
        ADTS.initTrackConfig(track, this.observer, data, offset, track.manifestCodec);
        let frame = ADTS.appendFrame(track, data, offset, pts, frameIndex);
        if (frame) {
          offset += frame.length;
          stamp = frame.sample.pts;
          frameIndex++;
        } else {
          logger.log('Unable to parse AAC frame');
          break;
        }
      } else if (ID3.isHeader(data, offset)) {
        id3Data = ID3.getID3Data(data, offset);
        id3Samples.push({ pts: stamp, dts: stamp, data: id3Data });
        offset += id3Data.length;
      } else {
        // nothing found, keep looking
        offset++;
      }
    }

    this.remuxer.remux(track,
      { samples: [] },
      { samples: id3Samples, inputTimeScale: 90000 },
      { samples: [] },
      timeOffset,
      contiguous,
      accurateTimeOffset);
  }

  destroy () {
  }
}



/**
 * MP3 demuxer
 */




class MP3Demuxer {
  constructor (observer, remuxer, config) {
    this.observer = observer;
    this.config = config;
    this.remuxer = remuxer;
  }

  resetInitSegment (initSegment, audioCodec, videoCodec, duration) {
    this._audioTrack = { container: 'audio/mpeg', type: 'audio', id: -1, sequenceNumber: 0, isAAC: false, samples: [], len: 0, manifestCodec: audioCodec, duration: duration, inputTimeScale: 90000 };
  }

  resetTimeStamp () {
  }

  static probe (data) {
    // check if data contains ID3 timestamp and MPEG sync word
    let offset, length;
    let id3Data = ID3.getID3Data(data, 0) || [];
    if (id3Data && (ID3.getTimeStamp(id3Data) || 0) !== undefined) {
      // Look for MPEG header | 1111 1111 | 111X XYZX | where X can be either 0 or 1 and Y or Z should be 1
      // Layer bits (position 14 and 15) in header should be always different from 0 (Layer I or Layer II or Layer III)
      // More info http://www.mp3-tech.org/programmer/frame_header.html
      for (offset = id3Data.length, length = Math.min(data.length - 1, offset + 100); offset < length; offset++) {
        if (MpegAudio.probe(data, offset)) {
          logger.log('MPEG Audio sync word found !');
          return true;
        }
      }
    }
    return false;
  }

  // feed incoming data to the front of the parsing pipeline
  append (data, timeOffset, contiguous, accurateTimeOffset) {
    let id3Data = ID3.getID3Data(data, 0) || [];
    let timestamp = (ID3.getTimeStamp(id3Data) || 0);
    let pts = timestamp !== undefined ? 90 * timestamp : timeOffset * 90000;
    let offset = id3Data.length;
    let length = data.length;
    let frameIndex = 0, stamp = 0;
    let track = this._audioTrack;

    let id3Samples = [{ pts: pts, dts: pts, data: id3Data }];

    while (offset < length) {
      if (MpegAudio.isHeader(data, offset)) {
        let frame = MpegAudio.appendFrame(track, data, offset, pts, frameIndex);
        if (frame) {
          offset += frame.length;
          stamp = frame.sample.pts;
          frameIndex++;
        } else {
          // logger.log('Unable to parse Mpeg audio frame');
          break;
        }
      } else if (ID3.isHeader(data, offset)) {
        id3Data = ID3.getID3Data(data, offset);
        id3Samples.push({ pts: stamp, dts: stamp, data: id3Data });
        offset += id3Data.length;
      } else {
        // nothing found, keep looking
        offset++;
      }
    }

    this.remuxer.remux(track,
      { samples: [] },
      { samples: id3Samples, inputTimeScale: 90000 },
      { samples: [] },
      timeOffset,
      contiguous,
      accurateTimeOffset);
  }

  destroy () {
  }
}



class Level {
  constructor (baseUrl) {
    // Please keep properties in alphabetical order
    this.endCC = 0;
    this.endSN = 0;
    this.fragments = [];
    this.initSegment = null;
    this.live = true;
    this.needSidxRanges = false;
    this.startCC = 0;
    this.startSN = 0;
    this.startTimeOffset = null;
    this.targetduration = 0;
    this.totalduration = 0;
    this.type = null;
    this.url = baseUrl;
    this.version = null;
  }

  get hasProgramDateTime () {
    return !!(this.fragments[0] && Number.isFinite(this.fragments[0].programDateTime));
  }
}

var LevelKey = /** @class */ (function () {
    function LevelKey(baseURI, relativeURI) {
        this._uri = null;
        this.method = null;
        this.key = null;
        this.iv = null;
        this.baseuri = baseURI;
        this.reluri = relativeURI;
    }
    Object.defineProperty(LevelKey.prototype, "uri", {
        get: function () {
            if (!this._uri && this.reluri) {
                this._uri = URLToolkit.buildAbsoluteURL(this.baseuri, this.reluri, { alwaysNormalize: true });
            }
            return this._uri;
        },
        enumerable: false,
        configurable: true
    });
    return LevelKey;
}());

var ElementaryStreamTypes;
(function (ElementaryStreamTypes) {
    ElementaryStreamTypes["AUDIO"] = "audio";
    ElementaryStreamTypes["VIDEO"] = "video";
})(ElementaryStreamTypes || (ElementaryStreamTypes = {}));
var Fragment = /** @class */ (function () {
    function Fragment() {
        var _a;
        this._url = null;
        this._byteRange = null;
        this._decryptdata = null;
        // Holds the types of data this fragment supports
        this._elementaryStreams = (_a = {},
            _a[ElementaryStreamTypes.AUDIO] = false,
            _a[ElementaryStreamTypes.VIDEO] = false,
            _a);
        // deltaPTS tracks the change in presentation timestamp between fragments
        this.deltaPTS = 0;
        this.rawProgramDateTime = null;
        this.programDateTime = null;
        this.title = null;
        this.tagList = [];
        // sn notates the sequence number for a segment, and if set to a string can be 'initSegment'
        this.sn = 0;
        this.urlId = 0;
        // level matches this fragment to a index playlist
        this.level = 0;
    }
    // setByteRange converts a EXT-X-BYTERANGE attribute into a two element array
    Fragment.prototype.setByteRange = function (value, previousFrag) {
        var params = value.split('@', 2);
        var byteRange = [];
        if (params.length === 1) {
            byteRange[0] = previousFrag ? previousFrag.byteRangeEndOffset : 0;
        }
        else {
            byteRange[0] = parseInt(params[1]);
        }
        byteRange[1] = parseInt(params[0]) + byteRange[0];
        this._byteRange = byteRange;
    };
    Object.defineProperty(Fragment.prototype, "url", {
        get: function () {
            if (!this._url && this.relurl) {
                this._url = URLToolkit.buildAbsoluteURL(this.baseurl, this.relurl, { alwaysNormalize: true });
            }
            return this._url;
        },
        set: function (value) {
            this._url = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Fragment.prototype, "byteRange", {
        get: function () {
            if (!this._byteRange) {
                return [];
            }
            return this._byteRange;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Fragment.prototype, "byteRangeStartOffset", {
        /**
         * @type {number}
         */
        get: function () {
            return this.byteRange[0];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Fragment.prototype, "byteRangeEndOffset", {
        get: function () {
            return this.byteRange[1];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Fragment.prototype, "decryptdata", {
        get: function () {
            if (!this.levelkey && !this._decryptdata) {
                return null;
            }
            if (!this._decryptdata && this.levelkey) {
                var sn = this.sn;
                if (typeof sn !== 'number') {
                    // We are fetching decryption data for a initialization segment
                    // If the segment was encrypted with AES-128
                    // It must have an IV defined. We cannot substitute the Segment Number in.
                    if (this.levelkey && this.levelkey.method === 'AES-128' && !this.levelkey.iv) {
                        logger.warn("missing IV for initialization segment with method=\"" + this.levelkey.method + "\" - compliance issue");
                    }
                    /*
                    Be converted to a Number.
                    'initSegment' will become NaN.
                    NaN, which when converted through ToInt32() -> +0.
                    ---
                    Explicitly set sn to resulting value from implicit conversions 'initSegment' values for IV generation.
                    */
                    sn = 0;
                }
                this._decryptdata = this.setDecryptDataFromLevelKey(this.levelkey, sn);
            }
            return this._decryptdata;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Fragment.prototype, "endProgramDateTime", {
        get: function () {
            if (this.programDateTime === null) {
                return null;
            }
            if (!Number.isFinite(this.programDateTime)) {
                return null;
            }
            var duration = !Number.isFinite(this.duration) ? 0 : this.duration;
            return this.programDateTime + (duration * 1000);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Fragment.prototype, "encrypted", {
        get: function () {
            return !!((this.decryptdata && this.decryptdata.uri !== null) && (this.decryptdata.key === null));
        },
        enumerable: false,
        configurable: true
    });
    /**
     * @param {ElementaryStreamTypes} type
     */
    Fragment.prototype.addElementaryStream = function (type) {
        this._elementaryStreams[type] = true;
    };
    /**
     * @param {ElementaryStreamTypes} type
     */
    Fragment.prototype.hasElementaryStream = function (type) {
        return this._elementaryStreams[type] === true;
    };
    /**
     * Utility method for parseLevelPlaylist to create an initialization vector for a given segment
     * @param {number} segmentNumber - segment number to generate IV with
     * @returns {Uint8Array}
     */
    Fragment.prototype.createInitializationVector = function (segmentNumber) {
        var uint8View = new Uint8Array(16);
        for (var i = 12; i < 16; i++) {
            uint8View[i] = (segmentNumber >> 8 * (15 - i)) & 0xff;
        }
        return uint8View;
    };
    /**
     * Utility method for parseLevelPlaylist to get a fragment's decryption data from the currently parsed encryption key data
     * @param levelkey - a playlist's encryption info
     * @param segmentNumber - the fragment's segment number
     * @returns {LevelKey} - an object to be applied as a fragment's decryptdata
     */
    Fragment.prototype.setDecryptDataFromLevelKey = function (levelkey, segmentNumber) {
        var decryptdata = levelkey;
        if ((levelkey === null || levelkey === void 0 ? void 0 : levelkey.method) && levelkey.uri && !levelkey.iv) {
            decryptdata = new LevelKey(levelkey.baseuri, levelkey.reluri);
            decryptdata.method = levelkey.method;
            decryptdata.iv = this.createInitializationVector(segmentNumber);
        }
        return decryptdata;
    };
    return Fragment;
}());

/**
 * M3U8 parser
 * @module
 */
// https://regex101.com is your friend
var MASTER_PLAYLIST_REGEX = /(?:#EXT-X-STREAM-INF:([^\n\r]*)[\r\n]+([^\r\n]+)|#EXT-X-SESSION-DATA:([^\n\r]*)[\r\n]+)/g;
var MASTER_PLAYLIST_MEDIA_REGEX = /#EXT-X-MEDIA:(.*)/g;
var LEVEL_PLAYLIST_REGEX_FAST = new RegExp([
    /#EXTINF:\s*(\d*(?:\.\d+)?)(?:,(.*)\s+)?/.source,
    /|(?!#)([\S+ ?]+)/.source,
    /|#EXT-X-BYTERANGE:*(.+)/.source,
    /|#EXT-X-PROGRAM-DATE-TIME:(.+)/.source,
    /|#.*/.source // All other non-segment oriented tags will match with all groups empty
].join(''), 'g');
var LEVEL_PLAYLIST_REGEX_SLOW = /(?:(?:#(EXTM3U))|(?:#EXT-X-(PLAYLIST-TYPE):(.+))|(?:#EXT-X-(MEDIA-SEQUENCE): *(\d+))|(?:#EXT-X-(TARGETDURATION): *(\d+))|(?:#EXT-X-(KEY):(.+))|(?:#EXT-X-(START):(.+))|(?:#EXT-X-(ENDLIST))|(?:#EXT-X-(DISCONTINUITY-SEQ)UENCE:(\d+))|(?:#EXT-X-(DIS)CONTINUITY))|(?:#EXT-X-(VERSION):(\d+))|(?:#EXT-X-(MAP):(.+))|(?:(#)([^:]*):(.*))|(?:(#)(.*))(?:.*)\r?\n?/;
var MP4_REGEX_SUFFIX = /\.(mp4|m4s|m4v|m4a)$/i;
var M3U8Parser = /** @class */ (function () {
    function M3U8Parser() {
    }
    M3U8Parser.findGroup = function (groups, mediaGroupId) {
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            if (group.id === mediaGroupId) {
                return group;
            }
        }
    };
    M3U8Parser.convertAVC1ToAVCOTI = function (codec) {
        var avcdata = codec.split('.');
        var result;
        if (avcdata.length > 2) {
            result = avcdata.shift() + '.';
            result += parseInt(avcdata.shift()).toString(16);
            result += ('000' + parseInt(avcdata.shift()).toString(16)).substr(-4);
        }
        else {
            result = codec;
        }
        return result;
    };
    M3U8Parser.resolve = function (url, baseUrl) {
        return URLToolkit.buildAbsoluteURL(baseUrl, url, { alwaysNormalize: true });
    };
    M3U8Parser.parseMasterPlaylist = function (string, baseurl) {
        // TODO(typescript-level)
        var levels = [];
        var sessionData = {};
        var hasSessionData = false;
        MASTER_PLAYLIST_REGEX.lastIndex = 0;
        // TODO(typescript-level)
        function setCodecs(codecs, level) {
            ['video', 'audio'].forEach(function (type) {
                var filtered = codecs.filter(function (codec) { return isCodecType(codec, type); });
                if (filtered.length) {
                    var preferred = filtered.filter(function (codec) {
                        return codec.lastIndexOf('avc1', 0) === 0 || codec.lastIndexOf('mp4a', 0) === 0;
                    });
                    level[type + "Codec"] = preferred.length > 0 ? preferred[0] : filtered[0];
                    // remove from list
                    codecs = codecs.filter(function (codec) { return filtered.indexOf(codec) === -1; });
                }
            });
            level.unknownCodecs = codecs;
        }
        var result;
        while ((result = MASTER_PLAYLIST_REGEX.exec(string)) != null) {
            if (result[1]) {
                // '#EXT-X-STREAM-INF' is found, parse level tag  in group 1
                // TODO(typescript-level)
                var level = {};
                var attrs = level.attrs = new AttrList(result[1]);
                level.url = M3U8Parser.resolve(result[2], baseurl);
                var resolution = attrs.decimalResolution('RESOLUTION');
                if (resolution) {
                    level.width = resolution.width;
                    level.height = resolution.height;
                }
                level.bitrate = attrs.decimalInteger('AVERAGE-BANDWIDTH') || attrs.decimalInteger('BANDWIDTH');
                level.name = attrs.NAME;
                setCodecs([].concat((attrs.CODECS || '').split(/[ ,]+/)), level);
                if (level.videoCodec && level.videoCodec.indexOf('avc1') !== -1) {
                    level.videoCodec = M3U8Parser.convertAVC1ToAVCOTI(level.videoCodec);
                }
                levels.push(level);
            }
            else if (result[3]) {
                // '#EXT-X-SESSION-DATA' is found, parse session data in group 3
                var sessionAttrs = new AttrList(result[3]);
                if (sessionAttrs['DATA-ID']) {
                    hasSessionData = true;
                    sessionData[sessionAttrs['DATA-ID']] = sessionAttrs;
                }
            }
        }
        return {
            levels: levels,
            sessionData: hasSessionData ? sessionData : null
        };
    };
    M3U8Parser.parseMasterPlaylistMedia = function (string, baseurl, type, audioGroups) {
        if (audioGroups === void 0) { audioGroups = []; }
        var result;
        var medias = [];
        var id = 0;
        MASTER_PLAYLIST_MEDIA_REGEX.lastIndex = 0;
        while ((result = MASTER_PLAYLIST_MEDIA_REGEX.exec(string)) !== null) {
            var attrs = new AttrList(result[1]);
            if (attrs.TYPE === type) {
                var media = {
                    attrs: attrs,
                    id: id++,
                    groupId: attrs['GROUP-ID'],
                    instreamId: attrs['INSTREAM-ID'],
                    name: attrs.NAME || attrs.LANGUAGE,
                    type: type,
                    "default": (attrs.DEFAULT === 'YES'),
                    autoselect: (attrs.AUTOSELECT === 'YES'),
                    forced: (attrs.FORCED === 'YES'),
                    lang: attrs.LANGUAGE
                };
                if (attrs.URI) {
                    media.url = M3U8Parser.resolve(attrs.URI, baseurl);
                }
                if (audioGroups.length) {
                    // If there are audio groups signalled in the manifest, let's look for a matching codec string for this track
                    var groupCodec = M3U8Parser.findGroup(audioGroups, media.groupId);
                    // If we don't find the track signalled, lets use the first audio groups codec we have
                    // Acting as a best guess
                    media.audioCodec = groupCodec ? groupCodec.codec : audioGroups[0].codec;
                }
                medias.push(media);
            }
        }
        return medias;
    };
    M3U8Parser.parseLevelPlaylist = function (string, baseurl, id, type, levelUrlId) {
        var currentSN = 0;
        var totalduration = 0;
        var level = new Level(baseurl);
        var discontinuityCounter = 0;
        var prevFrag = null;
        var frag = new Fragment();
        var result;
        var i;
        var levelkey;
        var firstPdtIndex = null;
        LEVEL_PLAYLIST_REGEX_FAST.lastIndex = 0;
        while ((result = LEVEL_PLAYLIST_REGEX_FAST.exec(string)) !== null) {
            var duration = result[1];
            if (duration) { // INF
                frag.duration = parseFloat(duration);
                // avoid sliced strings    https://github.com/video-dev/hls.js/issues/939
                var title = (' ' + result[2]).slice(1);
                frag.title = title || null;
                frag.tagList.push(title ? ['INF', duration, title] : ['INF', duration]);
            }
            else if (result[3]) { // url
                if (Number.isFinite(frag.duration)) {
                    var sn = currentSN++;
                    frag.type = type;
                    frag.start = totalduration;
                    if (levelkey) {
                        frag.levelkey = levelkey;
                    }
                    frag.sn = sn;
                    frag.level = id;
                    frag.cc = discontinuityCounter;
                    frag.urlId = levelUrlId;
                    frag.baseurl = baseurl;
                    // avoid sliced strings    https://github.com/video-dev/hls.js/issues/939
                    frag.relurl = (' ' + result[3]).slice(1);
                    assignProgramDateTime(frag, prevFrag);
                    level.fragments.push(frag);
                    prevFrag = frag;
                    totalduration += frag.duration;
                    frag = new Fragment();
                }
            }
            else if (result[4]) { // X-BYTERANGE
                var data = (' ' + result[4]).slice(1);
                if (prevFrag) {
                    frag.setByteRange(data, prevFrag);
                }
                else {
                    frag.setByteRange(data);
                }
            }
            else if (result[5]) { // PROGRAM-DATE-TIME
                // avoid sliced strings    https://github.com/video-dev/hls.js/issues/939
                frag.rawProgramDateTime = (' ' + result[5]).slice(1);
                frag.tagList.push(['PROGRAM-DATE-TIME', frag.rawProgramDateTime]);
                if (firstPdtIndex === null) {
                    firstPdtIndex = level.fragments.length;
                }
            }
            else {
                result = result[0].match(LEVEL_PLAYLIST_REGEX_SLOW);
                if (!result) {
                    logger.warn('No matches on slow regex match for level playlist!');
                    continue;
                }
                for (i = 1; i < result.length; i++) {
                    if (typeof result[i] !== 'undefined') {
                        break;
                    }
                }
                // avoid sliced strings    https://github.com/video-dev/hls.js/issues/939
                var value1 = (' ' + result[i + 1]).slice(1);
                var value2 = (' ' + result[i + 2]).slice(1);
                switch (result[i]) {
                    case '#':
                        frag.tagList.push(value2 ? [value1, value2] : [value1]);
                        break;
                    case 'PLAYLIST-TYPE':
                        level.type = value1.toUpperCase();
                        break;
                    case 'MEDIA-SEQUENCE':
                        currentSN = level.startSN = parseInt(value1);
                        break;
                    case 'TARGETDURATION':
                        level.targetduration = parseFloat(value1);
                        break;
                    case 'VERSION':
                        level.version = parseInt(value1);
                        break;
                    case 'EXTM3U':
                        break;
                    case 'ENDLIST':
                        level.live = false;
                        break;
                    case 'DIS':
                        discontinuityCounter++;
                        frag.tagList.push(['DIS']);
                        break;
                    case 'DISCONTINUITY-SEQ':
                        discontinuityCounter = parseInt(value1);
                        break;
                    case 'KEY': {
                        // https://tools.ietf.org/html/rfc8216#section-4.3.2.4
                        var decryptparams = value1;
                        var keyAttrs = new AttrList(decryptparams);
                        var decryptmethod = keyAttrs.enumeratedString('METHOD');
                        var decrypturi = keyAttrs.URI;
                        var decryptiv = keyAttrs.hexadecimalInteger('IV');
                        // From RFC: This attribute is OPTIONAL; its absence indicates an implicit value of "identity".
                        var decryptkeyformat = keyAttrs.KEYFORMAT || 'identity';
                        if (decryptkeyformat === 'com.apple.streamingkeydelivery') {
                            logger.warn('Keyformat com.apple.streamingkeydelivery is not supported');
                            continue;
                        }
                        if (decryptmethod) {
                            levelkey = new LevelKey(baseurl, decrypturi);
                            if ((decrypturi) && (['AES-128', 'SAMPLE-AES', 'SAMPLE-AES-CENC'].indexOf(decryptmethod) >= 0)) {
                                levelkey.method = decryptmethod;
                                levelkey.key = null;
                                // Initialization Vector (IV)
                                levelkey.iv = decryptiv;
                            }
                        }
                        break;
                    }
                    case 'START': {
                        var startAttrs = new AttrList(value1);
                        var startTimeOffset = startAttrs.decimalFloatingPoint('TIME-OFFSET');
                        // TIME-OFFSET can be 0
                        if (Number.isFinite(startTimeOffset)) {
                            level.startTimeOffset = startTimeOffset;
                        }
                        break;
                    }
                    case 'MAP': {
                        var mapAttrs = new AttrList(value1);
                        frag.relurl = mapAttrs.URI;
                        if (mapAttrs.BYTERANGE) {
                            frag.setByteRange(mapAttrs.BYTERANGE);
                        }
                        frag.baseurl = baseurl;
                        frag.level = id;
                        frag.type = type;
                        frag.sn = 'initSegment';
                        level.initSegment = frag;
                        frag = new Fragment();
                        frag.rawProgramDateTime = level.initSegment.rawProgramDateTime;
                        break;
                    }
                    default:
                        logger.warn("line parsed but not handled: " + result);
                        break;
                }
            }
        }
        frag = prevFrag;
        // logger.log('found ' + level.fragments.length + ' fragments');
        if (frag && !frag.relurl) {
            level.fragments.pop();
            totalduration -= frag.duration;
        }
        level.totalduration = totalduration;
        level.averagetargetduration = totalduration / level.fragments.length;
        level.endSN = currentSN - 1;
        level.startCC = level.fragments[0] ? level.fragments[0].cc : 0;
        level.endCC = discontinuityCounter;
        if (!level.initSegment && level.fragments.length) {
            // this is a bit lurky but HLS really has no other way to tell us
            // if the fragments are TS or MP4, except if we download them :/
            // but this is to be able to handle SIDX.
            if (level.fragments.every(function (frag) { return MP4_REGEX_SUFFIX.test(frag.relurl); })) {
                logger.warn('MP4 fragments found but no init segment (probably no MAP, incomplete M3U8), trying to fetch SIDX');
                frag = new Fragment();
                frag.relurl = level.fragments[0].relurl;
                frag.baseurl = baseurl;
                frag.level = id;
                frag.type = type;
                frag.sn = 'initSegment';
                level.initSegment = frag;
                level.needSidxRanges = true;
            }
        }
        /**
         * Backfill any missing PDT values
           "If the first EXT-X-PROGRAM-DATE-TIME tag in a Playlist appears after
           one or more Media Segment URIs, the client SHOULD extrapolate
           backward from that tag (using EXTINF durations and/or media
           timestamps) to associate dates with those segments."
         * We have already extrapolated forward, but all fragments up to the first instance of PDT do not have their PDTs
         * computed.
         */
        if (firstPdtIndex) {
            backfillProgramDateTimes(level.fragments, firstPdtIndex);
        }
        return level;
    };
    return M3U8Parser;
}());
function backfillProgramDateTimes(fragments, startIndex) {
    var fragPrev = fragments[startIndex];
    for (var i = startIndex - 1; i >= 0; i--) {
        var frag = fragments[i];
        frag.programDateTime = fragPrev.programDateTime - (frag.duration * 1000);
        fragPrev = frag;
    }
}
function assignProgramDateTime(frag, prevFrag) {
    if (frag.rawProgramDateTime) {
        frag.programDateTime = Date.parse(frag.rawProgramDateTime);
    }
    else if (prevFrag === null || prevFrag === void 0 ? void 0 : prevFrag.programDateTime) {
        frag.programDateTime = prevFrag.endProgramDateTime;
    }
    if (!Number.isFinite(frag.programDateTime)) {
        frag.programDateTime = null;
        frag.rawProgramDateTime = null;
    }
}

Object.assign( _ex_ , { HlsEvents , Fragment , LevelKey , isCodecSupportedInMp4 , MpegAudio , M3U8Parser , AESDecryptor , TSDemuxer , MP4Demuxer , AACDemuxer , MP3Demuxer , MP4Remuxer , PassThroughRemuxer } );
})(this);
