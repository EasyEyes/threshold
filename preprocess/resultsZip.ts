import JSZip from "jszip";

/**
 * JSZip exposes only the zone-less DOS modification date. Add interoperable UTC
 * timestamp extra fields without decompressing or changing any CSV contents:
 * NTFS (0x000a) carries creation/modification/access times at 100 ns precision;
 * Extended Timestamp (0x5455) carries modification seconds for Info-ZIP;
 * old Unix (0x5855) carries access/modification seconds for macOS ditto.
 * https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
 * Extractors choose which fields to restore; milliseconds may be discarded.
 */
const timestampFields = (date: Date): Uint8Array => {
  const milliseconds = date.getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 0)
    throw new Error("Invalid results ZIP timestamp");
  const seconds = Math.floor(milliseconds / 1000);
  const hasUnixTime = seconds <= 0xffffffff;
  const bytes = new Uint8Array(hasUnixTime ? 57 : 36);
  const view = new DataView(bytes.buffer);
  let offset = 0;
  if (hasUnixTime) {
    view.setUint16(0, 0x5455, true);
    view.setUint16(2, 5, true);
    view.setUint8(4, 1); // Modification time only (valid in both ZIP headers).
    view.setUint32(5, seconds, true);
    view.setUint16(9, 0x5855, true);
    view.setUint16(11, 8, true);
    view.setUint32(13, seconds, true);
    view.setUint32(17, seconds, true);
    offset = 21;
  }
  view.setUint16(offset, 0x000a, true);
  view.setUint16(offset + 2, 32, true);
  // Four reserved bytes remain zero.
  view.setUint16(offset + 8, 1, true);
  view.setUint16(offset + 10, 24, true);
  // Split FILETIME into two words; avoid a BigInt requirement in browser builds.
  const epochMs = milliseconds + 11644473600000;
  const high = Math.floor(epochMs / 0x100000000);
  const lowTicks = (epochMs % 0x100000000) * 10000;
  for (const position of [12, 20, 28]) {
    view.setUint32(offset + position, lowTicks % 0x100000000, true);
    view.setUint32(
      offset + position + 4,
      high * 10000 + Math.floor(lowTicks / 0x100000000),
      true,
    );
  }
  return bytes;
};

interface ZipRecord {
  centralOffset: number;
  length: number;
  localOffset: number;
  extra: Uint8Array;
  newLocalOffset: number;
}

/** Generate a fresh, single-disk JSZip archive with session UTC metadata. */
export const generateResultsZip = async (
  zip: JSZip,
  sessionDates: ReadonlyMap<string, Date>,
): Promise<Blob> => {
  // JSZip's writer uses classic ZIP headers; never silently wrap their limits.
  if (Object.keys(zip.files).length >= 0xffff)
    throw new Error("Too many files for a results ZIP");
  const bytes = await zip.generateAsync({ type: "uint8array" });
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fail = (): never => {
    throw new Error("Unsupported results ZIP structure");
  };
  let end = bytes.length - 22;
  while (end >= Math.max(0, bytes.length - 22 - 0xffff)) {
    if (
      view.getUint32(end, true) === 0x06054b50 &&
      end + 22 + view.getUint16(end + 20, true) === bytes.length
    )
      break;
    end--;
  }
  if (end < 0 || end < bytes.length - 22 - 0xffff) return fail();
  const count = view.getUint16(end + 10, true);
  const centralSize = view.getUint32(end + 12, true);
  const centralOffset = view.getUint32(end + 16, true);
  if (
    view.getUint16(end + 4, true) ||
    view.getUint16(end + 6, true) ||
    view.getUint16(end + 8, true) !== count ||
    count === 0xffff ||
    centralOffset + centralSize !== end
  )
    return fail();

  const records: ZipRecord[] = [];
  const decoder = new TextDecoder();
  let cursor = centralOffset;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50)
      return fail();
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const length =
      46 + nameLength + extraLength + view.getUint16(cursor + 32, true);
    if (cursor + length > end) return fail();
    const name = decoder.decode(
      bytes.subarray(cursor + 46, cursor + 46 + nameLength),
    );
    const date = sessionDates.get(name);
    records.push({
      centralOffset: cursor,
      length,
      localOffset: view.getUint32(cursor + 42, true),
      extra: date ? timestampFields(date) : new Uint8Array(),
      newLocalOffset: 0,
    });
    cursor += length;
  }
  if (cursor !== end) return fail();

  const parts: BlobPart[] = [];
  let outputOffset = 0;
  const locals = [...records].sort((a, b) => a.localOffset - b.localOffset);
  for (let i = 0; i < locals.length; i++) {
    const record = locals[i];
    const start = record.localOffset;
    const next = locals[i + 1]?.localOffset ?? centralOffset;
    if (
      (i === 0 && start !== 0) ||
      start + 30 > next ||
      view.getUint32(start, true) !== 0x04034b50
    )
      return fail();
    const extraLength = view.getUint16(start + 28, true);
    const headerEnd =
      start + 30 + view.getUint16(start + 26, true) + extraLength;
    if (headerEnd > next || extraLength + record.extra.length > 0xffff)
      return fail();
    const header = bytes.slice(start, headerEnd);
    new DataView(header.buffer).setUint16(
      28,
      extraLength + record.extra.length,
      true,
    );
    record.newLocalOffset = outputOffset;
    parts.push(header, record.extra, bytes.subarray(headerEnd, next));
    outputOffset += next - start + record.extra.length;
  }
  const newCentralOffset = outputOffset;
  for (const record of records) {
    const start = record.centralOffset;
    const nameLength = view.getUint16(start + 28, true);
    const extraLength = view.getUint16(start + 30, true);
    if (extraLength + record.extra.length > 0xffff) return fail();
    const headerEnd = start + 46 + nameLength + extraLength;
    const header = bytes.slice(start, headerEnd);
    const headerView = new DataView(header.buffer);
    headerView.setUint16(30, extraLength + record.extra.length, true);
    headerView.setUint32(42, record.newLocalOffset, true);
    parts.push(
      header,
      record.extra,
      bytes.subarray(headerEnd, start + record.length),
    );
    outputOffset += record.length + record.extra.length;
  }
  if (outputOffset >= 0xffffffff)
    throw new Error("Results ZIP exceeds classic ZIP size limits");
  const endRecord = bytes.slice(end);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(12, outputOffset - newCentralOffset, true);
  endView.setUint32(16, newCentralOffset, true);
  parts.push(endRecord);
  return new Blob(parts, { type: "application/zip" });
};
