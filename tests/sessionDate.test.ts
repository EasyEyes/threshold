import {
  earliestSessionDate,
  parseSessionDate,
  sessionDateForZip,
} from "../preprocess/sessionDate";

const fileName =
  "JollyBrownDog803_threshold_0001_2026-08-12_15h19.01.041 UTC-4.csv";

describe("session dates", () => {
  test.each([
    [fileName, "2026-08-12T19:19:01.041Z"],
    ["x_2026-01-05_09h00.00.000 UTC+5:30.csv", "2026-01-05T03:30:00.000Z"],
    ["x_2026-01-05_09h00.00.000 UTC+0545.csv", "2026-01-05T03:15:00.000Z"],
    ["x_2026-01-05_09h00.00.000 UTC.csv", "2026-01-05T09:00:00.000Z"],
    ["x_2026-01-05_09h00.00.000 UTC\u22123.csv", "2026-01-05T12:00:00.000Z"],
    ["x_2026-01-05_24h10.00.000 UTC.csv", "2026-01-05T00:10:00.000Z"],
    ["x_2026-01-01_00h05.00 UTC+14_stimulus.csv", "2025-12-31T10:05:00.000Z"],
    ["x_2024-02-29_23h59.59.1 GMT-4.csv", "2024-03-01T03:59:59.100Z"],
  ])("parses %s", (text, expected) => {
    expect(parseSessionDate(text)?.date.toISOString()).toBe(expected);
  });

  test.each([
    "2026-02-30_15h19.01 UTC-4",
    "2026-13-12_15h19.01 UTC-4",
    "2026-00-12_15h19.01 UTC-4",
    "2026-01-00_15h19.01 UTC-4",
    "2026-01-05_25h10.00 UTC",
    "2026-01-05_99h10.00 UTC",
    "2026-01-05_09h60.00 UTC",
    "2026-01-05_09h00.60 UTC",
    "2026-01-05_09h00.00 UTC+5:99",
    "2026-01-05_09h00.00 UTC+15",
    "2026-01-05_09h00.00 UTC+14:01",
    "2026-01-05_09h00.00 UTC+",
    "2026-01-05_09h00.00 UTC+5:3",
    "2026-01-05_09h00.00.1234 UTC",
    "recruitmentServiceConfig.csv",
  ])("rejects invalid session date %s", (text) => {
    expect(parseSessionDate(text)).toBeUndefined();
  });

  test("retains legacy wall-clock time without inventing a UTC offset", () => {
    const legacy = "P_threshold_2022-06-03_16h52.47.629.csv";
    expect(parseSessionDate(legacy)?.offsetMinutes).toBeUndefined();
    expect(sessionDateForZip(legacy)?.toISOString()).toBe(
      "2022-06-03T16:52:47.629Z",
    );
  });

  test("selects the earliest database session instant across zones", () => {
    const result = earliestSessionDate([
      undefined,
      "",
      "2026-08-12_15h30.00 UTC-4",
      "2026-08-12_21h00.00 UTC+2",
    ]);
    expect(result?.date.toISOString()).toBe("2026-08-12T19:00:00.000Z");
  });
});
