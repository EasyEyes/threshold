import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../components/mediaPreload.js", import.meta.url),
  "utf8",
);
let sequence = 0;
async function fresh(autoRetry = false) {
  globalThis.document = {
    baseURI: "https://study.example/experiment/",
    body: { append() {} },
    createElement(tag) {
      return {
        style: {},
        setAttribute() {},
        append() {},
        remove() {},
        set hidden(value) {
          if (tag === "button" && !value && autoRetry)
            queueMicrotask(() => this.onclick?.());
        },
      };
    },
  };
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString(
      "base64",
    )}#${sequence++}`
  );
}
const reader = {
  conditions: [
    {
      targetKind: "image",
      targetImageFolder: "pictures",
      showImage: "intro.png",
    },
    {
      targetKind: "sound",
      targetSoundFolder: "audio",
      maskerSoundFolder: "audio",
      targetSoundList: "list.csv",
    },
  ],
};
test("manifest includes media from all conditions and deduplicates archives", async () => {
  const m = await fresh();
  assert.deepEqual(m.collectStudyMedia(reader), [
    "folders/pictures.zip",
    "images/intro.png",
    "folders/audio.zip",
    "targetSoundLists/list.csv",
  ]);
});
test("downloads once, reuses complete bytes offline, and rejects an unlisted URL", async () => {
  const m = await fresh();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response("saved-media");
  };
  await m.preloadStudyMedia({ reader, rc: {}, distance: false });
  assert.equal(calls, 4);
  globalThis.fetch = () => {
    throw new Error("offline");
  };
  assert.equal(
    await (await m.fetchMedia("folders/audio.zip")).text(),
    "saved-media",
  );
  assert.equal(
    await (await m.fetchMedia("folders/audio.zip")).text(),
    "saved-media",
  );
  assert.match(m.mediaUrl("images/intro.png"), /^blob:/);
  await assert.rejects(m.fetchMedia("missing.mp4"), /not preloaded/);
});
test("distance false skips all RC media; true supplies cached phrase media to RC", async () => {
  const m = await fresh();
  let calls = 0;
  let imported = false;
  globalThis.fetch = async () => {
    calls++;
    return new Response("video");
  };
  const calibrationTasks = [
    { name: "trackDistance", options: { useObjectTestData: "paper" } },
  ];
  const rc = {
    getInstructionMediaUrls(options) {
      assert.deepEqual(options, { calibrationTasks, compressed: true });
      return [
        "https://media.example/phrase-C.mp4",
        "https://media.example/phrase-C.mp4",
      ];
    },
    async preloadInstructionMedia({
      loadBlob,
      calibrationTasks: tasks,
      compressed,
    }) {
      assert.deepEqual(tasks, calibrationTasks);
      assert.equal(compressed, true);
      assert.equal(
        await (await loadBlob("https://media.example/phrase-C.mp4")).text(),
        "video",
      );
      imported = true;
    },
  };
  await m.preloadStudyMedia({
    reader: { conditions: [] },
    rc,
    distance: false,
  });
  assert.equal(calls, 0);
  assert.equal(imported, false);
  await m.preloadStudyMedia({
    reader: { conditions: [] },
    rc,
    distance: true,
    calibrationTasks,
    compressed: true,
  });
  assert.equal(calls, 1);
  assert.equal(imported, true);
});
test("retry retains successful downloads", async () => {
  const m = await fresh(true);
  const calls = new Map();
  globalThis.fetch = async (url) => {
    const n = (calls.get(url) || 0) + 1;
    calls.set(url, n);
    return new Response("file", {
      status: url.endsWith("intro.png") && n === 1 ? 503 : 200,
    });
  };
  await m.preloadStudyMedia({ reader, rc: {}, distance: false });
  assert.equal(
    calls.get("https://study.example/experiment/images/intro.png"),
    2,
  );
  assert.equal(
    calls.get("https://study.example/experiment/folders/audio.zip"),
    1,
  );
});
test("active slow stream outlives inactivity timeout and reports bytes", async () => {
  const m = await fresh();
  let count = 0;
  let last;
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        async pull(controller) {
          await new Promise((resolve) => setTimeout(resolve, 15));
          if (++count <= 5) controller.enqueue(new Uint8Array([1]));
          else controller.close();
        },
      }),
    );
  const blob = await m.downloadMedia(
    "slow.mp4",
    (loaded, total) => {
      last = [loaded, total];
    },
    undefined,
    40,
  );
  assert.equal(blob.size, 5);
  assert.deepEqual(last, [5, 5]);
});
test("already terminated study cannot start downloads", async () => {
  const m = await fresh();
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = () => {
    throw new Error("should not fetch");
  };
  await assert.rejects(
    m.preloadStudyMedia({
      reader,
      rc: {},
      distance: false,
      signal: controller.signal,
    }),
    { name: "AbortError" },
  );
});
test("old RC fails explicitly instead of silently allowing late downloads", async () => {
  const m = await fresh();
  await assert.rejects(
    m.preloadStudyMedia({ reader, rc: {}, distance: true }),
    /updated RemoteCalibrator/,
  );
});

test("manifest uses resolved parameter defaults, including audio accompanying other tasks", async () => {
  const m = await fresh();
  const values = {
    targetKind: "letter",
    targetSoundFolder: "spoken",
    targetSoundList: "words.csv",
    showImage: "default.png",
  };
  const resolvedReader = {
    conditions: [{ block_condition: "1_1" }],
    read(key, condition) {
      assert.equal(condition, "1_1");
      return values[key];
    },
  };
  assert.deepEqual(m.collectStudyMedia(resolvedReader), [
    "folders/spoken.zip",
    "targetSoundLists/words.csv",
    "images/default.png",
  ]);
});

test("manifest includes optional media folders even on non-media target kinds", async () => {
  const m = await fresh();
  assert.deepEqual(
    m.collectStudyMedia({
      conditions: [
        {
          targetKind: "letter",
          targetImageFolder: "pictures",
          targetSoundFolder: "testAudio",
          maskerSoundFolder: "noise",
        },
      ],
    }),
    ["folders/pictures.zip", "folders/testAudio.zip", "folders/noise.zip"],
  );
});
