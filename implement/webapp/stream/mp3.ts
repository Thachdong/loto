/**
 * Tách file MP3 thành frame (MPEG-1/2/2.5 Layer III) để stream server đẩy theo nhịp thời gian thực.
 * Bỏ thẻ ID3v2 đầu file, ID3v1 cuối file và frame Xing/Info (metadata, không phải âm thanh).
 */
export type Mp3Frame = { data: Buffer; durationMs: number; sampleRate: number; channels: number };

const BITRATES_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BITRATES_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SAMPLE_RATES: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

type Header = { frameLength: number; samples: number; sampleRate: number; channels: number; sideInfo: number };

function parseHeader(buf: Buffer, offset: number): Header | null {
  if (offset + 4 > buf.length) return null;
  const b1 = buf[offset]!;
  const b2 = buf[offset + 1]!;
  const b3 = buf[offset + 2]!;
  const b4 = buf[offset + 3]!;
  if (b1 !== 0xff || (b2 & 0xe0) !== 0xe0) return null;
  const version = (b2 >> 3) & 0x03; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5, 1 = reserved
  const layer = (b2 >> 1) & 0x03; // 1 = Layer III
  if (version === 1 || layer !== 1) return null;
  const bitrateIndex = (b3 >> 4) & 0x0f;
  const rateIndex = (b3 >> 2) & 0x03;
  if (bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return null;
  const mpeg1 = version === 3;
  const bitrate = (mpeg1 ? BITRATES_V1 : BITRATES_V2)[bitrateIndex]! * 1000;
  const sampleRate = SAMPLE_RATES[version]![rateIndex]!;
  const padding = (b3 >> 1) & 0x01;
  const samples = mpeg1 ? 1152 : 576;
  const frameLength = Math.floor(((samples / 8) * bitrate) / sampleRate) + padding;
  const mono = ((b4 >> 6) & 0x03) === 3;
  const sideInfo = mpeg1 ? (mono ? 17 : 32) : mono ? 9 : 17;
  return { frameLength, samples, sampleRate, channels: mono ? 1 : 2, sideInfo };
}

function skipId3v2(buf: Buffer): number {
  if (buf.length < 10 || buf.toString("latin1", 0, 3) !== "ID3") return 0;
  const size = ((buf[6]! & 0x7f) << 21) | ((buf[7]! & 0x7f) << 14) | ((buf[8]! & 0x7f) << 7) | (buf[9]! & 0x7f);
  const footer = (buf[5]! & 0x10) !== 0 ? 10 : 0;
  return 10 + size + footer;
}

export function parseMp3(buf: Buffer): Mp3Frame[] {
  const frames: Mp3Frame[] = [];
  let end = buf.length;
  if (end >= 128 && buf.toString("latin1", end - 128, end - 125) === "TAG") end -= 128;
  let offset = skipId3v2(buf);
  let first = true;
  while (offset + 4 <= end) {
    const header = parseHeader(buf, offset);
    if (!header || header.frameLength < 4 || offset + header.frameLength > end) {
      offset++; // mất đồng bộ → dò byte kế tiếp
      continue;
    }
    const data = buf.subarray(offset, offset + header.frameLength);
    offset += header.frameLength;
    if (first) {
      first = false;
      const tag = data.toString("latin1", 4 + header.sideInfo, 8 + header.sideInfo);
      if (tag === "Xing" || tag === "Info") continue;
    }
    frames.push({
      data,
      durationMs: (header.samples / header.sampleRate) * 1000,
      sampleRate: header.sampleRate,
      channels: header.channels,
    });
  }
  return frames;
}

export function totalDurationMs(frames: readonly Mp3Frame[]): number {
  return frames.reduce((sum, f) => sum + f.durationMs, 0);
}
