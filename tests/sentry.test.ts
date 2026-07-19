const init = jest.fn();

jest.mock("@sentry/browser", () => ({
  init,
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

describe("participant Sentry", () => {
  beforeEach(() => {
    init.mockClear();
  });

  it("initializes monitoring when a DSN is configured", async () => {
    const { initSentry } = await import("../components/sentry.js");

    initSentry("https://public@example.ingest.sentry.io/1", "production");

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://public@example.ingest.sentry.io/1",
        environment: "production",
        sendDefaultPii: false,
      }),
    );
  });
});
