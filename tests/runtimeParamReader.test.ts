describe("runtime ParamReader ownership", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("creates one reader and exposes that same instance to consumers and the callback", async () => {
    jest.doMock("../parameters/glossaryRegistry", () => ({
      getGlossary: () => ({}),
      getSuperMatchingParams: () => [],
    }));
    jest.doMock("papaparse", () => ({
      __esModule: true,
      default: {
        parse: (
          url: string,
          config: { complete: (result: { data: string[][] }) => void },
        ) => {
          config.complete({
            data: url.includes("blockCount")
              ? [["block"], ["1"]]
              : [
                  ["block", "block_condition"],
                  ["1", "1_1"],
                ],
          });
        },
      },
    }));

    const runtime = await import("../parameters/paramReader");
    const initialized = jest.fn();
    const created = runtime.createRuntimeParamReader(initialized);

    expect(created).toBeInstanceOf(runtime.ParamReader);
    expect(runtime.paramReader).toBe(created);

    jest.advanceTimersByTime(500);
    expect(initialized).toHaveBeenCalledTimes(1);
    expect(initialized).toHaveBeenCalledWith(created);
  });
});
