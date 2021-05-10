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
const BoxProps = {isom:{container:true}, ftyp:{struct:[["majorBrand", "text", 4], ["minorVersion", "int", 4], ["compatibleBrands", ["text", 4], "end"]]}, moov:{container:true}, mvhd:{struct:[["version", "int", 1], ["flags", "int", 3], ["creationTime", "int", 4, "or", 8], ["modificationTime", "int", 4, "or", 8], ["timeScale", "int", 4], ["duration", "int", 4, "or", 8], ["rate", "int", 4], ["volume", "int", 2], ["reserved", "skip", 10], ["matrix", ["int", 4], 9], ["preDefined", "skip", 24], ["nextTrackID", 
"int", 4]]}, mvex:{container:true}, mehd:{struct:[["version", "int", 1], ["flags", "int", 3], ["fragmentDuration", "int", 4, "or", 8]]}, trex:{struct:[["version", "int", 1], ["flags", "int", 3], ["trackID", "int", 4], ["sampleDescriptionIndex", "int", 4], ["sampleDuration", "int", 4], ["sampleSize", "int", 4], ["sampleFlags", "int", 4]]}, trep:{struct:[["version", "int", 1], ["flags", "int", 3], ["trackID", "int", 4]]}, iods:{}, trak:{container:true}, tkhd:{struct:[["version", "int", 1], ["flags", 
"int", 3], ["creationTime", "int", 4, "or", 8], ["modificationTime", "int", 4, "or", 8], ["trackID", "int", 4], ["reserved1", "int", 4], ["duration", "int", 4, "or", 8], ["reserved2", "skip", 8], ["layer", "int", 2], ["alternateGroup", "int", 2], ["volume", "int", 2], ["reserved3", "int", 2], ["matrix", ["int", 4], 9], ["width", "int", 4], ["height", "int", 4]]}, edts:{container:true}, elst:{struct:[["version", "int", 1], ["flags", "int", 3], ["entryCount", "int", 4], ["entries", [["segmentDuration", 
"int", 4, "or", 8], ["mediaTime", "int", 4, "or", 8], ["mediaRateInteger", "int", 2], ["mediaRateFraction", "int", 2]], "entryCount"]]}, mdia:{container:true}, mdhd:{struct:[["version", "int", 1], ["flags", "int", 3], ["creationTime", "int", 4, "or", 8], ["modificationTime", "int", 4, "or", 8], ["timeScale", "int", 4], ["duration", "int", 4, "or", 8], ["languageValues", "int", 2], ["QTQuality", "int", 2]]}, hdlr:{struct:[["version", "int", 1], ["flags", "int", 3], ["preDefined", "int", 4], ["handlerType", 
"text", 4], ["reserved", "skip", 12], ["name", "text", 0]]}, minf:{container:true}, vmhd:{}, dinf:{container:true}, dref:{struct:[["version", "int", 1], ["flags", "int", 3], ["entryCount", "int", 4], ["entrySize", "int", 4], ["typeText", "text", 4], ["entryVersion", "int", 1], ["entryFlags", "int", 3]]}, stbl:{container:true}, stsd:{}, stts:{struct:[["version", "int", 1], ["flags", "int", 3], ["entryCount", "int", 4], ["entries", [["sampleCount", "int", 4], ["sampleDuration", "int", 4]], "entryCount"]]}, 
stss:{struct:[["version", "int", 1], ["flags", "int", 3], ["entryCount", "int", 4], ["syncSamples", ["int", 4], "entryCount"]]}, stsz:{struct:[["version", "int", 1], ["flags", "int", 3], ["sampleSize", "int", 4], ["sampleCount", "int", 4], ["sampleSizes", ["int", 4], "sampleCount"]]}, stsc:{struct:[["version", "int", 1], ["flags", "int", 3], ["entryCount", "int", 4], ["entries", [["firstChunk", "int", 4], ["samplesPerChunk", "int", 4], ["sampleDescriptionIndex", "int", 4]], "entryCount"]]}, stco:{struct:[["version", 
"int", 1], ["flags", "int", 3], ["entryCount", "int", 4], ["chunkOffsets", ["int", 4], "entryCount"]]}, co64:{struct:[["version", "int", 1], ["flags", "int", 3], ["entryCount", "int", 4], ["chunkOffsets", ["int", 8], "entryCount"]]}, ctts:{struct:[["version", "int", 1], ["flags", "int", 3], ["entryCount", "int", 4], ["entries", [["sampleCount", "int", 4], ["sampleOffset", "int", 4]], "entryCount"]]}, stdp:{}, sdtp:{struct:[["version", "int", 1], ["flags", "int", 3], ["sampleDependencies", ["int", 
4], "end"]]}, stsh:{}, udta:{container:true}, mdat:{}, sidx:{struct:[["version", "int", 1], ["flags", "int", 3], ["referenceID", "int", 4], ["timeScale", "int", 4], ["earliestPresentationTime", "int", 4, "or", 8], ["firstOffset", "int", 4, "or", 8], ["reserved", "int", 2], ["referenceCount", "int", 2], ["references", [["subsegmentSize", "int", 4], ["subsegmentDuration", "int", 4], ["RAPDeltaTime", "int", 4]], "referenceCount"]]}, smhd:{struct:[["version", "int", 1], ["flags", "int", 3], ["balance", 
"int", 2], ["reserved", "int", 2]]}, moof:{container:true}, mfhd:{struct:[["version", "int", 1], ["flags", "int", 3], ["sequenceNumber", "int", 4]]}, traf:{container:true}, tfhd:{minLength:8, struct:[["version", "int", 1], ["flags", "int", 3], ["trackID", "int", 4], ["baseDataOffset", "int", 8, "if", 1], ["sampleDescriptionIndex", "int", 4, "if", 2], ["defaultSampleDuration", "int", 4, "if", 8], ["defaultSampleSize", "int", 4, "if", 16], ["defaultSampleFlags", "int", 4, "if", 32], ["emptyDuration", 
"int", 4], ["iframeSwitching", "int", 1]]}, tfma:{struct:[["version", "int", 1], ["flags", "int", 3], ["entryCount", "int", 4], ["segmentDuration", "int", 4, "or", 8], ["mediaTime", "int", 4, "or", 8], ["mediaRateInteger", "int", 2], ["mediaRateFraction", "int", 2]]}, tfdt:{struct:[["version", "int", 1], ["flags", "int", 3], ["baseMediaDecodeTime", "int", 4, "or", 8]]}, trun:{struct:[["version", "int", 1], ["flags", "int", 3], ["sampleCount", "int", 4], ["dataOffset", "int", 4, "if", 1], ["firstSampleFlags", 
"int", 4, "if", 4], ["samples", [["duration", "int", 4, "if", 256], ["size", "int", 4, "if", 512], ["flags", "int", 4, "if", 1024], ["compositionTimeOffset", "int", 4, "if", 2048]], "sampleCount"]]}, mfra:{container:true}, tfra:{struct:[["version", "int", 1], ["flags", "int", 3], ["entryCount", "int", 4], ["chunkOffsets", ["int", 4], "entryCount"]]}, mfro:{struct:[["version", "int", 1], ["flags", "int", 3], ["entryCount", "int", 4], ["chunkOffsets", ["int", 4], "entryCount"]]}, };
const SIZE = 0, READ = 1, WRITE = 2;
class Box {
  constructor(boxInfo, parent, offset) {
    if (!boxInfo) {
      throw new Error("usage : new Box( boxInfo , parent , offset ) or new Box( type )");
    }
    if (typeof boxInfo === "string") {
      this.property = BoxProps[boxInfo];
      if (!this.property) {
        throw new Error("not supported type : " + boxInfo);
      }
      this.boxInfo = {type:boxInfo, container:this.property.container};
    } else {
      if (!boxInfo.type) {
        throw new Error("Need boxInfo.type");
      }
      this.boxInfo = boxInfo;
      this.property = BoxProps[boxInfo.type];
    }
    this.type = this.boxInfo.type;
    this.container = this.boxInfo.container || this.property && this.property.container || false;
    this.setData(new Uint8Array(0), 0);
    this.offset = offset !== null && offset > 0 ? offset : 0;
    this.id = null;
    this.parent = parent;
    this.children = [];
    if (this.parent) {
      this.parent.appendChild(this);
    }
    this.wholeSize = 0;
  }
  setData(d, wholeSize) {
    this.data = d;
    this.buffer = new SimpleView(d);
    if (wholeSize) {
      this.wholeSize = wholeSize;
    }
  }
  setDataAndSync(d, wholeSize) {
    this.setData(d, wholeSize);
    this.sync(READ);
  }
  size() {
    if (this.container) {
      return this.type === "isom" ? 0 : 8;
    } else {
      return this.wholeSize || this.data && this.data.length;
    }
  }
  sync(mode) {
    const struct = this.property && this.property.struct || this.boxInfo.struct;
    const minLength = this.property && this.property.minLength || this.boxInfo.minLength;
    if (!struct) {
      return 0;
    }
    if (mode !== SIZE && mode !== READ && mode !== WRITE) {
      return 0;
    }
    if (mode !== SIZE) {
      if (this.buffer.data.length < 8) {
        return 0;
      }
      this.buffer.setPos(8);
    }
    const r = this.recursiveProc({mode, struct, minLength}, this, 0) + 8;
    return r;
  }
  calcLength(vlength, unitLength, properties) {
    const lengthType = typeof vlength;
    unitLength = unitLength > 0 ? unitLength : 1;
    if (lengthType == "number") {
      return vlength;
    } else {
      if (lengthType == "string") {
        if (vlength == "end") {
          return Math.floor((this.size() - this.buffer.getPos()) / unitLength);
        } else {
          const prop = vlength.match(/(\w+)([\-\+\*\/\d]*)/);
          let len = this[prop[1]] || 0;
          const op = prop[2] && prop[2][0];
          if (op) {
            const n = Number(prop[2].substr(1));
            if (op === "-") {
              len -= n;
            }
            if (op === "+") {
              len += n;
            }
            if (op === "*") {
              len *= n;
            }
            if (op === "/") {
              len /= n;
            }
          }
          return len;
        }
      }
    }
    return 0;
  }
  recursiveProc(option, target, depth) {
    const {mode, struct, minLength} = option;
    let _size = 0;
    for (let i = 0, len = struct.length; i < len; i++) {
      const vname = struct[i][0];
      const vtype = struct[i][1];
      let vlength = struct[i][2];
      const vcondition = struct[i][3];
      const voption = struct[i][4];
      if (vcondition !== null) {
        if (this.version && this.version > 0 && vcondition === "or") {
          vlength = voption;
        }
        if (this.flags && vcondition === "if" && (this.flags & voption) === 0) {
          continue;
        }
      }
      if (mode === READ && !this.buffer.ready()) {
        break;
      }
      if (mode === WRITE && target[vname] === (null || undefined)) {
        break;
      }
      if (mode === SIZE && minLength && (minLength <= _size && target[vname] === (null || undefined))) {
        break;
      }
      if (vtype === "int") {
        if (vlength === 1) {
          if (mode === READ) {
            target[vname] = this.buffer.read8();
          } else {
            if (mode === WRITE) {
              this.buffer.write8(target[vname]);
            }
          }
          _size += 1;
        } else {
          if (vlength === 2) {
            if (mode === READ) {
              target[vname] = this.buffer.read16();
            } else {
              if (mode === WRITE) {
                this.buffer.write16(target[vname]);
              }
            }
            _size += 2;
          } else {
            if (vlength === 3) {
              if (mode === READ) {
                target[vname] = this.buffer.read24();
              } else {
                if (mode === WRITE) {
                  this.buffer.write24(target[vname]);
                }
              }
              _size += 3;
            } else {
              if (vlength === 4) {
                if (mode === READ) {
                  target[vname] = this.buffer.read32();
                } else {
                  if (mode === WRITE) {
                    this.buffer.write32(target[vname]);
                  }
                }
                _size += 4;
              } else {
                if (vlength === 8) {
                  if (mode === READ) {
                    target[vname] = this.buffer.read64();
                  } else {
                    if (mode === WRITE) {
                      this.buffer.write64(target[vname]);
                    }
                  }
                  _size += 8;
                }
              }
            }
          }
        }
      } else {
        if (vtype === "skip") {
          const skipLen = this.calcLength(vlength, 1);
          if (mode === READ) {
            target[vname] = "(" + skipLen + ")bytes";
            this.buffer.skip(skipLen);
          } else {
            if (mode === WRITE) {
              this.buffer.fill(skipLen, 0);
            }
          }
          _size += skipLen;
        } else {
          if (vtype === "text") {
            const textLen = this.calcLength(vlength, 1);
            if (textLen > 0) {
              if (mode === READ) {
                target[vname] = this.buffer.readText(textLen);
              } else {
                if (mode === WRITE) {
                  this.buffer.writeText(target[vname], textLen);
                }
              }
              _size += textLen;
            } else {
              if (mode === READ) {
                target[vname] = this.buffer.readTextAsNullTermination();
              } else {
                if (mode === WRITE) {
                  this.buffer.writeTextAsNullTermination(target[vname]);
                }
              }
              if (target[vname]) {
                _size += target[vname].length + 1;
              }
            }
          } else {
            if (vtype instanceof Array) {
              if (mode === READ || mode === SIZE && target[vname] === (null || undefined)) {
                target[vname] = [];
              }
              if (vtype.length > 0) {
                const propArray = vtype[0] instanceof Array;
                let unitLength = 0;
                if (propArray) {
                  for (let _tmpi = 0, _tmplen = vtype[0].length; _tmpi < _tmplen; _tmpi++) {
                    unitLength += vtype[0][_tmpi][2];
                  }
                } else {
                  unitLength = vtype[1];
                }
                const loopCnt = mode === SIZE ? target[vname].length : this.calcLength(vlength, unitLength);
                for (let ai = 0; ai < loopCnt; ai++) {
                  if (propArray) {
                    const obj = mode === READ ? {} : target[vname][ai];
                    if (obj) {
                      _size += this.recursiveProc({mode, struct:vtype, minLength}, obj, depth + 1);
                      if (mode === READ) {
                        target[vname].push(obj);
                      }
                    }
                  } else {
                    _size += this.recursiveProc({mode, struct:[[ai, vtype[0], vtype[1]]], minLength}, target[vname], depth + 1);
                  }
                }
              }
            }
          }
        }
      }
      if (depth === 0 && target[vname]) {
      }
    }
    return _size;
  }
  hasChild(child) {
    for (let i = 0, len = this.children.length; i < len; i++) {
      if (this.children[i] === child) {
        return i;
      }
    }
    return -1;
  }
  append(child) {
    return this.appendChild(child);
  }
  appendChild(child) {
    if (child) {
      if (this.hasChild(child) === -1) {
        this.children.push(child);
        let list = this[child.type + "s"];
        if (!list) {
          list = [];
        }
        list.push(child);
        this[child.type + "s"] = list;
        this[child.type] = list[0];
      }
      child.parent = this;
    }
  }
  remove(child) {
    return this.removeChild(child);
  }
  removeChild(child) {
    if (child) {
      const pos = this.hasChild(child);
      if (pos !== -1) {
        this.children.splice(pos, 1);
        const list = this[child.type + "s"];
        if (list) {
          const idx = list.indexOf(child);
          if (idx >= 0) {
            list.splice(idx, 1);
          }
          if (list.length > 0) {
            this[child.type] = list[0];
          } else {
            delete this[child.type + "s"];
            delete this[child.type];
          }
        } else {
          delete this[child.type];
        }
      }
      child.parent = null;
    }
  }
  find(type) {
    const _find = box => {
      if (box.type === type) {
        return box;
      }
      for (let i = 0, len = box.children.length; i < len; i++) {
        const result = _find(box.children[i]);
        if (result) {
          return result;
        }
      }
      return null;
    };
    return _find(this);
  }
  findAll(type) {
    const _find = (box, result) => {
      if (box.type === type) {
        result.push(box);
      }
      for (let i = 0, len = box.children.length; i < len; i++) {
        _find(box.children[i], result);
      }
      return result;
    };
    return _find(this, []);
  }
  arrange() {
    const _calc = box => {
      const sz = box.sync(SIZE) || box.size();
      if (box.type !== "mdat" && sz !== box.data.length) {
        box.setData(new Uint8Array(sz));
      }
      box.sync(WRITE);
      let nextPtr = box.offset + sz;
      for (let i = 0, len = box.children.length; i < len; i++) {
        box.children[i].offset = nextPtr;
        nextPtr += _calc(box.children[i]);
      }
      box.wholeSize = nextPtr - box.offset;
      box.buffer.setPos(0);
      box.buffer.write32(box.wholeSize);
      box.buffer.writeText(box.type, 4);
      return box.wholeSize;
    };
    return _calc(this);
  }
  publish(buffer, progressCallback, _cb) {
    const _sz = this.sync(SIZE);
    if (_sz > 0) {
      if (_sz > this.data.length) {
        this.setData(new Uint8Array(_sz));
      }
    }
    this.sync(WRITE);
    const writeSize = this.size();
    if (writeSize > 0 && buffer) {
      buffer.writeUint8Array(this.data, 0, writeSize);
    }
    _cb(null);
  }
  publishToFile(writer, progressCallback, _cb) {
    const _sz = this.sync(SIZE);
    if (_sz > 0) {
      if (_sz > this.data.length) {
        this.setData(new Uint8Array(_sz));
      }
    }
    this.sync(WRITE);
    const writeSize = this.size();
    if (writeSize > 0 && writer) {
      writer(this.type, (w, isError) => {
        if (!isError) {
          w.write(new Blob([this.data]));
        }
        _cb(null);
      });
    } else {
      _cb(null);
    }
  }
  inspect() {
    return "Box : '" + this.type + "' [ " + (this.container ? "container" : "prop") + " ]" + " / " + this.size();
  }
  dump() {
    var r = "";
    for (var k in this) {
      if (typeof this[k] !== "function") {
        r += k + ":" + this[k] + " , ";
      }
    }
    return r;
  }
  static create(type, structure, initialData) {
    const boxInfo = {};
    boxInfo.type = type;
    boxInfo.struct = structure || BoxProps[type].struct;
    if (boxInfo.struct || initialData instanceof Uint8Array) {
      const box = new Box(boxInfo);
      if (boxInfo.struct) {
        box.setData(new Uint8Array(0));
        for (let i = 0, len = boxInfo.struct.length; i < len; i++) {
          const name = boxInfo.struct[i][0];
          const type = boxInfo.struct[i][1];
          box[name] = initialData && initialData[name] || (type instanceof Array ? [] : type === "text" ? "" : 0);
        }
      } else {
        box.setDataAndSync(initialData);
      }
      return box;
    }
    return null;
  }
  static get ignore() {
    return {type:1, container:1, data:1, buffer:1, offset:1, id:1, parent:1, children:1, wholeSize:1, boxInfo:1, property:1};
  }
}
class SimpleView {
  constructor(data) {
    this.ptr = 0;
    this.data = data;
  }
  read8() {
    return this.data[this.ptr++];
  }
  read16() {
    return this.data[this.ptr++] << 8 | this.data[this.ptr++];
  }
  read24() {
    return this.data[this.ptr++] << 16 | this.data[this.ptr++] << 8 | this.data[this.ptr++];
  }
  read32() {
    return this.data[this.ptr++] << 24 | this.data[this.ptr++] << 16 | this.data[this.ptr++] << 8 | this.data[this.ptr++];
  }
  read64() {
    return this.read32() * 4294967296 + this.read32();
  }
  readText(length) {
    let result = "";
    for (let i = 0; i < length; i++) {
      const d = this.data[this.ptr++];
      result += String.fromCharCode(d);
    }
    return result;
  }
  readTextAsNullTermination() {
    const length = this.data.length;
    let result = "";
    while (this.ptr < length) {
      const d = this.data[this.ptr++];
      if (d === 0) {
        break;
      }
      result += String.fromCharCode(d);
    }
    return result;
  }
  readUint8Array(dest, offset, length) {
    for (let i = 0; i < length; i++) {
      dest[offset++] = this.data[this.ptr++];
    }
  }
  write8(value) {
    this.data[this.ptr++] = value & 255;
    return this;
  }
  write16(value) {
    this.data[this.ptr++] = value >> 8 & 255;
    this.data[this.ptr++] = value & 255;
    return this;
  }
  write24(value) {
    this.data[this.ptr++] = value >> 16 & 255;
    this.data[this.ptr++] = value >> 8 & 255;
    this.data[this.ptr++] = value & 255;
    return this;
  }
  write32(value) {
    this.data[this.ptr++] = value >> 24 & 255;
    this.data[this.ptr++] = value >> 16 & 255;
    this.data[this.ptr++] = value >> 8 & 255;
    this.data[this.ptr++] = value & 255;
    return this;
  }
  write64(value) {
    this.write32(Math.floor(value / 4294967296));
    this.write32(Math.floor(value % 4294967296));
    return this;
  }
  writeText(text, length) {
    length = length || text.length;
    for (let i = 0, len = length; i < len; i++) {
      this.data[this.ptr++] = text.charCodeAt(i);
    }
    return this;
  }
  writeTextAsNullTermination(text) {
    this.writeText(text);
    this.data[this.ptr++] = 0;
    return this;
  }
  writeUint8Array(src, offset, length) {
    if (length < 512) {
      for (let i = 0; i < length; i++) {
        this.data[this.ptr++] = src[offset++];
      }
    } else {
      this.data.set(src.subarray(offset, offset + length), this.ptr);
      this.ptr += length;
    }
    return this;
  }
  fill(length, v) {
    v = v || 0;
    for (let i = 0; i < length; i++) {
      this.data[this.ptr++] = v;
    }
    return this;
  }
  getPos() {
    return this.ptr;
  }
  setPos(p) {
    this.ptr = p;
    return this;
  }
  skip(length) {
    this.ptr += length;
    return this;
  }
  ready() {
    return this.ptr < this.data.length;
  }
  copy(length) {
    const view = this.data.subarray(this.ptr, this.ptr + length);
    this.ptr += length;
    return this.ptr < 0 ? new Uint8Array(view) : view;
  }
  toUint8Array() {
    return this.data;
  }
  analyze(hasParent) {
    let result = null;
    let savePtr = this.ptr;
    let size, type;
    const isTypeText = text => {
      return text.match(/^[a-zA-Z0-9\u00a9]{4}$/) ? true : false;
    };
    if (!hasParent) {
      size = this.data.length + 8;
      type = "isom";
      savePtr -= 8;
    } else {
      size = this.read32();
      type = this.readText(4);
      if (type === "mdat" && size === 1) {
        size = this.read32() << 32 | this.read32();
      }
    }
    const limit = savePtr + size;
    if (limit <= this.data.length && isTypeText(type)) {
      result = {size:size - (!hasParent ? 8 : 0), type:type, container:false, children:0};
      let totalSize = 8;
      while (totalSize < size) {
        let childSize = this.read32();
        const childType = this.readText(4);
        if (childType === "mdat" && childSize === 1) {
          childSize = this.read32() << 32 | this.read32();
          this.skip(-8);
        }
        if (!isTypeText(childType)) {
          break;
        }
        if (childSize < 8) {
          break;
        }
        this.skip(childSize - 8);
        totalSize += childSize;
        result.children++;
      }
      if (size === totalSize) {
        result.container = true;
      }
    }
    this.ptr = savePtr;
    return result;
  }
}
class MP4 {
  constructor(data) {
    if (!data) {
      this.data = new Uint8Array(0);
    } else {
      if (typeof Buffer !== "undefined" && data instanceof Buffer) {
        this.data = new Uint8Array(data);
      } else {
        if (data instanceof Uint8Array === false) {
          throw new Error("Usage : new MP4( Uint8Array ) or new MP4( Buffer )");
        }
      }
    }
    this.data = data;
    this.rootBox = null;
    if (this.data) {
      this.parse();
    } else {
      this.root = new Box("isom");
    }
  }
  parse() {
    const buffer = new SimpleView(this.data);
    const next = parent => {
      const boxInfo = buffer.analyze(parent);
      if (boxInfo) {
        const box = new Box(boxInfo, parent, buffer.getPos());
        if (!this.root) {
          this.root = box;
        }
        if (boxInfo.container) {
          box.setData(buffer.copy(8), boxInfo.size);
          for (let i = 0, len = boxInfo.children; i < len; i++) {
            next(box);
          }
        } else {
          box.setDataAndSync(buffer.copy(boxInfo.size));
        }
      }
    };
    next(null);
  }
  get root() {
    return this.rootBox;
  }
  set root(box) {
    this.rootBox = box;
  }
  size() {
    if (!this.root) {
      return 0;
    }
    const sum = box => {
      let i, len = box.children.length, size = box.size();
      for (i = 0; i < len; i++) {
        size += sum(box.children[i]);
      }
      return size;
    };
    return sum(this.root);
  }
  tree(outFunc, verbose) {
    if (!this.root) {
      return (outFunc || console.log)("no box found");
    }
    const spacer = "                                  ";
    const _tree = (box, depth) => {
      const offset = (box.offset + spacer).substr(0, 10);
      let tmp = offset + "| " + spacer.substr(0, depth * 2) + "+" + box.type + " / " + box.size() + (box.container ? " ( total " + box.wholeSize + " ) " : "") + (box.id ? " , ID:" + box.id : "");
      (outFunc || console.log)(tmp);
      if (verbose) {
        for (const k in box) {
          if (typeof box[k] !== "function" && !(box[k] instanceof Box) && !Box.ignore[k]) {
            let value = box[k];
            if (box[k] instanceof Array) {
              if (box[k][0] instanceof Box) {
                continue;
              }
              value = JSON.stringify(box[k].slice(0, 10));
              if (box[k].length > 10) {
                value += " ...";
              }
            }
            tmp = "          | " + spacer.substr(0, depth * 2) + "  > " + k + " : " + value;
            (outFunc || console.log)(tmp);
          }
        }
      }
      for (let i = 0, len = box.children.length; i < len; i++) {
        _tree(box.children[i], depth + 1);
      }
    };
    _tree(this.root, 0);
  }
  publish(progressCallback, callback) {
    if (!this.root) {
      throw new Error("no rootbox found");
    }
    const totalSize = this.size();
    const outBuffer = new SimpleView(new Uint8Array(totalSize));
    const _publish = (box, _cb) => {
      let i = 0, len = box.children.length;
      box.publish(outBuffer, ptr => {
        progressCallback(Math.floor(100 * ptr / totalSize));
      }, e => {
        const next = ci => {
          if (ci < len) {
            _publish(box.children[ci], e => {
              next(ci + 1);
            });
          } else {
            _cb(null);
          }
        };
        next(0);
      });
    };
    _publish(this.root, e => {
      callback(e, outBuffer.data);
    });
  }
  async publishAsync() {
    return new Promise((resolve, reject) => {
      if (!this.root) {
        return reject("no rootbox found");
      }
      const totalSize = this.size();
      const outBuffer = new SimpleView(new Uint8Array(totalSize));
      const _publish = (box, _cb) => {
        let i = 0, len = box.children.length;
        box.publish(outBuffer, null, () => {
          const next = ci => {
            if (ci < len) {
              _publish(box.children[ci], () => {
                next(ci + 1);
              });
            } else {
              _cb();
            }
          };
          next(0);
        });
      };
      _publish(this.root, () => {
        resolve(outBuffer.data);
      });
    });
  }
  static get Box() {
    return Box;
  }
}
const _buildMP4 = async(data, flags, video) => {
  const tabId = video?._master?._tab?.id;
  if (_LOG_) {
    console.log(...logGen(tabId, "MP4", "start building"));
  }
  if (!data || data.length === 0) {
    throw new Error("buildMP4 : Video contains no media");
  }
  let primaryTrackNum = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].mimetype.includes("video")) {
      primaryTrackNum = i;
    }
  }
  if (data.length === 2 && primaryTrackNum === 1) {
    data = [data[1], data[0]];
    primaryTrackNum = 0;
  }
  const {skipLiveKeyFrame, keyFrameComplement, modifyESDSTrackConfig, over4G, over13H} = flags;
  const mdatOrder = [];
  for (let track = 0, tlen = data.length; track < tlen; track++) {
    const d = data[track];
    let order = 0;
    for (let num = 0, len = d.mdats.length; num < len; num++) {
      if (d.start[num] !== undefined) {
        mdatOrder.push({track, num, order, start:d.start[num]});
        order++;
      }
    }
  }
  mdatOrder.sort((a, b) => a.start - b.start);
  for (const d of data) {
    if (d.mdats[0] && d.mdats[0].size === 9) {
      d.mdats = [];
    }
  }
  const mp4s = [];
  const mp4boxes = [];
  for (const d of data) {
    const mp4 = d.init && d.init.data && d.init.data.length < 20000 ? new MP4(d.init.data.slice()) : d.init;
    mp4s.push(mp4);
    mp4boxes.push(mp4.root);
  }
  const trackLength = mp4s.length;
  for (let i = 0, len = mp4boxes.length; i < len; i++) {
    const root = mp4boxes[i];
    root.moov.mvhd.version = root.moov.trak.tkhd.version = root.moov.trak.mdia.mdhd.version = 0;
    root.moov.trak.tkhd.flags = 3;
    const trackId = i + 1;
    root.moov.trak.tkhd.trackID = root.moov.mvex.trex.trackID = trackId;
    if (root.ftyp) {
      root.ftyp.majorBrand = "mp42";
      root.ftyp.minorVersion = 0;
      root.ftyp.compatibleBrands = ["isom", "iso2", "avc1", "mp41", "mp42"];
    }
    if (modifyESDSTrackConfig) {
      const stsd = root.moov.trak.mdia.minf.stbl.stsd;
      const view = new SimpleView(stsd.data);
      view.skip(12);
      const entryCount = view.read32();
      for (let i = 0; i < entryCount; i++) {
        const size = view.read32();
        const code = view.readText(4);
        if (code === "mp4a") {
          view.skip(28);
          const esdsPtr = view.getPos();
          const size = view.read32();
          const code = view.readText(4);
          if (code === "esds") {
            view.skip(5);
            const len01 = view.read8();
            view.skip(4);
            const len02 = view.read8();
            view.skip(14);
            const trackConfigLength = view.read8();
            if (trackConfigLength === 4) {
              const c0 = view.read8();
              const c1 = view.read8();
              view.skip(2);
              const remains = [];
              for (let n = 0, len = size - 38; n < len; n++) {
                remains.push(view.read8());
              }
              view.setPos(esdsPtr);
              view.write32(size);
              view.skip(9);
              view.write8(len01 - 2);
              view.skip(4);
              view.write8(len02 - 2);
              view.skip(14);
              view.write8(trackConfigLength - 2);
              view.write8((c0 & 7) + 16);
              view.write8(c1 & 248);
              for (const d of remains) {
                view.write8(d);
              }
              view.write16(0);
            }
          } else {
            view.skip(size - 8);
          }
        } else {
          view.skip(size - 8);
        }
      }
    }
  }
  const o = new MP4;
  const out = o.root;
  out.append(mp4boxes[primaryTrackNum].ftyp);
  out.append(new MP4.Box("moov"));
  out.moov.append(mp4boxes[primaryTrackNum].moov.mvhd);
  for (const root of mp4boxes) {
    out.moov.append(root.moov.trak);
  }
  out.moov.mvhd.nextTrackID = mp4s.length + 1;
  const creationTime = 0;
  out.moov.mvhd.creationTime = out.moov.mvhd.modificationTime = creationTime;
  for (let i = 0, len = mp4s.length; i < len; i++) {
    out.moov.traks[i].tkhd.creationTime = out.moov.traks[i].mdia.mdhd.creationTime = out.moov.traks[i].tkhd.modificationTime = out.moov.traks[i].mdia.mdhd.modificationTime = creationTime;
  }
  const getAllTrackStatus = async(tracks, data) => {
    const UINT32_MAX = 4294967295;
    const INT32_MIN = -2147483648;
    const tStats = [{type:"vide", length:0, moofs:[], hasBaseMediaDecodeTime:false}, {type:"soun", length:0, moofs:[], hasBaseMediaDecodeTime:false}];
    for (const tstat of tStats) {
      for (const trak of tracks) {
        if (trak.mdia.hdlr.handlerType === tstat.type) {
          Object.assign(tstat, {trackID:trak.tkhd.trackID, timeScale:trak.mdia.mdhd.timeScale, length:data[trak.tkhd.trackID - 1].moofs.length, });
        }
      }
    }
    const len = Math.max(tStats[0].length, tStats[1].length);
    for (let n = 0; n < len; n++) {
      for (let i = 0; i < 2; i++) {
        const tstat = tStats[i];
        const moofBlob = data[tstat.trackID - 1]?.moofs[n];
        if (!moofBlob) {
          tstat.moofs[n] = {empty:true, baseMediaDecodeTime:0, duration:0};
          continue;
        }
        const moofMP4 = moofBlob instanceof MP4 ? moofBlob : moofBlob instanceof Box ? {root:{moof:moofBlob}} : new MP4(new Uint8Array(await readBlob(moofBlob)));
        const traf = moofMP4.root.moof.traf;
        let baseMediaDecodeTime = traf.tfdt.baseMediaDecodeTime < INT32_MIN ? 0 : traf.tfdt.baseMediaDecodeTime;
        const lowerBMDT = baseMediaDecodeTime & 4294967295;
        baseMediaDecodeTime += lowerBMDT < 0 ? UINT32_MAX + 1 : 0;
        baseMediaDecodeTime /= tstat.timeScale;
        if (baseMediaDecodeTime < 0) {
          console.error("baseMediaDecodeTime : unexpected value", baseMediaDecodeTime);
        }
        let discontig = false;
        if (n > 0) {
          if (tstat.moofs[n - 1].empty) {
            discontig = true;
          } else {
            const {baseMediaDecodeTime:prevBMDT, duration:prevDuration} = tstat.moofs[n - 1];
            if (baseMediaDecodeTime < prevBMDT || baseMediaDecodeTime > prevBMDT + prevDuration * 2) {
              discontig = true;
            }
          }
        }
        let duration = 0;
        let keyFrames = 0;
        for (const trun of traf.truns) {
          const samples = trun.samples || [];
          for (const sample of samples) {
            duration += sample.duration || traf.tfhd?.defaultSampleDuration || mp4boxes[i].moov?.mvex?.trex?.sampleDuration || 0;
            if (sample.flags & 33554432) {
              keyFrames++;
            }
          }
        }
        duration /= tstat.timeScale;
        const compositionTimeOffset = (traf.trun?.samples?.[0].compositionTimeOffset || 0) / tstat.timeScale;
        tstat.moofs[n] = {baseMediaDecodeTime, compositionTimeOffset, duration, keyFrames, discontig};
        if (baseMediaDecodeTime > 0) {
          tstat.hasBaseMediaDecodeTime = true;
        }
      }
    }
    return tStats;
  };
  const buildElst = tStats => {
    const elst = [[], []];
    if (tStats[0].length > 1 && !tStats[0].hasBaseMediaDecodeTime || tStats[1].length > 1 && !tStats[1].hasBaseMediaDecodeTime) {
      return elst;
    }
    const offset = [0, 0];
    const endTime = [0, 0];
    tStats[0].elstPadding = tStats[1].elstPadding = 0;
    for (let n = 0, len = Math.max(tStats[0].length, tStats[1].length); n < len; n++) {
      const v = tStats[0].moofs[n];
      const a = tStats[1].moofs[n];
      if (!v || !a) {
        continue;
      }
      if (v.empty) {
        v.baseMediaDecodeTime = endTime[0] - offset[0];
        v.duration = 0;
        if (tStats[0].moofs[n + 1] && !tStats[0].moofs[n + 1].empty) {
          tStats[0].moofs[n + 1].discontig = true;
        }
      }
      if (a.empty) {
        a.baseMediaDecodeTime = endTime[1] - offset[1];
        a.duration = 0;
        if (tStats[1].moofs[n + 1] && !tStats[1].moofs[n + 1].empty) {
          tStats[1].moofs[n + 1].discontig = true;
        }
      }
      if (n === 0) {
        const diff = v.baseMediaDecodeTime - a.baseMediaDecodeTime;
        const target = diff > 0 ? 0 : 1;
        const abs_diff = Math.abs(diff);
        if (_LOG_) {
          console.log(...logGen(tabId, "MP4", "buildElst, start : diff=" + diff + " (video=" + v.baseMediaDecodeTime + ",audio=" + a.baseMediaDecodeTime + ")"));
        }
        if (abs_diff > 0.01) {
          const mediaTime = tStats[target].moofs?.[0]?.compositionTimeOffset || 0;
          elst[target].push({segmentDuration:Math.floor((abs_diff + mediaTime) * 1000), mediaTime:-1, mediaRateInteger:1, mediaRateFraction:0});
        }
        tStats[target].elstPadding = abs_diff;
        offset[0] = offset[1] = -Math.min(a.baseMediaDecodeTime, v.baseMediaDecodeTime);
      } else {
        if (v.discontig && a.discontig) {
          const diff = v.baseMediaDecodeTime - a.baseMediaDecodeTime - (endTime[0] - endTime[1]);
          if (diff >= 0) {
            offset[0] = endTime[0] + diff - v.baseMediaDecodeTime;
            offset[1] = endTime[1] - a.baseMediaDecodeTime;
          } else {
            offset[0] = endTime[0] - v.baseMediaDecodeTime;
            offset[1] = endTime[1] - diff - a.baseMediaDecodeTime;
          }
        } else {
          if (v.discontig) {
            offset[0] = endTime[0] - v.baseMediaDecodeTime;
          } else {
            if (a.discontig) {
              offset[1] = endTime[1] - a.baseMediaDecodeTime;
            }
          }
        }
      }
      v.baseMediaDecodeTime += offset[0];
      a.baseMediaDecodeTime += offset[1];
      endTime[0] = v.baseMediaDecodeTime + v.duration;
      endTime[1] = a.baseMediaDecodeTime + a.duration;
    }
    for (let i = 0; i < 2; i++) {
      const s = tStats[i];
      const segmentDuration = Math.floor((endTime[i] - s.elstPadding) * 1000) || 123456789;
      const raw_mediaTime = s.moofs?.[0]?.compositionTimeOffset || 0;
      const mediaTime = Math.floor(raw_mediaTime * s.timeScale) || 0;
      elst[i].push({segmentDuration, mediaTime, mediaRateInteger:1, mediaRateFraction:0});
    }
    return elst;
  };
  const calcDebt2 = loop => {
    const delta = [{}, {}];
    if (loop[0].length > 1 && !loop[0].hasBaseMediaDecodeTime || loop[1].length > 1 && !loop[1].hasBaseMediaDecodeTime) {
      return delta;
    }
    let contig = [0, 0];
    let ignoreResult = false;
    loop[0].duration = loop[1].duration = 0;
    loop[0].original_duration = loop[1].original_duration = 0;
    const C_THRESHOLD = 2;
    const T_THRESHOLD = 0.25;
    const len = Math.max(loop[0].length, loop[1].length);
    for (let n = 0; n < len; n++) {
      for (let i = 0; i < 2; i++) {
        if (loop[i].moofs[n].empty) {
          continue;
        }
        const mediaTime = 0;
        if (n < len - C_THRESHOLD - 1) {
          const diff = loop[i].duration - (loop[i].moofs[n].baseMediaDecodeTime - loop[i].elstPadding + mediaTime);
          if (diff < -.05) {
            contig[i]++;
            if (contig[i] >= C_THRESHOLD) {
              delta[i][n + 1] = Math.floor(diff * loop[i].timeScale);
              loop[i].duration -= diff;
              contig[i] = 0;
            }
          } else {
            contig[i] = 0;
          }
        }
        loop[i].original_duration += loop[i].moofs[n].duration;
        loop[i].duration += loop[i].moofs[n].duration;
      }
      if (n === len - C_THRESHOLD - 2) {
        const originalDiff = loop[0].original_duration - loop[1].original_duration;
        if (Math.abs(originalDiff) < 0.1) {
          ignoreResult = true;
          if (_LOG_) {
            console.log(...logGen(tabId, "MP4", "durationDebtList : " + JSON.stringify(delta)));
            console.log(...logGen(tabId, "MP4", "ignore debt due to less difference between video and audio duration, abs(" + originalDiff + ")sec < 0.1sec )"));
          }
        }
      }
    }
    if (_LOG_) {
      for (let i = 0; i < 2; i++) {
        loop[i].sec = loop[i].duration / loop[i].timeScale;
      }
      if (!ignoreResult) {
        console.log(...logGen(tabId, "MP4", "durationDebtList : " + JSON.stringify(delta)));
      }
    }
    return ignoreResult ? [{}, {}] : delta;
  };
  const allTrackStatus = await getAllTrackStatus(out.moov.traks, data);
  const elst = buildElst(allTrackStatus);
  let durationDebtList2 = [{}, {}];
  try {
    if (localStorage.nosync) {
      if (_LOG_) {
        console.log(...logGen(tabId, "MP4", "ignore durationDebt due to set the localStorage.nosync=true."));
      }
    } else {
      durationDebtList2 = await calcDebt2(allTrackStatus, tabId);
    }
  } catch (e) {
    console.log(e.stack || e.message || e);
  }
  if (_LOG_) {
    console.log("neo-debt-v", JSON.stringify(durationDebtList2[0]));
    console.log("neo-debt-a", JSON.stringify(durationDebtList2[1]));
    let sum = 0;
    sum = 0;
    for (const k in durationDebtList2[0]) {
      sum += durationDebtList2[0][k];
    }
    console.log("neo-debt-v", sum);
    sum = 0;
    for (const k in durationDebtList2[1]) {
      sum += durationDebtList2[1][k];
    }
    console.log("neo-debt-a", sum);
  }
  let maxTrackDuration = 0;
  for (const trak of out.moov.traks) {
    const stbl = trak.mdia.minf.stbl;
    const trackID = trak.tkhd.trackID;
    const type = trak.mdia.hdlr.handlerType;
    if (type === "soun") {
      trak.tkhd.alternateGroup = 1;
      trak.tkhd.volume = 256;
    }
    let {stsz, stts, stsc, stss, stco, ctts, sdtp, co64} = stbl;
    if (!stsz) {
      stbl.append(stsz = MP4.Box.create("stsz"));
    }
    if (!stts) {
      stbl.append(stts = MP4.Box.create("stts"));
    }
    if (!stsc) {
      stbl.append(stsc = MP4.Box.create("stsc"));
    }
    if (!stss) {
      stbl.append(stss = MP4.Box.create("stss"));
    }
    if (!sdtp) {
      sdtp = MP4.Box.create("sdtp");
    }
    if (!ctts) {
      ctts = MP4.Box.create("ctts");
    }
    if (over4G) {
      if (!co64) {
        stbl.append(co64 = MP4.Box.create("co64"));
      }
      if (stco) {
        stbl.remove(stco);
        stco = null;
      }
    } else {
      if (!stco) {
        stbl.append(stco = MP4.Box.create("stco"));
      }
      if (co64) {
        stbl.remove(co64);
        co64 = null;
      }
    }
    stsz.sampleSizes = [];
    stts.entries = [];
    stsc.entries = [];
    stss.syncSamples = [];
    sdtp.sampleDependencies = [];
    ctts.entries = [];
    let currentSampleIdx = 0;
    let chunkCount = 0;
    let samplesPerChunk = 0;
    let curSampleDuration = 0;
    let sameDurationCount = 0;
    let curCompositionTimeOffset = -1;
    let sameCompositionTimeOffsetCount = 0;
    let durationDebt = 0;
    const kfc = [];
    let totalDuration = 0;
    for (const moofBlob of data[trackID - 1].moofs) {
      if (!moofBlob) {
        continue;
      }
      const moofMP4 = moofBlob instanceof MP4 ? moofBlob : moofBlob instanceof Box ? {root:{moof:moofBlob}} : new MP4(new Uint8Array(await readBlob(moofBlob)));
      const moof = moofMP4.root.moof;
      if (moofMP4.root.mdat) {
        data[trackID - 1].mdats.push(new Blob([moofMP4.root.mdat.data]));
      }
      const traf = moof.traf;
      const tfhd = traf.tfhd;
      const trex = mp4boxes[trackID - 1].moov.mvex && mp4boxes[trackID - 1].moov.mvex.trex;
      chunkCount++;
      let sampleCountPerChunk = 0;
      let trunSampleIdx = 0;
      durationDebt += durationDebtList2[trackID - 1][chunkCount] || 0;
      for (const trun of traf.truns) {
        if (trun.sampleCount === 1) {
          if (!trun.samples) {
            trun.samples = [{}];
          }
        }
        for (const __sample of trun.samples) {
          const sample = Object.assign({}, __sample);
          currentSampleIdx++;
          sample.duration = sample.duration || tfhd && tfhd.defaultSampleDuration || trex && trex.sampleDuration || 0;
          sample.size = sample.size || tfhd && tfhd.defaultSampleSize || trex && trex.sampleSize || 0;
          sample.flags = sample.flags || tfhd && tfhd.defaultSampleFlags || trex && trex.sampleFlags || 0;
          durationDebt = Math.floor(durationDebt);
          if (durationDebt !== 0) {
            if (type === "vide") {
              const payment = durationDebt > 0 ? Math.min(sample.duration - 1, durationDebt) : durationDebt;
              sample.duration -= payment;
              durationDebt -= payment;
            } else {
              if (type === "soun") {
                if (durationDebt < 0) {
                  if (sample.duration < -durationDebt) {
                    sampleCountPerChunk++;
                    sameDurationCount++;
                    totalDuration += sample.duration;
                    stsz.sampleSizes.push(0);
                    durationDebt += sample.duration;
                  }
                }
              }
            }
          }
          if (keyFrameComplement && trunSampleIdx === 0) {
            kfc.push(currentSampleIdx);
          }
          trunSampleIdx++;
          if ((sample.flags & 33554432) > 0) {
            if (false) {
            } else {
              if (type === "soun") {
              } else {
                stss.syncSamples.push(currentSampleIdx);
              }
            }
          }
          stsz.sampleSizes.push(sample.size);
          if (curSampleDuration !== sample.duration) {
            if (sameDurationCount > 0) {
              stts.entries.push({sampleCount:sameDurationCount, sampleDuration:curSampleDuration});
              sameDurationCount = 0;
            }
            curSampleDuration = sample.duration;
          }
          sameDurationCount++;
          totalDuration += sample.duration;
          if ((trun.flags & 2048) > 0) {
            if (curCompositionTimeOffset !== sample.compositionTimeOffset) {
              if (sameCompositionTimeOffsetCount > 0) {
                ctts.entries.push({sampleCount:sameCompositionTimeOffsetCount, sampleOffset:curCompositionTimeOffset});
                sameCompositionTimeOffsetCount = 0;
              }
            }
            curCompositionTimeOffset = sample.compositionTimeOffset;
            sameCompositionTimeOffsetCount++;
          }
        }
        sampleCountPerChunk += trun.sampleCount;
        if (traf.sdtp) {
          sdtp.sampleDependencies.push(...traf.sdtp.sampleDependencies);
        }
      }
      if (samplesPerChunk !== sampleCountPerChunk) {
        samplesPerChunk = sampleCountPerChunk;
        stsc.entries.push({firstChunk:chunkCount, samplesPerChunk, sampleDescriptionIndex:1});
      }
      if (chunkCount % 100 === 0) {
        await sleep(1);
      }
    }
    stts.entries.push({sampleCount:sameDurationCount, sampleDuration:curSampleDuration});
    if (curCompositionTimeOffset !== -1) {
      ctts.entries.push({sampleCount:sameCompositionTimeOffsetCount, sampleOffset:curCompositionTimeOffset});
    }
    const findKeyFrames = () => {
      const result = [];
      let total = 0;
      for (const size of stsz.sampleSizes) {
        total += size;
      }
      const avg = total / stsz.sampleSizes.length;
      total = 0;
      for (const size of stsz.sampleSizes) {
        const d = size - avg;
        total += d * d;
      }
      const sigma = Math.sqrt(total / stsz.sampleSizes.length);
      for (let i = 0, len = stsz.sampleSizes.length; i < len; i++) {
        const size = stsz.sampleSizes[i];
        const score = (size - avg) / sigma;
        if (score > 3.0) {
          result.push(i + 1);
        }
      }
      return result;
    };
    if (type === "vide") {
      if (_LOG_) {
        console.log(...logGen(tabId, "MP4", "keyframe length : " + stss.syncSamples.length + ", chunks : " + chunkCount));
      }
      if (stss.syncSamples.length < 1 + Math.floor(chunkCount * 0.8)) {
        const keyframeCandidates = findKeyFrames();
        if (_LOG_) {
          console.log(...logGen(tabId, "MP4", "length of estimated keyframes : " + keyframeCandidates.length));
        }
        if (keyframeCandidates.length > stss.syncSamples.length) {
          stss.syncSamples = keyframeCandidates;
          if (_LOG_) {
            console.log(...logGen(tabId, "MP4", "use estimated keyframes"));
          }
        } else {
          if (keyFrameComplement && kfc.length > stss.syncSamples.length) {
            stss.syncSamples = kfc;
            if (_LOG_) {
              console.log(...logGen(tabId, "MP4", "use the firstframe of chunks as keyframes"));
            }
          }
        }
        if (stss.syncSamples.length === 0) {
          stss.syncSamples = [1];
          if (_LOG_) {
            console.log(...logGen(tabId, "MP4", "no keyframes, set stss.syncSamples=[1]"));
          }
        }
      }
    }
    stsz.sampleCount = stsz.sampleSizes.length;
    stts.entryCount = stts.entries.length;
    stsc.entryCount = stsc.entries.length;
    stss.entryCount = stss.syncSamples.length;
    if (over4G) {
      co64.entryCount = chunkCount;
      co64.chunkOffsets = new Array(chunkCount);
    } else {
      stco.entryCount = chunkCount;
      stco.chunkOffsets = new Array(chunkCount);
    }
    if (ctts.entries.length) {
      ctts.entryCount = ctts.entries.length;
      if (type !== "soun") {
        stbl.append(ctts);
      }
    }
    trak.mdia.mdhd.duration = totalDuration;
    trak.tkhd.duration = Math.floor(totalDuration / trak.mdia.mdhd.timeScale * 1000);
    if (!trak.edts) {
      trak.append(new MP4.Box("edts"));
    }
    if (!trak.edts.elst) {
      trak.edts.append(MP4.Box.create("elst"));
    }
    const mediaTime = ctts.entryCount > 0 ? ctts.entries[0].sampleOffset : 0;
    const cur_elst = elst[trackID - 1] || [];
    if (_LOG_) {
      console.log("reference", JSON.stringify([{segmentDuration:trak.tkhd.duration, mediaTime, mediaRateInteger:1, mediaRateFraction:0}]));
      console.log("neo      ", JSON.stringify(cur_elst));
    }
    if (cur_elst.length > 0) {
      trak.edts.elst.entryCount = cur_elst.length;
      trak.edts.elst.entries = cur_elst;
      if (_LOG_) {
        console.log("use neo elst !!");
      }
    } else {
      trak.edts.elst.entryCount = 1;
      trak.edts.elst.entries = [{segmentDuration:trak.tkhd.duration, mediaTime, mediaRateInteger:1, mediaRateFraction:0}];
      if (_LOG_) {
        console.log("use reference elst");
      }
    }
    if (sdtp.sampleDependencies.length) {
      stbl.append(sdtp);
    }
    trak.mdia.mdhd.duration = totalDuration;
    maxTrackDuration = Math.max(totalDuration / trak.mdia.mdhd.timeScale, maxTrackDuration);
  }
  const timeScale = 1000;
  const duration = Math.floor(maxTrackDuration * timeScale);
  out.moov.mvhd.timeScale = timeScale;
  out.moov.mvhd.duration = duration;
  out.arrange();
  let mdatOffset = o.size();
  for (const order of mdatOrder) {
    if (over4G) {
      out.moov.traks[order.track].mdia.minf.stbl.co64.chunkOffsets[order.order] = mdatOffset + 8;
    } else {
      out.moov.traks[order.track].mdia.minf.stbl.stco.chunkOffsets[order.order] = mdatOffset + 8;
    }
    mdatOffset += data[order.track].mdats[order.num].size;
  }
  const blobs = [new Blob([await o.publishAsync()])];
  for (const order of mdatOrder) {
    blobs.push(data[order.track].mdats[order.num]);
  }
  const file = new Blob(blobs, {type:"appplication/octet-stream"});
  if (_LOG_) {
    console.log(...logGen(tabId, "MP4", "complete building"));
  }
  return file;
};
const createMP3InitSegment = mp3header => {
  const {sampleRate, channelCount} = mp3header;
  const init = new MP4;
  const init_root = init.root;
  init_root.append(new MP4.Box("moov"));
  const mvhd = MP4.Box.create("mvhd", null, {timeScale:sampleRate, duration:0, rate:65536, volume:256, matrix:[65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824], preDefined:24, nextTrackID:0});
  init_root.moov.append(mvhd);
  init_root.moov.append(new MP4.Box("trak"));
  const trak = init_root.moov.trak;
  const tkhd = MP4.Box.create("tkhd", null, {flags:3, trackID:1, duration:0, layer:0, alternateGroup:1, volume:256, matrix:[65536, 0, 0, 0, 65536, 0, 0, 0, 1073741824]});
  trak.append(tkhd);
  trak.append(new MP4.Box("mdia"));
  const mdhd = MP4.Box.create("mdhd", null, {timeScale:sampleRate, duration:5120, languageValues:21956});
  trak.mdia.append(mdhd);
  const hdlr = MP4.Box.create("hdlr", null, {handlerType:"soun", name:"SoundHandler"});
  trak.mdia.append(hdlr);
  trak.mdia.append(new MP4.Box("minf"));
  trak.mdia.minf.append(MP4.Box.create("smhd"));
  trak.mdia.minf.append(new MP4.Box("dinf"));
  trak.mdia.minf.dinf.append(MP4.Box.create("dref", null, {entryCount:1, entrySize:12, typeText:"url ", entryVersion:0, entryFlags:1}));
  trak.mdia.minf.append(new MP4.Box("stbl"));
  const stsd = MP4.Box.create("stsd", [["version", "int", 1], ["flags", "int", 3], ["entryCount", "int", 4], ["entrySize", "int", 4], ["code", "text", 4], ["reserved", "int", 3], ["reserved2", "int", 3], ["dataReferenceIndex", "int", 2], ["reserved3", "int", 8], ["channelCount", "int", 2], ["sampleSize", "int", 2], ["reserved4", "int", 4], ["sampleRate", "int", 2], ["reserved5", "int", 2]], {entryCount:1, entrySize:36, code:".mp3", dataReferenceIndex:1, channelCount, sampleSize:16, sampleRate});
  trak.mdia.minf.stbl.append(stsd);
  init_root.moov.append(new MP4.Box("mvex"));
  init_root.moov.mvex.append(MP4.Box.create("trex", null, {sampleDescriptionIndex:1, sampleFlags:65537}));
  init.id = `audio/mp3:${init_root.moov.trak.mdia.mdhd.timeScale}`;
  init_root.arrange();
  return init;
};
const createMP3Moof = data2 => {
  const samples = [];
  const mdatLen = data2.length;
  for (let offset = 0; offset < mdatLen;) {
    const mp3header = MpegAudio.parseHeader(data2, offset);
    if (!mp3header) {
      break;
    }
    const size = mp3header.frameLength;
    samples.push({duration:mp3header.samplesPerFrame, size});
    offset += size;
  }
  const moof = new MP4;
  moof.root.append(new MP4.Box("moof"));
  moof.root.moof.append(new MP4.Box("traf"));
  moof.root.moof.traf.append(MP4.Box.create("tfhd", [["version", "int", 1], ["flags", "int", 3], ["trackID", "int", 4], ["defaultSampleFlags", "int", 4, "if", 32]], {flags:32, defaultSampleFlags:65536}));
  moof.root.moof.traf.append(MP4.Box.create("tfdt", null, {}));
  const trun = MP4.Box.create("trun", null, {flags:768, sampleCount:samples.length, samples});
  moof.root.moof.traf.append(trun);
  moof.root.arrange();
  const header = new Uint8Array(8);
  const mdl = mdatLen + 8;
  header.set([mdl >> 24 & 255, mdl >> 16 & 255, mdl >> 8 & 255, mdl & 255, 109, 100, 97, 116]);
  const mdat = new Blob([header, data2]);
  return {moof, mdat};
};
const isSameBox = (b1, b2) => {
  const l1 = b1.data.length;
  const l2 = b2.data.length;
  if (l1 !== l2) {
    return false;
  }
  for (let i = 0; i < l1; i++) {
    if (b1.data[i] !== b2.data[i]) {
      return false;
    }
  }
  return true;
};
const isSameMatrix = (m1, m2) => {
  const len = m1.length;
  if (len !== m2.length) {
    return false;
  }
  for (let i = 0; i < len; i++) {
    if (m1[i] !== m2[i]) {
      return false;
    }
  }
  return true;
};
const isSameInitSegment = (t1, t2) => {
  try {
    const tkhd_1 = t1.root.moov.trak.tkhd;
    const tkhd_2 = t2.root.moov.trak.tkhd;
    const tkhd = isSameMatrix(tkhd_1.matrix, tkhd_2.matrix) && tkhd_1.width === tkhd_2.width && tkhd_1.height === tkhd_2.height;
    const mdhd_1 = t1.root.moov.trak.mdia.mdhd;
    const mdhd_2 = t2.root.moov.trak.mdia.mdhd;
    const mdhd = mdhd_1.timeScale === mdhd_2.timeScale && mdhd_1.languageValues === mdhd_2.languageValues;
    const hdlr_1 = t1.root.moov.trak.mdia.hdlr;
    const hdlr_2 = t2.root.moov.trak.mdia.hdlr;
    const hdlr = hdlr_1.handlerType === hdlr_2.handlerType && hdlr_1.name === hdlr_2.name;
    return tkhd && mdhd && hdlr;
  } catch (e) {
    return true;
  }
};
"use strict";
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
const _ILOG_ = localStorage.ilog;
const CONTIG_THRESHOLD_SEC = 0.1;
const ilog = (mediasouceid, bufferid, evt, msg1 = "", msg2 = "") => {
  return ["%c" + mediasouceid + " -> %c" + bufferid + " [ %c" + evt + " ]", logColor(mediasouceid), logColor(bufferid), "color:#f60b91", msg1, msg2];
};
const intercept_onData = async(tab, params) => {
  const {url, mimetype, mediasourceid, bufferid, timestamp} = params;
  if (_ILOG_) {
    console.log(...logGen(tab?.id, "intercept_onData", "mediaSourceId=" + mediasourceid + ",bufferId=" + bufferid));
  }
  if (url === CMD_DISCONNECT) {
    if (_LOG_) {
      console.log(...logGen(tab?.id, "intercept_onData", "receive CMD_DISCONNECT"));
    }
    for (const master of tab.mastersList) {
      const video = master.video;
      if (video) {
        await video.flush();
        video.complete();
      }
    }
    tab.sendMessage(CMD_MESSAGE, {on:"title", message:i18n.getMessage("title_completed")});
    return;
  }
  if (tab.mastersList.length === 0) {
    if (_LOG_) {
      console.log(...logGen(tab?.id, "intercept_onData", "receive first data, sendback CMD_INTERCEPT_OK"));
    }
    WebExtensions.runtime.sendMessage({cmd:CMD_INTERCEPT_OK, params:{}});
  }
  if (mimetype.includes("webm")) {
    if (_ILOG_) {
      console.log("webm detect, ignore");
    }
    return;
  }
  let master = tab.findMaster(mediasourceid);
  if (!master) {
    if (_ILOG_) {
      console.log("    create new master " + mediasourceid);
    }
    master = new Master(tab, tab.url, null, null, null, mediasourceid);
    tab.mastersList.push(master);
  }
  let video = master.video;
  if (!video) {
    video = new CapturedVideo(master, mediasourceid);
  }
  let {tracks, index} = video;
  if (url === "abort") {
    if (_LOG_) {
      console.log(...logGen(tab?.id, "intercept_onData", "receive abort"));
    }
    await video.flush();
    video.complete();
    video._master._tab.sendMessage(CMD_MESSAGE, {on:"title", message:i18n.getMessage("title_completed")});
    return;
  }
  const blob = await loadExternalBlob(url);
  const array = await readBlob(blob);
  const wholeMP4 = new MP4(new Uint8Array(array));
  let size = 0;
  const mp4s = divideByTrack(wholeMP4);
  for (const mp4 of mp4s) {
    const trackId = bufferid + (mp4s.length === 1 ? "" : mp4s.indexOf(mp4));
    video = master.video;
    let duration = 0;
    const hasInitSegment = mp4.root.moovs;
    const hasMoof = mp4.root.moofs;
    const hasMdat = mp4.root.mdats || mp4.mdat;
    if (index[trackId] === undefined) {
      index[trackId] = tracks.length;
      tracks.push({init:null, moofs:[], mdats:[], start:[], durations:[], duration:0, contig:0, mimetype, quality:""});
    }
    const track = tracks[index[trackId]];
    const getMoofParams = n => {
      n = n || 0;
      const {moofDuration, moofStart} = getMoofDeltaAndDuration(track.init, mp4.root, n);
      const moof = mp4.root.moofs[n];
      const sequenceNumber = moofStart + Math.min(10000, moof.mfhd?.sequenceNumber || 0) / 100000000;
      track._prev = {sequenceNumber, moofStart, moofDuration};
      return {moof, sequenceNumber, moofStart, moofDuration};
    };
    if (_ILOG_) {
      const isVideo = mimetype.includes("video") || mimetype.includes("avc1");
      const isAudio = mimetype.includes("audio") || mimetype.includes("mp4a");
      const {moofDuration, moofStart} = getMoofDeltaAndDuration(track.init, mp4.root);
      const _media = track.init ? track.init.root.moov.trak.tkhd.width > 0 ? "video" : "audio" : "unknown";
      const mime = "[" + (isAudio ? "audio/" : "") + (isVideo ? "video" : "");
      const contain = (hasInitSegment ? "initSeg " : "") + (hasMoof ? "Moof " : "") + (hasMdat ? "Mdat" : "") + "]";
      const mediaType = [];
      if (isAudio) {
        mediaType.push("audio");
      }
      if (isVideo) {
        mediaType.push("video");
      }
      const contains = [];
      if (hasInitSegment) {
        contains.push("initSegment");
      }
      if (hasMoof) {
        contains.push("Moof");
      }
      if (hasMdat) {
        contains.push("Mdat");
      }
      const sequenceNumber = hasMoof ? mp4.root.moofs.map(m => m.mfhd.sequenceNumber).join(",") : "no-sequenceNumber";
      console.log(sequenceNumber + " -> ", "(" + mediaType.join(",") + ")", "(" + contains.join(",") + ")", "start:" + moofStart + ", duration:" + moofDuration + ", " + mp4s.indexOf(mp4) + "-" + _media);
    }
    if (hasInitSegment) {
      if (track.init && isCompleteTrack(tracks) && !isSameInitSegment(track.init, mp4)) {
        if (_ILOG_) {
          console.log("    ---+--- new init segment found , flushed");
        }
        const flushed = await video.flush();
        video.complete();
        video.clearTrack(track);
        video = new CapturedVideo(master, mediasourceid, video);
      }
      track.init = mp4;
      const trak = track.init.root.moov.trak;
      if (trak) {
        if (trak.tkhd.width) {
          track.quality = Math.floor(trak.tkhd.width / 65536 + 0.4) + " x " + Math.floor(trak.tkhd.height / 65536 + 0.4);
          track.mimetype = "video";
        } else {
          track.quality = trak.mdia.mdhd.timeScale + " Hz";
          track.mimetype = "audio";
        }
      }
      video.updateQualityLabel();
    }
    if (hasMoof) {
      if (mp4.root.moofs[0] && mp4.root.moofs[0].traf && mp4.root.moofs[0].traf.senc) {
        tab.sendMessage(CMD_MESSAGE, {vId:video.vId, on:"error", message:i18n.getMessage("drm_detected")});
        return;
      }
      const timeScale = getTrackTimeScale(track);
      if (mp4.isDivided) {
        const {moof, sequenceNumber, moofStart, moofDuration} = getMoofParams();
        track.moofs.push(mp4);
        track.start.push(sequenceNumber);
        track.durations.push(moofDuration);
        track.duration += moofDuration;
      } else {
        for (let i = 0, len = mp4.root.moofs.length; i < len; i++) {
          const {moof, sequenceNumber, moofStart, moofDuration} = getMoofParams(i);
          const moofS = moof.offset;
          const moofE = moofS + moof.wholeSize;
          if (track.start.indexOf(sequenceNumber) === -1) {
            if (option.priority === PRIORITY.SPEED) {
              track.moofs.push(moof);
            } else {
              track.moofs.push(new Blob([array.slice(moofS, moofE)]));
            }
            track.start.push(sequenceNumber);
            track.durations.push(moofDuration);
            track.duration += moofDuration;
          }
        }
      }
      if (index[trackId] === 0 && track.moofs.length >= 5000 && track.moofs.length % 1000 === 0) {
        const msg = i18n.getMessage("warn_chunksize_excess").replace("NUM_CHUNKS", track.moofs.length);
        video._master._tab.sendMessage(CMD_MESSAGE, {vId:video.vId, on:"warn", message:'<span style="color:#f88;font-size:x-small">' + msg + "</span>"});
      }
    }
    if (hasMdat) {
      if (mp4.isDivided) {
        track.mdats.push(mp4.mdat);
        size += mp4.mdat.size;
      } else {
        if (hasMoof && mp4.root.moofs.length === mp4.root.mdats.length) {
          for (let i = 0, len = mp4.root.mdats.length; i < len; i++) {
            const {moof, sequenceNumber, moofStart, moofDuration} = getMoofParams(i);
            const pos = track.start.indexOf(sequenceNumber);
            if (pos !== -1 && !track.mdats[pos]) {
              track.mdats[pos] = new Blob([mp4.root.mdats[i].data]);
              size += mp4.root.mdats[i].data.byteLength;
            }
          }
        } else {
          for (const mdat of mp4.root.mdats) {
            track.mdats.push(new Blob([mdat.data]));
            size += mdat.data.byteLength;
          }
        }
      }
    }
    checkAVSync(tracks);
    correctMisplacedData(tracks);
    if (isDiscontigTrack(track)) {
      const flushed = await video.flush();
      if (flushed) {
        video.complete();
        video.clearAllTracks();
        video = new CapturedVideo(master, mediasourceid, video);
      }
    }
  }
  if (video) {
    video.size += size;
    video.updateProgress();
    video.createPreviewOnce(1);
  }
};
const divideByTrack = srcMP4 => {
  const src = srcMP4.root;
  if (src.moov) {
    const traks = src.moov.traks;
    const len = traks.length;
    if (len > 1 && src.moov.mvex.trexs.length === len) {
      const result = [];
      for (let i = 0; i < len; i++) {
        const mp4 = new MP4;
        const root = mp4.root;
        if (src.ftyp) {
          root.append(src.ftyp);
        }
        root.append(new MP4.Box("moov"));
        root.moov.append(src.moov.mvhd);
        root.moov.append(new MP4.Box("mvex"));
        root.moov.mvex.append(src.moov.mvex.trexs[i]);
        root.moov.append(src.moov.traks[i]);
        root.arrange();
        result.push(mp4);
      }
      return result;
    }
  } else {
    if (src.moof) {
      const wholeData = srcMP4.data;
      const trafs = src.moof.trafs;
      const len = trafs.length;
      if (len > 1) {
        const result = [];
        for (let i = 0; i < len; i++) {
          const mp4 = new MP4;
          const root = mp4.root;
          if (src.styp) {
            root.append(src.styp);
          }
          if (src.sidx) {
            root.append(src.sidx);
          }
          root.append(new MP4.Box("moof"));
          root.moof.append(src.moof.mfhd);
          root.moof.append(src.moof.trafs[i]);
          root.arrange();
          root.publish(null, null, () => {
          });
          result.push(mp4);
          const parts = [];
          let mdatSize = 0;
          for (const trun of src.moof.trafs[i].truns) {
            let offset = src.moof.offset + trun.dataOffset;
            let size = 0;
            for (const s of trun.samples) {
              size += s.size;
            }
            parts.push(wholeData.slice(offset, offset + size));
            mdatSize += size;
          }
          const header = new Uint8Array(8);
          mdatSize += 8;
          header.set([mdatSize >> 24 & 255, mdatSize >> 16 & 255, mdatSize >> 8 & 255, mdatSize & 255, 109, 100, 97, 116]);
          mp4.mdat = new Blob([header, ...parts]);
          mp4.isDivided = true;
        }
        return result;
      }
    }
  }
  return [srcMP4];
};
const getTrackTimeScale = track => {
  const mdia = track?.init?.root?.moov?.trak?.mdia;
  if (mdia) {
    const ts = mdia.mdhd?.timeScale;
    if (ts) {
      return ts;
    } else {
      if (mdia.hdlr) {
        if (mdia.hdlr.handlerType === "vide") {
          return 90000;
        }
        if (mdia.hdlr.handlerType === "soun") {
          return 48000;
        }
      }
    }
  }
  return 1000;
};
const getMoofBaseMediaDecodeTime = moof => {
  return moof?.traf?.tfdt?.baseMediaDecodeTime || 0;
};
const getMoofDuration = moof => {
  let duration = 0;
  const traf = moof && moof.traf;
  if (traf) {
    const tfhd = traf.tfhd;
    const defaultSampleDuration = tfhd && tfhd.defaultSampleDuration;
    for (const trun of traf.truns) {
      for (const sample of trun.samples) {
        duration += sample.duration || defaultSampleDuration || 0;
      }
    }
  }
  return duration;
};
const getMoofDeltaAndDuration = (init, root, index) => {
  if (!init || !root) {
    return {moofDuration:0, moofStart:0};
  }
  index = index || 0;
  const moof = root && root.moofs && root.moofs[index];
  const sidx = root && root.sidx;
  if (sidx) {
    const {timeScale, earliestPresentationTime} = sidx;
    let start;
    if (Math.abs(moof.traf.tfdt.baseMediaDecodeTime / init.root.moov.trak.mdia.mdhd.timeScale - earliestPresentationTime / timeScale) > CONTIG_THRESHOLD_SEC) {
      if (_ILOG_) {
        console.log("baseMediaDecodeTime !== earliestPresentationTime", moof.traf.tfdt.baseMediaDecodeTime / init.root.moov.trak.mdia.mdhd.timeScale, earliestPresentationTime / timeScale);
      }
    }
    if (earliestPresentationTime && timeScale) {
      start = earliestPresentationTime / timeScale;
    } else {
      if (moof.traf.tfdt.baseMediaDecodeTime && init.root.moov.trak.mdia.mdhd.timeScale) {
        start = moof.traf.tfdt.baseMediaDecodeTime / init.root.moov.trak.mdia.mdhd.timeScale;
      }
    }
    const subsegmentDuration = sidx.references && sidx.references[index] && sidx.references[index].subsegmentDuration;
    if (timeScale && start !== undefined && subsegmentDuration) {
      const moofDuration = subsegmentDuration / timeScale;
      return {moofDuration, moofStart:start};
    }
  }
  if (moof && init && init.root && init.root.moov) {
    const timeScale = init.root.moov.trak.mdia.mdhd.timeScale;
    const traf = moof.traf;
    if (traf && timeScale) {
      const {tfhd, trun, tfdt} = traf;
      if (tfhd && tfdt && trun) {
        const moofStart = tfdt.baseMediaDecodeTime / timeScale;
        const defaultSampleDuration = tfhd.defaultSampleDuration;
        if (trun.samples) {
          let moofDuration = 0;
          for (const trun of traf.truns) {
            for (const sample of trun.samples) {
              moofDuration += sample.duration || defaultSampleDuration || 0;
            }
          }
          if (moofDuration === 0) {
            const sampleDuration = init.root.moov.mvex && init.root.moov.mvex.trex && init.root.moov.mvex.trex.sampleDuration || 0;
            for (const trun of traf.truns) {
              moofDuration += (trun.sampleCount || 0) * sampleDuration;
            }
          }
          moofDuration /= timeScale;
          return {moofDuration, moofStart};
        }
      }
    }
  }
  return {moofDuration:0, moofStart:0};
};
const isDiscontigTrack = track => {
  if (track && track.start) {
    const len = track.start.length;
    if (len > 1) {
      for (let i = track.contig; i < len - 1; i++) {
        const start = track.start[i];
        const duration = track.duration[i];
        const next = track.start[i + 1];
        if (Math.abs(start + duration - next) > CONTIG_THRESHOLD_SEC) {
          if (_ILOG_) {
            console.log("---:--- discontig track found");
            console.log("        start:" + start, "duration:" + duration, "next:" + next);
            console.log("        start    " + ilist(track.start));
            console.log("        duration " + ilist(track.duration));
          }
          return true;
        }
        track.contig = i + 1;
      }
    }
  }
  return false;
};
const isCompleteTrack = tracks => {
  let trackCnt = 0;
  for (const track of tracks) {
    if (track.init && track.moofs.length > 0) {
      trackCnt++;
    }
  }
  return tracks.length === trackCnt;
};
const correctMisplacedData = tracks => {
  for (const track of tracks) {
    const last = track.start.length - 1;
    if (last >= 2) {
      const {moofs, mdats, start, durations} = track;
      if (moofs.length === mdats.length && moofs.length === start.length && moofs.length === durations.length) {
        if (start[last - 2] < start[last] && start[last] < start[last - 1]) {
          const p = start[last - 2] + durations[last - 2];
          if (Math.abs(p - start[last]) < Math.abs(p - start[last - 1])) {
            if (_LOG_) {
              console.log("swap misplaced data", start[last - 2], start[last - 1], start[last]);
            }
            const swap = types => {
              for (const t of types) {
                const tmp = t[last - 1];
                t[last - 1] = t[last];
                t[last] = tmp;
              }
            };
            swap([moofs, mdats, start, durations]);
          }
        }
      }
    }
  }
};
const checkAVSync = tracks => {
  for (const track of tracks) {
    if (track.init && track.moofs.length > 1) {
      const last = track.moofs.length - 1;
      if (track.start[last] === track.start[last - 1] && track.durations[last] === track.durations[last - 1]) {
        if (_ILOG_) {
          console.log("    remove same start/duration");
          console.log("        track-start    " + ilist(track.start));
          console.log("        track-duration " + ilist(track.durations));
        }
        track.moofs.splice(last - 1, 1);
        track.mdats.splice(last - 1, 1);
        track.start.splice(last - 1, 1);
        track.durations.splice(last - 1, 1);
      }
    }
  }
  if (tracks.length !== 2) {
    return;
  }
  if (tracks[0].start.length < 1 || tracks[1].start.length < 1) {
    return;
  }
  const a = tracks[0];
  const b = tracks[1];
  let t = null;
  let diff = Math.abs(a.start[0] - b.start[0]);
  if (a.start.length > 1) {
    const candidate = Math.abs(a.start[1] - b.start[0]);
    if (candidate < diff) {
      diff = candidate;
      t = a;
    }
  }
  if (b.start.length > 1) {
    const candidate = Math.abs(b.start[1] - a.start[0]);
    if (candidate < diff) {
      diff = candidate;
      t = b;
    }
  }
  if (t) {
    if (_ILOG_) {
      console.log("[ - ]   remove the first to sync a/v");
      console.log("        a " + ilist(a.start));
      console.log("        b " + ilist(b.start));
    }
    t.moofs.splice(0, 1);
    t.mdats.splice(0, 1);
    t.start.splice(0, 1);
    t.durations.splice(0, 1);
  }
};
const readBlob = async blob => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader;
    reader.onload = evt => {
      resolve(reader.result);
    };
    reader.onerror = evt => {
      reject(reader.error);
    };
    reader.readAsArrayBuffer(blob);
  });
};
const loadExternalBlob = url => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest;
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && xhr.status === 200) {
        resolve(xhr.response);
      }
    };
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.send();
  });
};
const LevelType = {MAIN:"main", AUDIO:"audio", SUBTITLE:"subtitle"};
class PlayListLoader {
  constructor() {
    this.url = null;
    this.headers = null;
    this.master = null;
    this.details = null;
    this.retry = 0;
  }
  async load(url, headers) {
    this.url = url;
    this.headers = headers;
    this.retry = 0;
    return await this.loadPlayList();
  }
  get isMaster() {
    return this.master;
  }
  get isLevelDetail() {
    return this.details;
  }
  async loadPlayList(testHeaders) {
    const {url, headers} = this;
    try {
      const response = await xFetch({url, method:"GET", headers:testHeaders || headers});
      if (!response.ok) {
        this.retry++;
        if (this.retry >= 2) {
          return {status:response.status, message:"retry " + this.retry + " times"};
        } else {
          await sleep(1000);
          if (!testHeaders && response.status === 403) {
            const _h = Object.assign({}, headers);
            _h["Referer"] = _h["Origin"] = null;
            return await this.loadPlayList(_h);
          } else {
            return await this.loadPlayList();
          }
        }
      }
      const text = await response.text();
      if (text.indexOf("#EXTINF:") > 0 || text.indexOf("#EXT-X-TARGETDURATION:") > 0) {
        this.details = await this._handleTrackOrLevelPlaylist(text, url, 0);
      } else {
        const data = await this._handleMasterPlaylist(text, url, null, null, null);
        this.master = this.onManifestLoaded(data);
      }
      if (testHeaders) {
        this.headers = testHeaders;
      }
    } catch (e) {
      if (_LOG_) {
        console.log(...logRED(e.message || e));
      }
      return {status:900, message:e.message || e || "unkown"};
    }
    return {status:300, message:"ok"};
  }
  async _handleMasterPlaylist(response, url, stats, context, networkDetails) {
    const string = response;
    const {levels} = M3U8Parser.parseMasterPlaylist(string, url);
    if (!levels?.length) {
    }
    const subtitles = M3U8Parser.parseMasterPlaylistMedia(string, url, "SUBTITLES");
    let audioTracks = M3U8Parser.parseMasterPlaylistMedia(string, url, "AUDIO", levels.map(level => ({id:level.attrs.AUDIO, codec:level.audioCodec})));
    if (audioTracks.length) {
      let embeddedAudioFound = false;
      audioTracks.forEach(audioTrack => {
        if (!audioTrack.url) {
          embeddedAudioFound = true;
        }
      });
      if (embeddedAudioFound === false && levels[0].audioCodec && !levels[0].attrs.AUDIO) {
        audioTracks.unshift({type:"main", name:"main"});
      }
    }
    return {levels, audioTracks, subtitles};
  }
  async _handleTrackOrLevelPlaylist(response, url, levelId) {
    const levelType = LevelType.MAIN;
    const levelDetails = M3U8Parser.parseLevelPlaylist(response, url, levelId, levelType);
    if (!levelDetails.targetduration) {
      throw Error("[Abort] invalid target duration" + response.status);
    }
    return levelDetails;
  }
  onManifestLoaded(data) {
    let levels = [];
    let bitrateStart;
    let levelSet = {};
    let levelFromSet = null;
    let videoCodecFound = false;
    let audioCodecFound = false;
    let chromeOrFirefox = /chrome|firefox/.test(navigator.userAgent.toLowerCase());
    let audioTracks = [];
    const subtitles = data.subtitles;
    const subtitle = subtitles && subtitles.length > 0;
    data.levels.forEach(level => {
      level.loadError = 0;
      level.fragmentError = false;
      videoCodecFound = videoCodecFound || !!level.videoCodec;
      audioCodecFound = audioCodecFound || !!level.audioCodec || !!(level.attrs && level.attrs.AUDIO);
      if (chromeOrFirefox === true && level.audioCodec && level.audioCodec.indexOf("mp4a.40.34") !== -1) {
        level.audioCodec = undefined;
      }
      levelFromSet = levelSet[level.bitrate];
      if (levelFromSet === undefined) {
        level.url = [level.url];
        level.urlId = 0;
        levelSet[level.bitrate] = level;
        levels.push(level);
      } else {
        levelFromSet.url.push(level.url);
      }
    });
    if (videoCodecFound === true && audioCodecFound === true) {
      levels = levels.filter(({videoCodec}) => !!videoCodec);
    }
    levels = levels.filter(({audioCodec, videoCodec}) => {
      return (!audioCodec || isCodecSupportedInMp4(audioCodec)) && (!videoCodec || isCodecSupportedInMp4(videoCodec));
    });
    if (data.audioTracks) {
      audioTracks = data.audioTracks.filter(track => !track.audioCodec || isCodecSupportedInMp4(track.audioCodec, "audio"));
    }
    if (levels.length > 0) {
      bitrateStart = levels[0].bitrate;
      levels.sort((a, b) => {
        return a.bitrate - b.bitrate;
      });
      for (let i = 0; i < levels.length; i++) {
        if (levels[i].bitrate === bitrateStart) {
          break;
        }
      }
      return {levels, audioTracks, audio:audioCodecFound, video:videoCodecFound, altAudio:audioTracks.length > 0, subtitles, subtitle};
    } else {
      throw Error("no level with compatible codecs found in manifest");
    }
  }
}
const typeSupported = {mp4:MediaSource.isTypeSupported("video/mp4"), mpeg:MediaSource.isTypeSupported("audio/mpeg"), mp3:MediaSource.isTypeSupported('audio/mp4; codecs="mp3"')};
const muxConfig = [{demux:TSDemuxer, remux:MP4Remuxer}, {demux:MP4Demuxer, remux:PassThroughRemuxer}, {demux:AACDemuxer, remux:MP4Remuxer}, {demux:MP3Demuxer, remux:MP4Remuxer}];
const hlsConfig = {stretchShortVideoTrack:false, maxBufferHole:0.5, maxAudioFramesDrift:1, enableSoftwareAES:true, forceKeyFrameOnDiscontinuity:true, };
class DMXR {
  constructor(initSegment, audioCodec, videoCodec, duration) {
    this.demuxer = null;
    this.remuxer = null;
    this.initSegment = initSegment;
    this.audioCodec = audioCodec;
    this.videoCodec = videoCodec;
    this.duration = duration;
    this.result = {};
    this.resolve = null;
    this.reject = null;
    this._evt_ = [];
  }
  init() {
    if (this.demuxer) {
      this.demuxer.resetInitSegment(this.initSegment, this.audioCodec, this.videoCodec, this.duration);
      this.demuxer.resetTimeStamp();
    }
    if (this.remuxer) {
      this.remuxer.resetInitSegment();
      this.remuxer.resetTimeStamp();
    }
  }
  get observer() {
    return {trigger:(evt, data) => {
      this._evt_.push(evt.replace(/hlsFrag/, "").replace(/hls/, ""));
      if (evt === "hlsError") {
        this.reject({fatal:false, message:data});
      }
      if (evt === HlsEvents.FRAG_PARSED) {
        if (_LOGV_) {
          console.log(...logGen(null, "DMXR", this._evt_.join(",")));
        }
        this._evt_ = [];
        return this.resolve(this.result);
      }
      if (evt === HlsEvents.FRAG_PARSING_INIT_SEGMENT) {
        this.result[evt] = data;
      } else {
        if (evt === HlsEvents.FRAG_PARSING_DATA) {
          if (!this.result[evt]) {
            this.result[evt] = [];
          }
          this.result[evt].push(data);
        }
      }
    }};
  }
  demux(data, decryptdata, timeOffset, accurateTimeOffset, contiguous) {
    return new Promise(async(resolve, reject) => {
      this.result = {};
      this.resolve = resolve;
      this.reject = reject;
      try {
        data = new Uint8Array(data);
        if (!this.demuxer) {
          for (const mux of muxConfig) {
            if (mux.demux.probe(data)) {
              this.remuxer = new mux.remux(this.observer, hlsConfig, typeSupported, navigator.vendor);
              this.demuxer = new mux.demux(this.observer, this.remuxer, hlsConfig, typeSupported);
              break;
            }
          }
          if (!this.demuxer) {
            return reject({fatal:true, message:"suitable demuxer not found"});
          }
          contiguous = false;
        }
        if (!contiguous) {
          this.init();
        }
        this.demuxer.append(data, timeOffset, contiguous, accurateTimeOffset);
      } catch (e) {
        console.log(...logRED(e.stack));
        reject({fatal:true, message:e.message});
      }
    });
  }
}
"use strict";
const resources = {"url":{}};
const getValidTracks = (tracks, opt) => {
  if (_ILOG_) {
    console.log("    getValidTracks() , opt = " + (opt || "NO_OPTION"));
  }
  const valid = [];
  if (opt === FLUSH_MODE.ALL) {
    for (const track of tracks) {
      if (track.init && track.moofs.length > 0) {
        const moofs = track.moofs.splice(0);
        const mdats = track.mdats.splice(0);
        const start = track.start.splice(0);
        const duration = track.duration.splice(0);
        const {mimetype, init} = track;
        valid.push({mimetype, init, moofs, mdats, start});
      }
    }
    return valid;
  }
  let trackCnt = 0;
  const durations = [];
  for (const track of tracks) {
    if (track.init && track.moofs.length > 0) {
      trackCnt++;
      track.contig = 0;
      isDiscontigTrack(track);
      durations.push(track.start[track.contig] + track.duration[track.contig]);
    }
  }
  if (trackCnt === 0) {
    return valid;
  }
  if (tracks.length !== trackCnt) {
    return valid;
  }
  if (_ILOG_) {
    console.log("        durations        " + ilist(durations));
  }
  const stop = Math.min(...durations) + CONTIG_THRESHOLD_SEC;
  const slice = opt === FLUSH_MODE.TEST ? "slice" : "splice";
  for (const track of tracks) {
    const len = track.moofs.length;
    if (track.init && len > 0) {
      let i = 0;
      for (; i < len; i++) {
        const start = track.start[i];
        const duration = track.duration[i];
        if (track.start[i] + track.duration[i] > stop) {
          break;
        }
        if (i < len - 1) {
          const next = track.start[i + 1];
          if (Math.abs(start + duration - next) > CONTIG_THRESHOLD_SEC) {
            i++;
            break;
          }
        }
      }
      if (i > 0) {
        const moofs = track.moofs[slice](0, i);
        const mdats = track.mdats[slice](0, i);
        const start = track.start[slice](0, i);
        const duration = track.duration[slice](0, i);
        const {mimetype, init} = track;
        valid.push({mimetype, init, moofs, mdats, start});
      }
    }
    track.contig = 0;
  }
  if (_ILOG_) {
    for (let i = 0, len = valid.length; i < len; i++) {
      const track = valid[i];
      console.log("        Write buffer(" + i + ")  " + ilist(track.start));
    }
    for (let i = 0, len = tracks.length; i < len; i++) {
      const track = tracks[i];
      console.log("        Remains(" + i + ")       " + ilist(track.start));
    }
  }
  return valid;
};
const copyAllTracks = tracks => {
  const valid = [];
  for (const track of tracks) {
    if (track.init && track.moofs.length > 0) {
      const moofs = track.moofs.slice(0);
      const mdats = track.mdats.slice(0);
      const start = track.start.slice(0);
      const {mimetype, init} = track;
      valid.push({mimetype, init, moofs, mdats, start});
    }
  }
  return valid;
};
const copyContiguousTracks = tracks => {
  let max = 0;
  for (const track of tracks) {
    const len = track.start.length;
    if (len > 0) {
      if (track.start[len - 1] > max) {
        max = track.start[len - 1];
      }
    }
  }
  let min = max;
  for (const track of tracks) {
    const len = track.start.length;
    if (len > 0) {
      if (track.start[0] < min) {
        min = track.start[0];
      }
    }
  }
  const valid = [];
  for (const track of tracks) {
    const {mimetype, init} = track;
    valid.push({mimetype, init, moofs:[], mdats:[], start:[]});
  }
  for (let i = min; i <= max; i++) {
    const idx = [];
    for (let ti = 0, tlen = tracks.length; ti < tlen; ti++) {
      const track = tracks[ti];
      const n = track.start.indexOf(i);
      if (n !== -1) {
        idx.push(n);
      }
    }
    if (idx.length === tracks.length) {
      for (let ti = 0, tlen = tracks.length; ti < tlen; ti++) {
        const track = tracks[ti];
        const n = idx[ti];
        const target = valid[ti];
        target.moofs.push(track.moofs[n]);
        target.mdats.push(track.mdats[n]);
        target.start.push(track.start[n]);
      }
    }
  }
  return valid;
};
const flush = async video => {
  if (_LOG_) {
    console.log(...logGen(video?._master?._tab.id, "flush", "start"));
  }
  const tracks = video.isLive && video.hasAltAudio ? copyContiguousTracks(video.tracks) : copyAllTracks(video.tracks);
  const {size, sourceType} = video;
  if (tracks.length === 0 || tracks[0].moofs.length === 0) {
    return null;
  }
  const opt = {skipLiveKeyFrame:sourceType === SOURCE_TYPE.MEDIASTREAM, keyFrameComplement:sourceType === SOURCE_TYPE.MEDIASTREAM, modifyESDSTrackConfig:sourceType === SOURCE_TYPE.MEDIASTREAM, over4G:size > 4 * 1000 * 1000 * 1000, over13H:false};
  try {
    const file = await _buildMP4(tracks, opt, video);
    const blobURL = URL.createObjectURL(file);
    resources.url[blobURL] = 1;
    video._master.saveSettings();
    return blobURL;
  } catch (e) {
    console.log(...logRED(e.stack || e));
    return null;
  }
};
const createValidUrl = url => {
  if (url.startsWith("//")) {
    url = location.protocol + url;
  }
  return url;
};
let revokeList = [];
const xFetch = params => {
  let {url, method, headers, resultType, timeout} = params;
  params.headers = createCustomHeaders(params.headers || {});
  return new Promise((resolve, reject) => {
    url = createValidUrl(url);
    params.revokeList = revokeList;
    revokeList = [];
    WebExtensions.runtime.sendMessage({cmd:CMD_FETCH, params}, response => {
      const {ok, blobUrl, message} = response;
      if (ok) {
        fetch(blobUrl).then(response => {
          if (response.ok) {
            revokeList.push(blobUrl);
            resolve(response);
          } else {
            reject({status:-1, message:"failed to fetch"});
          }
        }).catch(error => {
          reject({status:-1, error});
        });
      } else {
        reject({status:-1, message});
      }
    });
    if (timeout) {
      setTimeout(() => {
        reject({status:408});
      }, timeout);
    }
  });
};
const LM_Get = params => {
  let {url, method, headers, resultType, timeout} = params;
  return new Promise((resolve, reject) => {
    url = createValidUrl(url);
    const init = {method:method ? method : "GET", mode:"cors", credentials:"include", };
    const customHeaders = createCustomHeaders(headers);
    if (customHeaders) {
      init.headers = customHeaders;
    }
    if (timeout) {
      setTimeout(() => {
        reject({status:408});
      }, timeout);
    }
    fetch(url, init).then(response => {
      if (!response.ok) {
        return reject({status:response.status});
      }
      if (method === "HEAD") {
        const h = {};
        for (const pair of response.headers.entries()) {
          h[pair[0]] = pair[1];
        }
        return h;
      } else {
        return response[resultType || "text"]();
      }
    }).then(response => {
      resolve(response);
    }).catch(error => {
      reject({status:-1, error});
    });
  });
};
const fragmentLog = (title, fragment) => {
  return [`${title}    -   CC:${fragment.cc} , SN:${fragment.sn} , start:${fragment.start !== undefined ? fragment.start : ""}  ${fragment.url}`];
};
const sortFragments = list => {
  const N = 100000;
  list.sort((a, b) => a.cc * N + a.start - (b.cc * N + b.start));
  return list;
};
const hlsLoader = async video => {
  const tabId = video._master._tab.id;
  if (_LOG_) {
    console.log(...logGen(tabId, "hlsLoader", "start"));
  }
  const level = video._master.levels[video._master.selected_level];
  const audioLevel = video._master.audioTracks[video._master.selected_audioLevel || 0];
  video.hasAltAudio = audioLevel?.details?.fragments?.length > 0;
  const fragmentStream = sortFragments([...level.details.fragments, ...video.hasAltAudio ? audioLevel.details.fragments : []]);
  const ccLen = {};
  let n = 0;
  let currentCC = fragmentStream[0].cc;
  for (let i = 0, len = fragmentStream.length; i < len; i++) {
    const fragment = fragmentStream[i];
    if (currentCC !== fragment.cc) {
      ccLen[currentCC] = n;
      currentCC = fragment.cc;
      n = 0;
    }
    n++;
  }
  ccLen[currentCC] = n;
  const loaded = video.contig || 0;
  currentCC = fragmentStream[loaded].cc;
  const _sidx = (location.href.match(/start=(\d+)/) || [])[1];
  const _eidx = (location.href.match(/stop=(\d+)/) || [])[1];
  const startIdx = loaded === 0 && _sidx && !video.hasAltAudio ? Math.max(0, Number(_sidx)) : loaded;
  const stopIdx = loaded === 0 && _eidx && !video.hasAltAudio ? Math.min(fragmentStream.length, Number(_eidx)) : fragmentStream.length;
  const progress = {max:Math.min(stopIdx - startIdx, ccLen[currentCC]), current:0, offset:startIdx};
  const _ts = (new Date).getTime();
  const NOWAIT = true;
  const indexWaitQue = {};
  const demuxWaitQue = {};
  const fetchWaitQue = {};
  const pass = (q, n) => {
    n = n || 0;
    if (q[n]) {
      q[n]();
      delete q[n];
    }
  };
  const waiter = (q, n) => {
    return new Promise((resolve, reject) => {
      n = n || 0;
      pass(q, n);
      q[n] = resolve;
    });
  };
  let d_current = startIdx;
  let d_stop = stopIdx;
  (async() => {
    const preload_max = 30;
    let p_loading = 0;
    let p_current = startIdx;
    let p_stop = stopIdx;
    try {
      while (p_current < p_stop && p_current < fragmentStream.length) {
        while (p_loading < video.parallel_max && p_current < d_current + preload_max) {
          await video.wait();
          if (p_current >= p_stop || p_current >= fragmentStream.length) {
            break;
          }
          const fragment = fragmentStream[p_current];
          fragment.__fragment_index__ = p_current;
          if (currentCC !== fragment.cc) {
            if (_LOG_) {
              console.log(...logGen(tabId, "hlsLoader, chapter changed,", currentCC + "->" + fragment.cc));
            }
            const newVideo = new HLSVideo(video._master, false, video);
            newVideo.contig = p_current;
            await newVideo.start();
            p_loading = d_current = 99999;
            return pass(indexWaitQue, fragment.__fragment_index__);
          }
          (async fragment => {
            const idx = fragment.__fragment_index__;
            p_loading++;
            const {data, error} = await fetchFragment(fragment, 3);
            p_loading--;
            if (NOWAIT) {
              pass(indexWaitQue, idx);
              pass(fetchWaitQue);
            }
            if (!error) {
              fragment._data = data;
            } else {
              video.pause("Faild to fetch TS, " + (error.status || error.message));
              p_current = idx;
              await video.wait();
            }
          })(fragment);
          p_current++;
        }
        if (NOWAIT) {
          if (p_loading >= video.parallel_max) {
            await waiter(fetchWaitQue);
          }
          if (p_current >= d_current + preload_max) {
            await waiter(demuxWaitQue);
          }
        } else {
          await sleep(100);
        }
      }
    } catch (e) {
      if (_LOG_) {
        console.log(...logGen(tabId, "hlsLoader", e?.stack || e?.message || e));
      }
    }
  })();
  while (d_current < d_stop) {
    const fragment = fragmentStream[d_current];
    if (fragment._data) {
      try {
        await fragment.demuxer.demux({video, fragment, data:fragment._data});
      } catch (e) {
        video.pause("[ FATAL ] Faild to demux : " + e.message);
        break;
      }
      delete fragment._data;
      if (NOWAIT) {
        pass(demuxWaitQue);
      }
      d_current++;
      progress.current++;
      video.createPreviewOnce();
      video.updateProgress(progress);
    } else {
      if (NOWAIT) {
        await waiter(indexWaitQue, d_current);
      } else {
        await sleep(100);
      }
    }
  }
  if (_LOG_) {
    const _now = (new Date).getTime();
    console.log(...logGen(tabId, "hlsLoader", "load all fragments, " + stopIdx + " / " + stopIdx));
    console.log(...logGen(tabId, "hlsLoader", "time : " + (_now - _ts)));
  }
  await video.flush();
  video.complete();
  video._master._tab.sendMessage(CMD_MESSAGE, {on:"title", message:i18n.getMessage("title_completed") + " - " + stopIdx + " / " + stopIdx});
};
const liveLoader = async(video, as_audio) => {
  const tabId = video?._master?._tab?.id;
  const level = as_audio ? video._master.audioTracks[video._master.selected_audioLevel || 0] : video._master.levels[video._master.selected_level];
  if (as_audio) {
    video.hasAltAudio = level?.details?.fragments?.length > 0;
    if (!video.hasAltAudio) {
      return;
    }
  }
  if (_LOG_) {
    console.log(...logGen(tabId, "liveLoader" + (as_audio ? "(audio)" : ""), "start"));
  }
  const suffix = as_audio ? "_audio" : "";
  const details = level.details;
  const fragments = details.fragments;
  const intervalTime = Math.max((details.averagetargetduration || details.totalduration / details.fragments) - 0.1, 0.5) * 1000;
  const E_SUCCESS = 1, E_ERROR = 2;
  let exitStatus = E_SUCCESS;
  let timerId = -1;
  const breakInterval = () => {
    if (timerId >= 0) {
      clearInterval(timerId);
      timerId = -1;
    }
  };
  video["destroyFunc" + suffix] = breakInterval;
  const playList = new PlayListLoader;
  const playListUrl = details.url;
  const stopLoadingPlayList = (msg, stat) => {
    breakInterval();
    if (_LOG_) {
      console.log(...logGen(tabId, "liveLoader" + suffix + ".stopLoadingPlayList", msg || ""));
    }
    if (stat) {
      exitStatus = stat;
    }
  };
  const showErrorMessage = msg => {
    video._master._tab.sendMessage(CMD_MESSAGE, {vId:video.vId, on:"error", message:msg});
  };
  let prevSN = -1, errCnt = 0;
  const _loop = async() => {
    try {
      const result = await playList.load(playListUrl, details.requestHeaders);
      if (result.status === 300) {
        const latestFrags = playList.details && playList.details.fragments || [];
        if (latestFrags.length > 0) {
          let curFrag = fragments[fragments.length - 1];
          for (const f of latestFrags) {
            if (f.sn > curFrag.sn) {
              if (f.sn - curFrag.sn > 1) {
                if (_LOG_) {
                  console.log("discontig fragments found", "curFrag ", curFrag.sn, "latestFrags", f.sn, "errCnt", errCnt);
                }
                const msg = i18n.getMessage("warn_discontig_fragments_found");
                video._master._tab.sendMessage(CMD_MESSAGE, {vId:video.vId, on:"warn", message:'<span style="color:#f88;font-size:x-small">' + msg + "</span>"});
              }
              fragments.push(f);
              f._n = curFrag._n + 1;
              f._parent = details;
              f.demuxer = level.details.demuxer;
              curFrag = f;
              errCnt = 0;
            } else {
              if (f.cc !== curFrag.cc) {
                if (_LOG_) {
                  console.log(...logGen(tabId, "liveLoader._loop", "found current.cc !== previous.cc , continue"));
                }
                const msg = i18n.getMessage("warn_chapter_has_changed");
                video._master._tab.sendMessage(CMD_MESSAGE, {vId:video.vId, on:"warn", message:'<span style="color:#f88;font-size:x-small">' + msg + "</span>"});
              }
            }
          }
          errCnt++;
          if (errCnt >= 30) {
            return stopLoadingPlayList("end of live : reason ( errCnt === 30 )", E_SUCCESS);
          }
        } else {
          return stopLoadingPlayList("end of live : reason ( details.fragments.length === 0 )", E_SUCCESS);
        }
      } else {
        return stopLoadingPlayList("may be end of live : reason ( status_code : " + result.status + " )", E_SUCCESS);
      }
    } catch (e) {
      stopLoadingPlayList("failed to load playlist, stop liveLoader" + suffix, E_ERROR);
      showErrorMessage("[ FATAL ] Faild to load index, " + (e.message || e));
    }
  };
  timerId = setInterval(_loop, intervalTime);
  let loadPtr = 0;
  while (timerId >= 0) {
    const fragment = fragments[loadPtr];
    if (fragment) {
      const retry = loadPtr < fragments.length - 1 ? 1 : 3;
      const {data, error} = await fetchFragment(fragment, retry);
      if (error) {
        if (loadPtr < fragments.length - 1) {
          loadPtr++;
          continue;
        } else {
          stopLoadingPlayList("failed to fetch fragment, stop liveLoader" + suffix, E_ERROR);
          showErrorMessage("Failed to fetch TS, abort, status : " + error.status);
          break;
        }
      }
      try {
        await fragment.demuxer.demux({video, fragment, data});
      } catch (e) {
        stopLoadingPlayList("failed to demux, stop liveLoader" + suffix, E_ERROR);
        showErrorMessage("[ FATAL ] Faild to demux : " + e.message);
        break;
      }
      loadPtr++;
      if (!as_audio) {
        video.createPreviewOnce();
        video.updateProgress();
        if (loadPtr === 5) {
          for (let i = 0, len = video.tracks.length; i < len; i++) {
            const t = video.tracks[i];
            if (!t.init) {
              const msg = video.index["audio"] === i ? "error_no_audio" : "error_no_video";
              video._master._tab.sendMessage(CMD_MESSAGE, {vId:video.vId, on:"warn", message:i18n.getMessage(msg) + i18n.getMessage("error_try_capture")});
            }
          }
        }
      }
    } else {
      await sleep(intervalTime);
    }
  }
  stopLoadingPlayList();
  if (_LOG_) {
    console.log(...logGen(tabId, "liveLoader" + (as_audio ? "(audio)" : ""), "stop"));
  }
  if (exitStatus === E_SUCCESS) {
    await video.flush();
    video.complete();
  } else {
    if (exitStatus === E_ERROR) {
    }
  }
  if (!as_audio) {
    video._master._tab.sendMessage(CMD_MESSAGE, {on:"title", message:i18n.getMessage("title_completed")});
  }
};
const DivAV_IS = track => {
  const src = (new MP4(track.initSegment)).root;
  if (!src.moov) {
    return track;
  }
  const {container, codec} = track;
  const result = {};
  for (let n = 0, len = src.moov.traks.length; n < len; n++) {
    const mp4 = new MP4;
    const root = mp4.root;
    if (src.ftyp) {
      root.append(src.ftyp);
    }
    root.append(new MP4.Box("moov"));
    root.moov.append(src.moov.mvhd);
    root.moov.append(new MP4.Box("mvex"));
    root.moov.mvex.append(src.moov.mvex.trexs[n]);
    root.moov.append(src.moov.traks[n]);
    root.arrange();
    const type = src.moov.traks[n].mdia.hdlr.handlerType === "vide" ? "video" : "audio";
    result[type] = {initSegment:mp4, container, codec, isMP4:true};
  }
  return result;
};
const onFragParsingInitSegment = (video, frag, data) => {
  let tracks = data.tracks;
  if (tracks["audiovideo"]) {
    tracks = DivAV_IS(tracks["audiovideo"]);
  }
  for (const type in tracks) {
    if (!type.match(/audio|video/)) {
      continue;
    }
    const track = tracks[type];
    const dest = video.getTrackByType(type);
    if (track.initSegment) {
      const initSegment = track.isMP4 ? track.initSegment : new MP4(track.initSegment);
      const moov = initSegment.root && initSegment.root.moov;
      if (moov) {
        initSegment.id = `${track.container}:${track.codec}:${moov.trak.tkhd.width}:${moov.trak.tkhd.height}:${moov.trak.mdia.mdhd.timeScale}`;
      } else {
        initSegment.id = `${track.container}:${track.codec}:` + "void";
      }
      dest.init = initSegment;
      if (_LOGV_) {
        console.log(...logGen("", "onFragParsingInitSegment", `  >> found ${type} initSegment`));
      }
    }
    try {
      if (type === "video") {
        const tkhd = dest.init.root.moov.trak.tkhd;
        dest.quality = Math.floor(tkhd.width / 65536 + 0.4) + " x " + Math.floor(tkhd.height / 65536 + 0.4);
      } else {
        const mdhd = dest.init.root.moov.trak.mdia.mdhd;
        dest.quality = mdhd.timeScale + " Hz";
      }
    } catch (e) {
      dest.quality = "";
    }
  }
  video.updateQualityLabel();
};
const boxAsLightWeight = o => {
  const _find = box => {
    if (box.type !== "mdat") {
      box.data = null;
      box.buffer = null;
    }
    for (let i = 0, len = box.children.length; i < len; i++) {
      _find(box.children[i]);
    }
    return;
  };
  return _find(o);
};
const onFragParsingData_AV = (video, frag, data) => {
  const {type, startPTS, endPTS, startDTS, endDTS, hasAudio, hasVideo, dropped, nb, data1, data2} = data;
  const src = new MP4(new Uint8Array(data1));
  const tracks = divideByTrack(src);
  const pos = frag._n;
  for (const mp4 of tracks) {
    const dest = video.getTrackByNumber(mp4.root.moof.traf.tfhd.trackID);
    dest.moofs[pos] = mp4.root.moof;
    dest.mdats[pos] = mp4.mdat;
    dest.start[pos] = frag.cc * 1000000000 + frag.sn;
    dest.duration += frag.duration;
  }
  video.size += data1?.byteLength || 0;
};
const onFragParsingData = (video, frag, data) => {
  const {type, startPTS, endPTS, startDTS, endDTS, hasAudio, hasVideo, dropped, nb, data1, data2} = data;
  let totalsize = 0;
  if (!type.match(/audio|video/)) {
    return;
  }
  if (type === "audiovideo") {
    return onFragParsingData_AV(video, frag, data);
  }
  const dest = video.getTrackByType(type);
  let initSegment = dest.init;
  const pos = frag._n;
  if (initSegment && initSegment.id.includes("void")) {
    if (data2 && MpegAudio.isHeader(data2, 0)) {
      const mp3header = MpegAudio.parseHeader(data2, 0);
      initSegment = dest.init = createMP3InitSegment(mp3header);
    }
  }
  if (data1 && !data2) {
    const mp4 = new MP4(new Uint8Array(data1));
    const sn = mp4.root.moofs.length === 1 ? 0 : frag.sn;
    const moofS = mp4.root.moofs[sn].offset;
    const moofE = moofS + mp4.root.moofs[sn].wholeSize;
    if (option.priority === PRIORITY.SPEED) {
      boxAsLightWeight(mp4.root.moofs[sn]);
      dest.moofs[pos] = mp4.root.moofs[sn];
    } else {
      dest.moofs[pos] = new Blob([data1.slice(moofS, moofE)]);
    }
    dest.mdats[pos] = new Blob([mp4.root.mdats[sn].data]);
    totalsize = moofE - moofS + dest.mdats[pos].size;
  } else {
    if (initSegment && initSegment.id.includes("mp3")) {
      if (!data2) {
        return;
      }
      const {moof, mdat} = createMP3Moof(data2);
      dest.moofs[pos] = moof;
      dest.mdats[pos] = mdat;
      totalsize = data2.byteLength;
    } else {
      if (!data1 || !data2) {
        return;
      }
      if (option.priority === PRIORITY.SPEED) {
        const moof = new MP4(new Uint8Array(data1));
        boxAsLightWeight(moof.rootBox);
        dest.moofs[pos] = moof;
      } else {
        dest.moofs[pos] = new Blob([data1]);
      }
      dest.mdats[pos] = new Blob([data2]);
      totalsize = data1.byteLength + data2.byteLength;
    }
  }
  dest.start[pos] = frag.cc * 1000000000 + frag.sn;
  dest.duration += frag.duration;
  video.size += totalsize;
};
class Demuxer {
  constructor(level) {
    this.demuxer = new DMXR(level.details.initSegment.data || [], level.audioCodec, level.videoCodec, level.details.totalduration);
    this.prevSN = -1;
    this.prevCC = -1;
    this.prevError = null;
  }
  async demux(params) {
    const {video, fragment, data} = params;
    const timeOffset = !isNaN(fragment.startDTS) ? fragment.startDTS : fragment.start;
    try {
      const contig = fragment.sn === this.prevSN + 1 && fragment.cc === this.prevCC && !this.prevError;
      this.prevError = null;
      this.prevSN = fragment.sn;
      this.prevCC = fragment.cc;
      const result = await this.demuxer.demux(data, fragment.decryptdata, timeOffset, true, contig);
      const initSegment = result[HlsEvents.FRAG_PARSING_INIT_SEGMENT];
      if (initSegment) {
        onFragParsingInitSegment(video, fragment, initSegment);
      }
      const mdats = result[HlsEvents.FRAG_PARSING_DATA];
      if (mdats) {
        for (const mdat of mdats) {
          onFragParsingData(video, fragment, mdat);
        }
      }
    } catch (e) {
      if (_LOGV_ && e.stack) {
        console.log(...logRED(e.stack));
      }
      if (_LOGV_) {
        console.log(...logGen("", "Demuxer.demux", (e.fatal ? "FATAL, " : "Continue, ") + e.message));
      }
      if (e.fatal) {
        throw e;
      }
      this.prevError = e;
    }
  }
}
const fetchFragment = async(fragment, retryCount, timeout) => {
  retryCount = Math.max(1, Math.min(5, retryCount || 1));
  if (fragment.decryptdata && fragment.decryptdata.uri != null && fragment.decryptdata.key == null) {
    return {error:new Error("HLS-encryption is not supported : abort"), data:null};
  }
  if (_LOGV_) {
    console.log(...fragmentLog("Load Fragment : ", fragment));
  }
  if (_LOGV_) {
    console.log("Detect byterange : ", JSON.stringify(fragment._byteRange));
  }
  const baseHeader = fragment._byteRange ? {"Range":"bytes=" + fragment._byteRange[0] + "-" + (fragment._byteRange[1] - 1)} : {};
  const originHeaders = fragment._parent?.requestHeaders || {};
  const header_1 = Object.assign({...baseHeader}, originHeaders);
  const header_2 = Object.assign(Object.assign({...baseHeader}, originHeaders), {Referer:null, Origin:null});
  const headersCandidate = [header_1, header_2];
  let lastError = null;
  for (let i = 0; i < retryCount; i++) {
    const headers = headersCandidate[i % headersCandidate.length];
    try {
      const response = await xFetch({url:fragment.url, method:"GET", headers, resultType:"arrayBuffer", timeout});
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        fragment.loaded = buffer.byteLength;
        fragment.autoLevel = false;
        if (i > 0) {
          fragment._parent.requestHeaders = headers;
        }
        return {error:null, data:buffer};
      } else {
        if (_LOGV_) {
          console.log(...logGen("", "fetchFragment", "retry xFetch at fetchFragment , " + (i + 1)));
        }
      }
    } catch (e) {
      if (e.status === 408) {
        return {error:e, data:null};
      }
      if (_LOGV_) {
        console.log(...logGen("", "fetchFragment", "retry xFetch at fetchFragment , " + (i + 1)));
      }
      lastError = e;
    }
    await sleep(1000);
  }
  return {error:lastError, data:null};
};
const downloadSubtitle = async(master, subtitleId, vId) => {
  const subtitle = master.subtitles?.[subtitleId];
  if (subtitle) {
    const loader = new PlayListLoader;
    const result = await loader.load(subtitle.url);
    if (result.status === 300) {
      const scripts = [];
      const init = {method:"GET", mode:"cors", credentials:"include"};
      const fragments = loader.details.fragments;
      const total = fragments.length;
      for (let current = 0; current < total; current++) {
        const f = fragments[current];
        const response = await xFetch({url:f.url, method:"GET"});
        if (response.ok) {
          const vtt = await response.text();
          scripts.push(vtt);
          scripts.push("\n\n");
          await master._tab.sendMessage(CMD_SUBTITLE_PROGRESS, {vId, current, total});
        } else {
          return false;
        }
      }
      const vttBlob = new Blob(scripts, {type:"text/vtt"});
      if (vttBlob) {
        const blobURL = URL.createObjectURL(vttBlob);
        if (blobURL) {
          const a = document.createElement("a");
          a.href = blobURL;
          a.download = (master?._tab?.title || "no_title") + "_" + subtitle.lang + "_" + subtitle.name + ".vtt";
          a.click();
          return true;
        }
      }
    }
  }
  return false;
};
const initLevel = async level => {
  if (level) {
    const details = level.details;
    if (details) {
      if (details.initSegment) {
        const {data, error} = await fetchFragment(details.initSegment);
        details.initSegment.data = error ? null : new Uint8Array(data);
      } else {
        details.initSegment = {data:null};
      }
      const demuxer = new Demuxer(level);
      details.demuxer = demuxer;
      let n = 0, cc = -1;
      for (const fragment of details.fragments) {
        if (cc !== fragment.cc) {
          cc = fragment.cc;
          n = 0;
        }
        fragment._parent = details;
        fragment.demuxer = demuxer;
        fragment._n = n;
        n++;
      }
    }
  }
};
const selectLevel = async(master, params = {}) => {
  const {levels, audioTracks, subtitles, settings, selected_audioLevel} = master;
  let {level, quality, audioLevel} = params;
  const q = quality || settings.quality;
  level = q === QUALITY.LOW ? 0 : q === QUALITY.HIGH ? levels.length - 1 : level || settings.level;
  level = Math.max(0, Math.min(levels.length - 1, level));
  const levelObj = levels[level];
  if (audioLevel === undefined) {
    const suitableAudioTracks = audioTracks.filter(a => a.groupId === levelObj.attrs.AUDIO);
    const defaultTrack = suitableAudioTracks.find(a => a.default) || suitableAudioTracks[0];
    const candidate = audioTracks[selected_audioLevel];
    const audioObj = suitableAudioTracks.includes(candidate) ? candidate : defaultTrack;
    audioLevel = master.audioTracks.indexOf(audioObj);
  }
  audioLevel = Math.max(0, Math.min(audioTracks.length - 1, audioLevel));
  const audioObj = audioTracks[audioLevel];
  if (_LOG_) {
    console.log(...logGen(master._tab.id, "selectLevel", "current - Audio " + selected_audioLevel + " , Video " + settings.level + " ( " + settings.quality + " )"));
    console.log(...logGen(master._tab.id, "selectLevel", "request - " + "Audio " + params?.audioLevel + " , Video " + params?.level + " ( " + quality + " )"));
    console.log(...logGen(master._tab.id, "selectLevel", "result  - Audio " + audioLevel + " , Video " + level));
  }
  if (params.level !== undefined) {
    master.settings.level = level;
    master.settings.quality = quality;
    master.saveSettings();
    if (master.selected_level === level && master.selected_audioLevel === audioLevel) {
      return {status:SELECT_STATUS.CONTINUE};
    }
  }
  await initLevel(levelObj);
  await initLevel(audioObj);
  if (!levelObj?.details) {
    return {status:SELECT_STATUS.ERROR, message:"Failed to init the level of quality, abort."};
  }
  master.setLevel(level, audioLevel);
  master.video?.destroy();
  for (const v of master.archives) {
    v.destroy();
  }
  master.archives = [];
  master.updateUI("level initialized");
  if (levelObj.details.live) {
    (new HLSVideo(master, true)).start().catch(e => {
      if (_LOG_) {
        console.log(...logRED(e.stack));
      }
    });
  } else {
    (new HLSVideo(master)).start().catch(e => {
      if (_LOG_) {
        console.log(...logRED(e.stack));
      }
    });
  }
  return {status:SELECT_STATUS.CHANGED};
};
const consumeQue = async(tab, list) => {
  let mastersList = [];
  const isExist = _url => {
    for (const m of tab.mastersList) {
      if (m.url === _url) {
        return true;
      }
    }
    return false;
  };
  for (const params of list) {
    if (params.processed) {
      continue;
    }
    params.processed = true;
    const referer = params.referer;
    const origin = (referer.match(/https?:\/\/[^\/]+/) || [])[0] || "";
    const requestHeaders = params.header || {"Referer":referer, "Origin":origin};
    const optionalHeaders = params.header ? {"Referer":referer, "Origin":origin} : {};
    let tsReqHeaders;
    const url = URLToolkit.buildAbsoluteURL(referer, params.url, {alwaysNormalize:true});
    if (isExist(url)) {
      continue;
    }
    try {
      const playList = new PlayListLoader;
      let result = await playList.load(url, requestHeaders);
      tsReqHeaders = requestHeaders;
      if (result.status !== 300) {
        result = await playList.load(url, optionalHeaders);
        tsReqHeaders = optionalHeaders;
      }
      if (result.status === 300) {
        if (playList.isMaster) {
          if (!tab.foundMasterIndex) {
            mastersList = [];
            tab.foundMasterIndex = true;
          }
          const master = playList.master;
          const {levels, audioTracks, subtitles} = master;
          mastersList.push(new Master(tab, url, levels, audioTracks, subtitles));
          for (const level of [...levels, ...audioTracks]) {
            if (!level.url) {
              continue;
            }
            const tmpUrl = typeof level.url === "string" ? level.url : level.url[0];
            const subListUrl = URLToolkit.buildAbsoluteURL(referer, tmpUrl, {alwaysNormalize:true});
            const subList = new PlayListLoader;
            result = await subList.load(subListUrl, requestHeaders);
            tsReqHeaders = requestHeaders;
            if (result.status !== 300) {
              result = await subList.load(subListUrl, optionalHeaders);
              tsReqHeaders = optionalHeaders;
            }
            if (result.status === 300) {
              if (subList.isLevelDetail) {
                level.details = subList.details;
                level.details.requestHeaders = tsReqHeaders;
              } else {
                if (_LOGV_) {
                  console.log("Skip error at subList.load", subListUrl, result.status);
                }
              }
            }
          }
        } else {
          if (playList.isLevelDetail && !tab.foundMasterIndex) {
            const level = {attrs:{}, audioCodec:null, videoCodec:null, width:0, height:0, bitrate:0, details:playList.details, url};
            level.details.requestHeaders = tsReqHeaders;
            mastersList.push(new Master(tab, url, level));
          }
        }
      } else {
        if (_LOGV_) {
          console.log("Skip error at playList.load", url, result.status, result.message);
        }
      }
    } catch (e) {
      if (_LOG_) {
        console.log(...logRED(e.stack || e.message || e));
      }
    }
  }
  return mastersList;
};
class Video {
  constructor(master, isLive, sourceType) {
    this._master = master;
    this.settings = Object.assign({}, master.settings);
    this.vId = Math.floor(Math.random() * 100000000);
    this.sourceType = sourceType;
    this.tracks = [];
    this.index = {};
    this.size = 0;
    this.isPreviewed = false;
    this.isLive = isLive;
    this.hasAltAudio = false;
    this._master.video = this;
    this.mId = master.mId;
    this.stat = VIDEO_STATUS.PAUSE;
    this.blobURL = null;
    this.dateLabel = getTimeStampLabel();
  }
  async load() {
    this.stat = VIDEO_STATUS.LOADING;
    this._master._tab.sendMessage(CMD_UPDATE_UI, {vId:this.vId, action:VIDEO_STATUS.LOADING});
  }
  async pause(message) {
    this.stat = VIDEO_STATUS.PAUSE;
    this._master._tab.sendMessage(CMD_UPDATE_UI, {vId:this.vId, action:VIDEO_STATUS.PAUSE, message});
  }
  complete() {
    this.stat = VIDEO_STATUS.COMPLETE;
    this._master.archives.push(this);
  }
  destroy() {
    if (this.blobURL) {
      URL.revokeObjectURL(this.blobURL);
      delete resources.url[this.blobURL];
      this.blobURL = null;
    }
    this.stat = VIDEO_STATUS.DESTROY;
    if (this._master.video === this) {
      this._master.video = null;
    }
    this._master._tab.sendMessage(CMD_UPDATE_UI, {vId:this.vId, action:VIDEO_STATUS.DESTROY});
    if (_LOG_) {
      console.log(...logGen(this._master._tab.id, "video.destroy", "vId : " + this.vId));
    }
  }
  updateQualityLabel() {
    let vq = "", aq = "";
    for (const track of this.tracks) {
      if (track?.mimetype?.includes("video")) {
        vq = track.quality;
      }
      if (track?.mimetype?.includes("audio")) {
        aq = track.quality;
      }
    }
    this.quality = vq + (vq !== "" ? " - " : "") + aq;
  }
  async updateUI(signature) {
    const ignore = ["demuxer", "data", "fragments", "moofs", "mdats", "rootBox", "parent"];
    await this._master._tab.sendMessage(CMD_UPDATE_VIDEO, {signature, video:SafeStringify(this, ignore)});
  }
  async updateProgress(progress) {
    const duration = this.tracks[0]?.duration;
    await this._master._tab.sendMessage(CMD_UPDATE_VIDEO_PROGRESS, {vId:this.vId, size:this.size, duration, quality:this.quality, progress});
  }
  async flush() {
    if (this.stat !== VIDEO_STATUS.DESTROY) {
      const url = await flush(this);
      if (url) {
        if (this.blobURL) {
          URL.revokeObjectURL(this.blobURL);
          delete resources.url[this.blobURL];
        }
        this.blobURL = url;
        await this._master._tab.sendMessage(CMD_FLUSHED, {vId:this.vId, p:"flush"});
        return true;
      }
    }
    return false;
  }
  async createPreviewOnce(n) {
    if (!this.isPreviewed) {
      n = n || 0;
      for (const track of this.tracks) {
        if (track.init && track.mimetype.includes("video") && track.moofs.length > n && track.mdats.length > n) {
          this.isPreviewed = true;
          const url = await flush(this);
          if (url) {
            await this._master._tab.sendMessage(CMD_FLUSHED, {vId:this.vId, url, p:"preview"});
            URL.revokeObjectURL(url);
            delete resources.url[url];
          } else {
            this.isPreviewed = false;
          }
          break;
        }
      }
    }
  }
  getTrackByType(type) {
    if (this.index[type] === undefined) {
      this.index[type] = this.tracks.length;
      this.tracks.push({init:null, moofs:[], mdats:[], start:[], durations:[], duration:0, mimetype:type, quality:""});
    }
    return this.tracks[this.index[type]];
  }
  getTrackByNumber(n) {
    for (const track of this.tracks) {
      if (track.init?.root?.moov?.trak?.tkhd?.trackID === n) {
        return track;
      }
    }
    return null;
  }
  clearAllTracks() {
    for (const t of this.tracks) {
      this.clearTrack(t);
    }
  }
  clearTrack(track) {
    track.moofs = [];
    track.mdats = [];
    track.start = [];
    track.durations = [];
    track.duration = 0;
  }
  get qualityLabel() {
    let vq = "", aq = "";
    for (const track of this.tracks) {
      if (track.init) {
        if (track.mimetype.includes("video")) {
          vq = track.quality;
        }
        if (track.mimetype.includes("audio")) {
          aq = track.quality;
        }
      }
    }
    return vq + (vq !== "" ? " - " : "") + aq;
  }
  assign(params) {
    for (const key in params) {
      this[key] = params[key];
    }
  }
}
class HLSVideo extends Video {
  constructor(master, isLive, video) {
    super(master, isLive, SOURCE_TYPE.TS);
    this.isLive = isLive;
    this.contig = false;
    this.parallel_max = 1;
    if (video) {
      this.inherit(video);
    }
    this.updateUI("new_hlsvideo");
  }
  inherit(video) {
    const {tracks, index, isLive} = video;
    const newTracks = [];
    for (const track of tracks) {
      const {mimetype, init} = track;
      newTracks.push({mimetype, init, moofs:[], mdats:[], start:[], durations:[]});
    }
    this.tracks = newTracks;
    this.index = index;
    this.isLive = isLive;
  }
  async start() {
    super.load();
    if (this.isLive) {
      liveLoader(this, true);
      await liveLoader(this);
    } else {
      await hlsLoader(this);
    }
  }
  async wait() {
    return new Promise((resolve, reject) => {
      if (this.stat === VIDEO_STATUS.LOADING) {
        return resolve();
      } else {
        if (this.stat === VIDEO_STATUS.DESTROY) {
          return reject({message:"receive VIDEO_STATUS.DESTORY"});
        }
      }
      this.pauseResolver = resolve;
    });
  }
  async destroy() {
    super.destroy();
    if (this.destroyFunc) {
      this.destroyFunc();
    }
    if (this.destroyFunc_audio) {
      this.destroyFunc_audio();
    }
    this.destroyFunc = this.destroyFunc_audio = null;
  }
}
class CapturedVideo extends Video {
  constructor(master, mediasourceid, src) {
    super(master, true, SOURCE_TYPE.MEDIASTREAM);
    if (src) {
      const {tracks, index} = src;
      this.assign({tracks, index});
    }
    this.mediasourceid = mediasourceid;
    this.updateUI("new_capturedvideo");
  }
}
const Master = class {
  constructor(tab, url, levels, audioTracks, subtitles, mId = null) {
    this._tab = tab;
    this.mId = mId || Math.floor(Math.random() * 100000000);
    this.url = url;
    this.levels = levels instanceof Array ? levels : levels ? [levels] : [];
    this.audioTracks = audioTracks instanceof Array ? audioTracks : audioTracks ? [audioTracks] : [];
    this.subtitles = subtitles instanceof Array ? subtitles : subtitles ? [subtitles] : [];
    this.video = null;
    this.archives = [];
    this.settings = Object.assign({}, tab.settings);
    this.selected_level = this.settings.level;
    this.selected_audioLevel = null;
  }
  async updateUI(signature) {
    const ignore = ["demuxer", "data", "fragments", "moofs", "mdats", "rootBox", "parent"];
    await this._tab.sendMessage(CMD_UPDATE_MASTER, {master:SafeStringify(this, ignore), signature});
  }
  setLevel(levelNum, audioLevelNum) {
    this.selected_level = levelNum;
    this.selected_audioLevel = audioLevelNum;
  }
  getLevel() {
  }
  saveSettings() {
    const domain = URLUtils.domain(this._tab.url);
    const cur = option.domain[domain];
    const quality = this.settings.quality;
    const level = this.settings.level;
    const mode = this._tab.mode;
    if (!cur || cur.quality !== quality || cur.level !== level || cur.mode !== mode) {
      option.domain[domain] = {quality, level, mode};
      saveOption(option);
    }
  }
};
const Tab = class {
  constructor(params) {
    this.id = params.id;
    this.parentTabId = params.parentTabId;
    this.url = params.url || "";
    this.title = params.title || "no-title";
    this.mode = TAB_MODE.NORMAL;
    this.foundMasterIndex = false;
    this.mastersList = [];
    this.origin = (this.url.match(/https?:\/\/[^\/]+/) || [])[0] || "noOrigin";
    const domain = URLUtils.domain(this.url);
    const domainSpec = option.domain[domain] || {};
    this.settings = Object.assign({level:0, quality:QUALITY.HIGH, mode:TAB_MODE.NORMAL}, domainSpec);
  }
  get isLoader() {
    return this.parentTabId;
  }
  async consume(que) {
    const newList = await consumeQue(this, que);
    newList.forEach(m => selectLevel(m));
    this.mastersList.push(...newList);
  }
  sendMessage(cmd, params) {
    internalMessage({cmd, params});
  }
  findMaster(mId) {
    return this.mastersList.find(m => m.mId === mId);
  }
  findVideo(vId) {
    for (const m of this.mastersList) {
      if (m.video?.vId === vId) {
        return {master:m, video:m.video};
      }
      for (const a of m.archives) {
        if (a.vId === vId) {
          return {master:m, video:a};
        }
      }
    }
    return {master:null, video:null};
  }
};
Object.assign(Tab, {TAB_ID:0, PARENT_ID:1, CHILD_ID:2});
WebExtensions.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const {cmd, params} = message;
  if (_LOG_) {
    console.log(...logGen(TAB?.id, "onMessage", cmd));
  }
  if (cmd === CMD_UPDATE_INDEX) {
    const {type, que} = params;
    TAB.consume(que);
  } else {
    if (cmd === CMD_INTERCEPT_ONDATA) {
      intercept_onData(TAB, params);
    }
  }
  sendResponse({result:true});
});
const internalUIMessage = async msg => {
  const {cmd, params} = msg;
  const tab = TAB;
  const sendResponse = r => r;
  if (cmd === CMD_SELECT_OPTION) {
    const {mId} = params;
    const master = tab.findMaster(mId);
    if (master) {
      const result = await selectLevel(master, params);
      return sendResponse(result);
    } else {
      return sendResponse({status:SELECT_STATUS.ERROR, message:"Internal error at CMD_SELECT_OPTION. Please tell the message to the developer."});
    }
  } else {
    if (cmd === CMD_RESUME) {
      const {vId} = params;
      const {master, video} = tab.findVideo(vId);
      if (video) {
        if (video.pauseResolver) {
          video.pauseResolver();
          video.pauseResolver = null;
        }
        video.load();
      }
      return sendResponse();
    } else {
      if (cmd === CMD_PAUSE) {
        const {vId} = params;
        const {master, video} = tab.findVideo(vId);
        if (video) {
          video.pause();
        }
        return sendResponse();
      } else {
        if (cmd === CMD_CANCEL) {
          const {vId} = params;
          const {master, video} = tab.findVideo(vId);
          if (video) {
            video.destroy();
          }
          return sendResponse();
        } else {
          if (cmd === CMD_SAVE) {
            const {master, video} = tab.findVideo(params.vId);
            if (video) {
              const save = url => {
                const a = document.createElement("a");
                a.href = url;
                a.download = (video?._master?._tab?.title || "no-title") + (video.isLive ? video.dateLabel : "") + ".mp4";
                a.click();
              };
              if (video.blobURL) {
                save(video.blobURL);
              } else {
                const blobURL = await flush(video);
                save(blobURL);
                URL.revokeObjectURL(blobURL);
                delete resources.url[blobURL];
              }
            }
            return sendResponse();
          } else {
            if (cmd === CMD_DOWNLOAD_SUBTITLE) {
              const {subtitle, mId, vId} = params;
              const master = tab.findMaster(mId);
              if (master) {
                const result = await downloadSubtitle(master, subtitle, vId);
                return sendResponse(result);
              }
              return sendResponse();
            } else {
              if (cmd === CMD_SET_PARALLEL) {
                const {vId, parallel_max} = params;
                const {master, video} = tab.findVideo(vId);
                if (video) {
                  video.parallel_max = Math.min(6, Math.max(1, parallel_max));
                }
                return sendResponse();
              }
            }
          }
        }
      }
    }
  }
};
"use strict";
const sendMessageToMain = internalUIMessage;
const qualityLabel = video => {
  let vq = "", aq = "";
  if (video) {
    for (const track of video.tracks) {
      if (track.init) {
        if (track.mimetype.includes("video")) {
          vq = track.quality;
        }
        if (track.mimetype.includes("audio")) {
          aq = track.quality;
        }
      }
    }
  }
  return vq + (vq !== "" ? " - " : "") + aq;
};
class VideoUI {
  constructor(vobj, flushFunc) {
    const {vId, settings} = vobj;
    this.vId = vId;
    this.settings = settings;
    const container = document.createElement("div");
    const template = document.getElementById("VideoTemplate_v15").innerHTML;
    container.innerHTML = template;
    const videos = document.getElementById("videos");
    videos.appendChild(container);
    this.container = container;
    this.loading = true;
    this.size = 0;
    this.duration = 0;
    const saveRequest = async() => {
      if (this.saveButton.classList.contains("disabled")) {
        return;
      }
      this.saveButton.classList.add("disabled");
      this.saveButton.classList.add("loading");
      if (this.loading) {
        if (flushFunc) {
          await flushFunc();
        }
      }
      await sendMessageToMain({cmd:CMD_SAVE, params:{vId}});
      await sleep(1000);
      this.saveButton.classList.remove("disabled");
      this.saveButton.classList.remove("loading");
    };
    this.saveButton.addEventListener("click", saveRequest);
    this.forceRenderLink.addEventListener("click", saveRequest);
    const cancelRequest = async() => {
      await sendMessageToMain({cmd:CMD_CANCEL, params:{vId}});
    };
    this.closeButton.addEventListener("click", cancelRequest);
    this.errorLabel.innerHTML = "&nbsp;";
    const v = this.video;
    v._mouseEvents = {enter:() => {
      if (v.src) {
        v.controls = true;
      }
    }, leave:() => {
      if (v.src) {
        v.controls = false;
      }
    }};
    v.addEventListener("mouseover", v._mouseEvents.enter);
    v.addEventListener("mouseout", v._mouseEvents.leave);
    this.dateLabel = getTimeStampLabel();
    this.titleLabel.innerText = TAB.title;
    this.titleLink.title = TAB.title;
    this.titleLink.href = TAB.url;
    this.doneInit = {};
  }
  start() {
  }
  pause() {
  }
  update() {
  }
  update_subtitleProgress() {
  }
  get video() {
    return this.container.querySelector("video");
  }
  get progress() {
    return this.container.querySelector("progress");
  }
  get loadCtrls() {
    return this.container.querySelectorAll(".loadCtrls");
  }
  get downloadLink() {
    return this.container.querySelector(".donwloadLink");
  }
  get stopButton() {
    return this.container.querySelector(".stopButton");
  }
  get startButton() {
    return this.container.querySelector(".startButton");
  }
  get saveButton() {
    return this.container.querySelector(".saveButton");
  }
  get closeButton() {
    return this.container.querySelector(".closeButton");
  }
  get forceRenderLink() {
    return this.container.querySelector(".forceRenderLink");
  }
  get titleLabel() {
    return this.container.querySelector(".titleLabel");
  }
  get titleLink() {
    return this.container.querySelector(".titleLink");
  }
  get sizeLabel() {
    return this.container.querySelector(".sizeLabel");
  }
  get durationLabel() {
    return this.container.querySelector(".durationLabel");
  }
  get progressLabel() {
    return this.container.querySelector(".progressLabel");
  }
  get qualityLabel() {
    return this.container.querySelector(".qualityLabel");
  }
  get subtitleSelectLabel() {
    return this.container.querySelector(".subtitleSelectLabel");
  }
  get subtitleProgress() {
    return this.container.querySelector(".subtitleProgress");
  }
  get audioSelectLabel() {
    return this.container.querySelector(".audioSelectLabel");
  }
  get qualitySelectLabel() {
    return this.container.querySelector(".qualitySelectLabel");
  }
  get boostLabel() {
    return this.container.querySelector(".boostLabel");
  }
  get errorLabel() {
    return this.container.querySelector(".errorLabel");
  }
  get statusLabel() {
    return this.container.querySelector(".statusLabel");
  }
  addSize(v) {
    this.setSize(this.size + v);
  }
  setSize(sz) {
    this.size = sz;
    const s = getUnit(this.size);
    this.sizeLabel.innerText = s.value + " " + UNITS[s.unitIdx];
  }
  addDuration(d) {
    this.setDuration(this.duration + d);
  }
  setDuration(d) {
    this.duration = d;
    this.durationLabel.innerText = this.getDurationString();
  }
  getDurationString() {
    return String(Math.trunc(this.duration / 60)) + ":" + String(Math.trunc(this.duration % 60)).padStart(2, "0");
  }
  setQuality(q) {
    this.qualityLabel.innerHTML = q;
  }
  setWarn(e) {
    this.errorLabel.innerHTML = e;
    this.errorLabel.style.display = "inline";
  }
  setError(e) {
    this.errorLabel.innerHTML = e;
    this.errorLabel.style.display = "inline";
    const tryCaptureLink = this.errorLabel.querySelector(".tryCapture");
    if (tryCaptureLink) {
      tryCaptureLink.addEventListener("click", () => {
        document.getElementById("forceCaptureButton").click();
      });
    }
    this.progress.style.background = COLOR.RED.content;
    this.stopButton.classList.add("disabled");
    if (!document.title.includes("!")) {
      document.title = "! " + document.title;
    }
  }
  setStatus(label, color) {
    if (color !== undefined) {
      this.statusLabel.style.background = color;
    }
    if (label !== undefined) {
      this.statusLabel.innerText = label;
    }
  }
  showControl(v) {
    this.loadCtrls.forEach(c => {
      c.style.display = v ? "inline" : "none";
    });
  }
  showSaveButton(v) {
    this.saveButton.style.display = v ? "inline" : "none";
  }
  showCloseButton(v) {
    this.closeButton.style.display = v ? "inline" : "none";
  }
  terminate() {
    const color = COLOR.GREEN;
    this.setStatus("RECORDED", color.content);
    this.progress.setAttribute("value", 0);
    this.progress.style.background = color.content;
    this.saveButton.style.background = color.content;
    this.saveButton.style.borderColor = color.border;
    this.loading = false;
    this.showControl(false);
    this.showSaveButton(true);
  }
  removeSelf() {
    const videos = document.getElementById("videos");
    if (videos && videos.contains(this.container)) {
      videos.removeChild(this.container);
      sendMessageToMain({cmd:CMD_CANCEL, params:{vId:this.vId}});
    }
  }
  setMessage(on, message) {
    if (on === "title") {
      document.title = message;
    } else {
      if (on === "warn") {
        this.setWarn(message);
      } else {
        if (on === "error") {
          this.setError(message);
        }
      }
    }
  }
  setQualityOptionByMaster(master) {
    const setSelector_subtitle = (target, selector) => {
      target.addEventListener("click", async() => {
        try {
          if (this.loadingSubs) {
            return;
          }
          const params = await selector(master);
          this.loadingSubs = true;
          params.vId = this.vId;
          params.mId = master.mId;
          this.subtitleProgress.style.display = "block";
          this.subtitleProgress.value = 0;
          this.subtitleProgress.max = 0;
          const result = await sendMessageToMain({cmd:CMD_DOWNLOAD_SUBTITLE, params});
          this.subtitleProgress.style.display = "none";
          this.loadingSubs = false;
          if (result.status === SELECT_STATUS.ERROR) {
            this.setError(result.message);
          }
        } catch (e) {
          console.log(...logRED(e?.stack || e));
        }
      });
    };
    const setSelector = (target, selector) => {
      target.addEventListener("click", async() => {
        this.stopButton.click();
        this.forceRenderLink.style.display = "none";
        try {
          const params = {};
          const selected = await selector(master);
          if (selected.level != null) {
            const {quality, level, audioLevel} = getSuitableAudioLevel(selected.quality, selected.level, master);
            Object.assign(params, {quality, level, audioLevel});
          } else {
            params.audioLevel = selected.audioLevel;
          }
          const defaultParams = {level:master.settings.level, quality:master.settings.quality, audioLevel:master._suitable_audio_level, mId:master.mId};
          const result = await sendMessageToMain({cmd:CMD_SELECT_OPTION, params:Object.assign(defaultParams, params)});
          if (result.status === SELECT_STATUS.CONTINUE) {
            this.startButton.click();
            if (result.message) {
              this.setWarn(result.message);
            }
          } else {
            if (result.status === SELECT_STATUS.ERROR) {
              this.setError(result.message);
            }
          }
        } catch (e) {
          if (e?.message === "cancelled") {
            this.startButton.click();
          } else {
            console.log(...logRED(e?.stack || e));
          }
        }
      });
    };
    const getSuitableLevel = (quality, level, master) => {
      const {levels, settings} = master;
      level = quality === QUALITY.LOW ? 0 : quality === QUALITY.HIGH ? levels.length - 1 : level || settings.level;
      level = Math.max(0, Math.min(levels.length - 1, level));
      const levelObj = levels[level];
      return {level, levelObj};
    };
    const getSuitableAudioLevel = (quality, lv, master) => {
      const {audioTracks, selected_audioLevel} = master;
      const {level, levelObj} = getSuitableLevel(quality, lv, master);
      const suitableAudioTracks = audioTracks.filter(a => a.groupId === levelObj.attrs.AUDIO);
      const defaultTrack = suitableAudioTracks.find(a => a.default) || suitableAudioTracks[0];
      const candidate = audioTracks[selected_audioLevel];
      const audioObj = suitableAudioTracks.includes(candidate) ? candidate : defaultTrack;
      let audioLevel = audioTracks.indexOf(audioObj);
      audioLevel = Math.max(0, Math.min(audioTracks.length - 1, audioLevel));
      return {quality, level, levelObj, suitableAudioTracks, audioLevel, audioObj};
    };
    const updateAudioOption = () => {
    };
    const hasQualityOption = master.levels.length > 1;
    if (hasQualityOption) {
      this.qualitySelectLabel.innerHTML = i18n.getMessage("quality") + '&nbsp;-&nbsp;<a href="javascript:void(0)">' + i18n.getMessage(this.settings.quality) + "</a>";
      this.qualitySelectLabel.style.display = "inline";
      setSelector(this.qualitySelectLabel, selectLevelModal);
    } else {
      this.qualitySelectLabel.innerHTML = i18n.getMessage("quality") + "&nbsp;-&nbsp;( no option )";
    }
    const {quality, level} = master.settings;
    const {level:actualLevel, suitableAudioTracks, audioLevel, audioObj} = getSuitableAudioLevel(quality, level, master);
    master._suitable_audio_tracks = suitableAudioTracks;
    master._suitable_audio_level = audioLevel;
    const hasAudioOption = suitableAudioTracks.length > 1;
    if (hasAudioOption) {
      const tag = audioObj.lang || audioObj.name;
      this.audioSelectLabel.innerHTML = i18n.getMessage("audio") + '&nbsp;-&nbsp;<a href="javascript:void(0)">' + tag + "</a>";
      this.audioSelectLabel.style.display = "inline";
      setSelector(this.audioSelectLabel, selectAudioModal);
    }
    const hasSubtitle = master.subtitles.length > 0;
    if (hasSubtitle) {
      this.subtitleSelectLabel.innerHTML = i18n.getMessage("subtitle");
      this.subtitleSelectLabel.style.display = "inline";
      setSelector_subtitle(this.subtitleSelectLabel, selectSubtitleModal);
    }
  }
}
class HLSUI extends VideoUI {
  constructor(vobj, flushFunc) {
    super(vobj, flushFunc);
    const {vId, settings} = vobj;
    this.setStatus("HLS");
    this.durationLabel.style.display = "none";
    this.progressLabel.style.display = "inline";
    this.isBoosting = false;
    this.boostLabel.style.display = "inline";
    this.boostLabel.addEventListener("click", () => {
      this.isBoosting = !this.isBoosting;
      this.boostLabel.style.setProperty("color", this.isBoosting ? "#f88" : "");
      const parallel_max = Math.max(1, Math.min(6, this.isBoosting ? Number(localStorage["parallel"]) || 3 : 1));
      sendMessageToMain({cmd:CMD_SET_PARALLEL, params:{vId, parallel_max}});
    });
    showImportantNotice("hls");
    this.startButton.addEventListener("click", async() => {
      await sendMessageToMain({cmd:CMD_RESUME, params:{vId}});
    });
    this.stopButton.addEventListener("click", async() => {
      await sendMessageToMain({cmd:CMD_PAUSE, params:{vId}});
    });
    const master = masters[vobj.mId];
    if (master) {
      this.setQualityOptionByMaster(master);
    }
  }
  start() {
    this.startButton.classList.add("disabled");
    this.stopButton.classList.remove("disabled");
    this.forceRenderLink.style.display = "none";
    this.progress.style.removeProperty("background");
    this.errorLabel.innerHTML = "&nbsp;";
    document.title = document.title.replace("! ", "");
  }
  pause(message) {
    this.startButton.classList.remove("disabled");
    this.stopButton.classList.add("disabled");
    this.forceRenderLink.style.display = "inline";
    if (message) {
      this.setError(message);
    }
  }
  update_videoProgress(params) {
    const {size, duration, quality, progress} = params;
    const {max, current, offset} = progress;
    this.setSize(size);
    this.setQuality(quality);
    this.progress.max = max;
    this.progress.value = current;
    this.progressLabel.innerText = current + " / " + max;
    document.title = current + offset + " / " + (max + offset) + " - " + i18n.getMessage("title_loading");
  }
  update_subtitleProgress(params) {
    this.subtitleProgress.value = params.current + 1;
    this.subtitleProgress.max = params.total;
  }
}
class LiveUI extends VideoUI {
  constructor(vobj, flushFunc) {
    super(vobj, flushFunc);
    this.setStatus("LIVE", COLOR.RED.content);
    this.showControl(false);
    this.showSaveButton(true);
    this.showCloseButton(true);
    this.statusLabel.style.marginTop = "8px";
    this.boostLabel.style.display = "none";
    showImportantNotice("live");
    const master = masters[vobj.mId];
    if (master) {
      this.setQualityOptionByMaster(master);
    }
  }
  update_videoProgress(params) {
    const {size, duration, quality} = params;
    this.setSize(size);
    this.setQuality(quality);
    this.setDuration(duration || 0);
    document.title = this.durationLabel.innerText + " - " + i18n.getMessage("title_recording");
  }
}
class CaptureUI extends VideoUI {
  constructor(vobj, flushFunc) {
    super(vobj, flushFunc);
    this.setStatus("REC", COLOR.RED.content);
    this.showControl(false);
    this.showSaveButton(true);
    this.boostLabel.style.display = "none";
    showImportantNotice("capture");
    document.getElementById("waitingData").style.display = "block";
    this.success = false;
  }
  update_videoProgress(params) {
    const {size, duration, quality} = params;
    if (!this.success) {
      document.getElementById("waitingData").style.display = "none";
      this.success = true;
    }
    this.setSize(size);
    this.setQuality(quality);
    this.setDuration(duration);
    document.title = this.durationLabel.innerText + " - " + i18n.getMessage("title_recording");
  }
}
const selectLevelModal = master => {
  const {levels, settings} = master;
  return new Promise((resolve, reject) => {
    const container = document.createElement("div");
    container.innerHTML = document.getElementById("selectLevelModalTemplate_v15").innerHTML;
    document.body.appendChild(container);
    const modal = container.querySelector("div");
    const removeSelf = () => {
      document.body.removeChild(container);
    };
    const radios = modal.querySelectorAll('input[name="level"]');
    const select = modal.querySelector("select");
    const prevQuality = settings.quality;
    const prevLevel = settings.level;
    for (let i = 0, len = levels.length; i < len; i++) {
      const level = levels[i];
      const bitrate = level.attrs["BANDWIDTH"];
      const resolution = level.attrs["RESOLUTION"];
      const option = document.createElement("option");
      const label = (resolution ? resolution + " , " : "") + (bitrate ? bitrate + " bps" : "");
      option.setAttribute("value", i);
      option.innerHTML = label;
      if (i === prevLevel) {
        option.selected = true;
      }
      select.appendChild(option);
    }
    const clickHandler = evt => {
      const value = evt.target.value;
      if (value === QUALITY.CUSTOM) {
        select.classList.remove("disabled");
      } else {
        select.classList.add("disabled");
      }
    };
    for (const r of radios) {
      r.addEventListener("click", clickHandler);
    }
    for (const radio of document.querySelectorAll('input[name="level"]')) {
      if (radio.value === prevQuality) {
        radio.click();
      }
    }
    const closeButton = modal.querySelector(".close-modal");
    const _close = () => {
      reject({message:"cancelled"});
      removeSelf();
    };
    closeButton.addEventListener("click", _close);
    const okButton = modal.querySelector("button");
    const _ok = () => {
      const checked = document.querySelector('input:checked[name="level"]');
      if (checked) {
        const quality = checked.value;
        if (quality === QUALITY.HIGH) {
          resolve({level:levels.length - 1, quality});
        } else {
          if (quality === QUALITY.LOW) {
            resolve({level:0, quality});
          } else {
            resolve({level:select.selectedIndex, quality});
          }
        }
      } else {
        resolve({level:0, quality:QUALITY.LOW});
      }
      removeSelf();
    };
    okButton.addEventListener("click", _ok);
    modal.classList.add("active");
  });
};
const selectAudioModal = master => {
  const {audioTracks, _suitable_audio_tracks, _suitable_audio_level} = master;
  const currentRadioValue = _suitable_audio_tracks.indexOf(audioTracks[_suitable_audio_level]);
  return new Promise((resolve, reject) => {
    const container = document.createElement("div");
    container.innerHTML = document.getElementById("selectAudioModalTemplate_v15").innerHTML;
    document.body.appendChild(container);
    const modal = container.querySelector("div");
    const removeSelf = () => {
      document.body.removeChild(container);
    };
    const group = modal.querySelector(".form-group");
    const radio = modal.querySelector(".radioTemplate").innerHTML;
    for (let i = 0, len = _suitable_audio_tracks.length; i < len; i++) {
      const audio = _suitable_audio_tracks[i];
      const {audioCodec, lang, name, details} = audio;
      const duration = details.totalduration;
      const value = i;
      const label = `[ ${lang} ]  ${name} ( ${audioCodec} )`;
      const tooltip = "Duration : " + String(Math.trunc(duration / 60)) + ":" + String(Math.trunc(duration % 60)).padStart(2, "0");
      const div = document.createElement("div");
      div.innerHTML = radio.replace(/\$value/, value).replace(/\$label/, label).replace(/\$tooltip/, tooltip);
      if (i == currentRadioValue) {
        div.querySelector("input").checked = true;
      }
      group.appendChild(div);
    }
    const closeButton = modal.querySelector(".close-modal");
    const _close = () => {
      reject({message:"cancelled"});
      removeSelf();
    };
    closeButton.addEventListener("click", _close);
    const okButton = modal.querySelector("button");
    const _ok = () => {
      const checked = modal.querySelector('input:checked[name="audios"]');
      if (checked) {
        const checkedLevel = Number(checked.value);
        const suitableObj = _suitable_audio_tracks[checkedLevel];
        const exactAudioLevel = audioTracks.indexOf(suitableObj);
        resolve({audioLevel:exactAudioLevel});
      } else {
        resolve({audioLevel:0});
      }
      removeSelf();
    };
    okButton.addEventListener("click", _ok);
    modal.classList.add("active");
  });
};
const selectSubtitleModal = master => {
  const {subtitles} = master;
  return new Promise((resolve, reject) => {
    const container = document.createElement("div");
    container.innerHTML = document.getElementById("selectSubtitleModalTemplate_v15").innerHTML;
    document.body.appendChild(container);
    const modal = container.querySelector("div");
    const removeSelf = () => {
      document.body.removeChild(container);
    };
    const select = modal.querySelector("select");
    for (let i = 0, len = subtitles.length; i < len; i++) {
      const {lang, name} = subtitles[i];
      const option = document.createElement("option");
      const label = `[ ${lang} ]  ${name}`;
      option.setAttribute("value", i);
      option.innerHTML = label;
      select.appendChild(option);
    }
    const closeButton = modal.querySelector(".close-modal");
    const _close = () => {
      reject({message:"cancelled"});
      removeSelf();
    };
    closeButton.addEventListener("click", _close);
    const okButton = modal.querySelector("button");
    const _ok = () => {
      resolve({subtitle:select.selectedIndex});
      removeSelf();
    };
    okButton.addEventListener("click", _ok);
    modal.classList.add("active");
  });
};
const showImportantNotice = type => {
  document.getElementById("important_hls").style.display = "none";
  document.getElementById("important_live").style.display = "none";
  document.getElementById("important_capture").style.display = type === "capture" ? "inline" : "none";
};
"use strict";
let TAB = null;
const masters = {};
const videos = {};
const sendMessage = obj => {
  if (_LOG_) {
    console.log(...logGen(TAB?.id, "sendMessage", JSON.stringify(obj)));
  }
  return new Promise((resolve, reject) => {
    try {
      WebExtensions.runtime.sendMessage(obj, result => {
        if (WebExtensions.runtime.lastError) {
          console.log("chrome.runtime.lastError", WebExtensions.runtime.lastError.message);
        }
        resolve(result);
      });
    } catch (e) {
    }
  });
};
const setLabelColor = isNormal => {
  const f = isNormal ? ["remove", "add"] : ["add", "remove"];
  const nl = document.getElementById("runAsNormalLabel");
  if (nl) {
    nl.classList[f[0]]("text-gray");
  }
  const cl = document.getElementById("forceCaptureLabel");
  if (cl) {
    cl.classList[f[1]]("text-gray");
  }
};
const set_mode = (mode, force) => {
  if (TAB.mode !== mode || force) {
    if (_LOG_) {
      console.log(...logGen(TAB?.id, "set_mode", mode));
    }
    TAB.mode = mode;
    remove_all();
    clear_waiting_label();
    const label = document.querySelector(mode === TAB_MODE.CAPTURE ? "#waitingData" : "#waitingHLS");
    if (label) {
      label.style.display = "block";
    }
  }
  setLabelColor(mode == TAB_MODE.NORMAL);
};
const remove_all = () => {
  if (_LOG_) {
    console.log(...logGen(TAB?.id, "remove_all", "remove all videoUIs"));
  }
  for (const k in masters) {
    delete masters[k];
  }
  for (const k in videos) {
    const ui = videos[k];
    ui.removeSelf();
    delete videos[k];
  }
};
const update_master = master => {
  const mId = master?.mId;
  if (mId) {
    masters[mId] = master;
  }
};
const clear_waiting_label = () => {
  const waitingHLSLabel = document.querySelector("#waitingHLS");
  if (waitingHLSLabel && waitingHLSLabel.style.display !== "none") {
    waitingHLSLabel.style.display = "none";
  }
  const waitingData = document.querySelector("#waitingData");
  if (waitingData && waitingData.style.display !== "none") {
    waitingData.style.display = "none";
  }
};
const update_video = video => {
  clear_waiting_label();
  const vId = video?.vId;
  if (vId) {
    let ui = videos[vId];
    if (!ui) {
      if (video.isLive) {
        if (video.sourceType === SOURCE_TYPE.TS) {
          ui = new LiveUI(video);
        } else {
          ui = new CaptureUI(video);
        }
      } else {
        ui = new HLSUI(video);
      }
      videos[vId] = ui;
    }
  }
};
const internalMessage = (message, sender, sendResponse) => {
  const {cmd, params} = message;
  if (!sendResponse) {
    sendResponse = () => {
    };
  }
  if (cmd !== CMD_UPDATE_VIDEO_PROGRESS) {
    if (_LOG_) {
      console.log(...logGen(TAB?.id, "internalMessage(received)", cmd));
    }
  }
  if (cmd === CMD_UPDATE_MASTER) {
    const master = JSON.parse(params.master);
    update_master(master);
  } else {
    if (cmd === CMD_UPDATE_VIDEO) {
      const video = JSON.parse(params.video);
      update_video(video);
    } else {
      if (cmd === CMD_UPDATE_VIDEO_PROGRESS) {
        const ui = videos[params.vId];
        if (ui) {
          ui.update_videoProgress(params);
        }
      } else {
        if (cmd === CMD_UPDATE_UI) {
          const {vId, action, message} = params;
          const ui = videos[vId];
          if (ui) {
            if (action === VIDEO_STATUS.LOADING) {
              ui.start();
            } else {
              if (action === VIDEO_STATUS.PAUSE) {
                ui.pause(message);
              } else {
                if (action === VIDEO_STATUS.DESTROY) {
                  ui.removeSelf();
                  delete videos[vId];
                }
              }
            }
          }
        } else {
          if (cmd === CMD_FLUSHED) {
            const {vId, url} = params;
            const ui = videos[vId];
            if (url) {
              fetch(url).then(response => {
                return response.blob();
              }).then(blob => {
                if (ui) {
                  ui.video.src = URL.createObjectURL(blob);
                }
                sendResponse({result:true});
              }).catch(error => {
                sendResponse({result:false});
              });
              return true;
            } else {
              if (ui) {
                ui.terminate();
              }
            }
          } else {
            if (cmd === CMD_MESSAGE) {
              const {vId, on, message} = params;
              if (on === "title") {
                document.title = message;
              } else {
                if (vId) {
                  const ui = videos[vId];
                  if (ui) {
                    ui.setMessage(on, message);
                  }
                }
              }
            } else {
              if (cmd === CMD_SUBTITLE_PROGRESS) {
                const {vId} = params;
                const ui = videos[vId];
                if (ui) {
                  ui.update_subtitleProgress(params);
                }
              }
            }
          }
        }
      }
    }
  }
  sendResponse({result:true});
};
const setupForceCaptureButton = () => {
  const forceCaptureButton = document.getElementById("forceCaptureButton");
  forceCaptureButton.addEventListener("click", async() => {
    if (forceCaptureButton.checked) {
      const forceCaptureModal = document.getElementById("forceCaptureModal");
      forceCaptureModal.classList.add("active");
      const result = await new Promise((resolve, reject) => {
        const closeBtns = forceCaptureModal.querySelectorAll(".close-modal");
        const _close = () => {
          for (const obj of closeBtns) {
            obj.removeEventListener("click", _close);
          }
          resolve(false);
        };
        for (const obj of closeBtns) {
          obj.addEventListener("click", _close);
        }
        const confirmCaptureOKButton = document.getElementById("confirmCaptureOKButton");
        const _ok = () => {
          confirmCaptureOKButton.removeEventListener("click", _ok);
          resolve(true);
        };
        confirmCaptureOKButton.addEventListener("click", _ok);
      });
      if (result) {
        const isReloaded = sendMessage({cmd:CMD_INTERCEPT_REQUEST, params:{}});
        if (isReloaded) {
          set_mode(TAB_MODE.CAPTURE);
        }
      } else {
        forceCaptureButton.checked = false;
        document.querySelector("#forceCaptureModal .modal-title").innerHTML = i18n.getMessage("capture_reason_1");
        if (TAB.mode === TAB_MODE.CAPTURE) {
          set_mode(TAB_MODE.NORMAL);
          sendMessage({cmd:CMD_START_NORMAL, params:{}});
        }
      }
      forceCaptureModal.classList.remove("active");
    } else {
      set_mode(TAB_MODE.NORMAL);
      sendMessage({cmd:CMD_START_NORMAL, params:{}});
    }
  });
  document.querySelector("#forceCaptureModal .modal-title").innerHTML = i18n.getMessage("capture_reason_1");
};
const importDomainSettings = () => {
  const domains = {};
  let foundOldSettings = false;
  for (const k in localStorage) {
    if (k.startsWith("http")) {
      const v = localStorage[k];
      const {level, quality, captureMode} = JSON.parse(v);
      const domain = URLUtils.domain(k);
      domains[domain] = {level, quality, mode:captureMode ? TAB_MODE.CAPTURE : TAB_MODE.NORMAL};
      foundOldSettings = true;
    }
  }
  if (foundOldSettings) {
    Object.assign(option.domain, domains);
    saveOption(option);
  }
};
const init = async() => {
  const tabInfo = await sendMessage({cmd:CMD_INIT, params:{}});
  if (tabInfo) {
    if (_LOG_) {
      console.log(...logGen(null, "CMD_INIT", JSON.stringify(tabInfo)));
    }
    if (!tabInfo.error) {
      TAB = new Tab(tabInfo);
      option.counter = tabInfo.counter;
    }
  }
};
document.addEventListener("DOMContentLoaded", async event => {
  importDomainSettings();
  await init();
  if (TAB) {
    setupForceCaptureButton();
    if (TAB.settings.mode === TAB_MODE.CAPTURE) {
      set_mode(TAB_MODE.CAPTURE, true);
      document.querySelector("#forceCaptureModal .modal-title").innerHTML = i18n.getMessage("capture_reason_3");
      document.getElementById("forceCaptureButton").click();
    } else {
      set_mode(TAB_MODE.NORMAL, true);
      await sendMessage({cmd:CMD_START_NORMAL, params:{}});
    }
  }
});

