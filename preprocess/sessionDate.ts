/** Session dates are participant wall-clock times with an optional UTC offset. */
const sessionDateRegex =
  /(\d{4})-(\d{2})-(\d{2})_(\d{1,2})h(\d{2})\.(\d{2})(?:\.(\d{1,3}))?(?=$|[^\d])/;
const zoneRegex =
  /^\s*(?:UTC|GMT)(?:([+\-\u2212])(\d{1,2})(?::?(\d{2}))?)?(?=$|[_.\s/\\])/;

export interface SessionDate {
  /** Exact instant when an offset is present; otherwise wall-clock fields interpreted as UTC. */
  date: Date;
  /** Participant's offset east of UTC. Undefined for legacy dates without a zone. */
  offsetMinutes?: number;
}

export const parseSessionDate = (text: string): SessionDate | undefined => {
  const match = sessionDateRegex.exec(text);
  if (!match) return undefined;
  const [, y, mo, d, h, mi, s, ms] = match;
  const suffix = text.slice(match.index + match[0].length);
  if (/^\.\d/.test(suffix)) return undefined;
  // Intl.DateTimeFormat can represent midnight as hour 24 on the same date.
  const hour = Number(h) === 24 ? 0 : Number(h);
  if (Number(h) > 24 || Number(mi) > 59 || Number(s) > 59) return undefined;
  const wallClock = new Date(0);
  wallClock.setUTCFullYear(Number(y), Number(mo) - 1, Number(d));
  wallClock.setUTCHours(
    hour,
    Number(mi),
    Number(s),
    Number(ms?.padEnd(3, "0") ?? 0),
  );
  if (
    wallClock.getUTCFullYear() !== Number(y) ||
    wallClock.getUTCMonth() !== Number(mo) - 1 ||
    wallClock.getUTCDate() !== Number(d)
  )
    return undefined;

  const zone = zoneRegex.exec(suffix);
  if (!zone) {
    // A malformed offset must not silently become a legacy date without a zone.
    if (/^\s*(?:UTC|GMT)/.test(suffix)) return undefined;
    return { date: wallClock };
  }
  const [, sign, hours, minutes] = zone;
  const offsetHours = Number(hours ?? 0);
  const offsetMins = Number(minutes ?? 0);
  if (
    offsetHours > 14 ||
    offsetMins > 59 ||
    (offsetHours === 14 && offsetMins !== 0)
  )
    return undefined;
  const offsetMinutes =
    (sign === "+" ? 1 : -1) * (offsetHours * 60 + offsetMins);
  return {
    date: new Date(wallClock.getTime() - offsetMinutes * 60_000),
    offsetMinutes: offsetMinutes || 0,
  };
};

/**
 * Compatibility timestamp for ZIP's zone-less DOS fields. Exact UTC timestamps
 * are written separately by generateResultsZip. Legacy dates retain their
 * recorded wall-clock time because their original zone cannot be recovered.
 */
export const sessionDateToZipDate = (session: SessionDate): Date => {
  const instantMs = session.date.getTime();
  return session.offsetMinutes === undefined
    ? session.date
    : new Date(instantMs - session.date.getTimezoneOffset() * 60_000);
};

export const sessionDateForZip = (text: string): Date | undefined => {
  const session = parseSessionDate(text);
  return session ? sessionDateToZipDate(session) : undefined;
};

export const earliestSessionDate = (
  texts: Iterable<unknown>,
): SessionDate | undefined => {
  let earliest: SessionDate | undefined;
  for (const text of texts) {
    if (typeof text !== "string") continue;
    const parsed = parseSessionDate(text);
    if (parsed && (!earliest || parsed.date < earliest.date)) earliest = parsed;
  }
  return earliest;
};

export const earliestSessionDateForZip = (
  texts: Iterable<unknown>,
): Date | undefined => {
  const session = earliestSessionDate(texts);
  return session ? sessionDateToZipDate(session) : undefined;
};
