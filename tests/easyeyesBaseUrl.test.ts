/** @jest-environment node */

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

beforeEach(() => jest.resetModules());
afterEach(() => {
  jest.restoreAllMocks();
  if (originalWindow)
    Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

const resolveBaseUrl = async () =>
  (await import("../components/easyeyesBaseUrl")).getEasyEyesBaseUrl();

const setBrowserUrl = (url: string) => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: new URL(url) },
  });
};

it("uses production in Node without probing localhost", async () => {
  expect(typeof window).toBe("undefined");
  const fetchSpy = jest.spyOn(globalThis, "fetch");
  await expect(resolveBaseUrl()).resolves.toBe("https://easyeyes.app");
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("honors an explicit browser preview override", async () => {
  setBrowserUrl(
    "http://localhost:5173/?preview-deploy=https://preview.example",
  );
  await expect(resolveBaseUrl()).resolves.toBe("https://preview.example");
});

it("uses a Netlify preview's own functions", async () => {
  setBrowserUrl("https://deploy-preview-123--easyeyes.netlify.app/compiler");
  await expect(resolveBaseUrl()).resolves.toBe(
    "https://deploy-preview-123--easyeyes.netlify.app",
  );
});

it("uses production for other browser hosts", async () => {
  setBrowserUrl("https://run.example/experiment");
  await expect(resolveBaseUrl()).resolves.toBe("https://easyeyes.app");
});

it("uses a same-origin Netlify proxy when its audit endpoint returns JSON", async () => {
  setBrowserUrl("http://localhost:5500/compiler");
  const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({}), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  await expect(resolveBaseUrl()).resolves.toBe("http://localhost:5500");
  expect(fetchSpy).toHaveBeenCalledWith(
    "http://localhost:5500/.netlify/functions/glossary-audit-compiler",
    { method: "HEAD" },
  );
});

it("shares one pending localhost probe between concurrent browser requests", async () => {
  setBrowserUrl("http://localhost:5173/compiler");
  const finishProbes: ((response: Response) => void)[] = [];
  const fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        finishProbes.push(resolve);
      }),
  );
  const { getEasyEyesBaseUrl } = await import("../components/easyeyesBaseUrl");
  const first = getEasyEyesBaseUrl();
  const second = getEasyEyesBaseUrl();
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  finishProbes.shift()!(new Response(null, { status: 404 }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(fetchSpy).toHaveBeenCalledTimes(2);
  finishProbes.shift()!(new Response(null, { status: 404 }));
  await expect(Promise.all([first, second])).resolves.toEqual([
    "http://localhost:8888",
    "http://localhost:8888",
  ]);
  await expect(getEasyEyesBaseUrl()).resolves.toBe("http://localhost:8888");
  expect(fetchSpy).toHaveBeenCalledTimes(2);
});

it("caches the production fallback when the browser's localhost probe fails", async () => {
  setBrowserUrl("http://localhost:5173/compiler");
  const fetchSpy = jest
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new TypeError("Connection refused"));
  await expect(resolveBaseUrl()).resolves.toBe("https://easyeyes.app");
  await expect(resolveBaseUrl()).resolves.toBe("https://easyeyes.app");
  expect(fetchSpy).toHaveBeenCalledTimes(2);
});
