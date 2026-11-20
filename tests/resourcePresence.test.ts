import type { Alert } from "../preprocess/alerts";
import {
  checkCodePresence,
  checkFontPresence,
  checkFormPresence,
  checkFrequencyResponsePresence,
  checkImageFolderPresence,
  checkImagePresence,
  checkImpulseResponsePresence,
  checkPhraseFilePresence,
  checkSoundFolderPresence,
  checkTargetSoundListPresence,
  checkTextPresence,
} from "../preprocess/experimentFileChecks";
import type {
  ResourceAvailability,
  ResourceListingState,
  ResourceType,
} from "../preprocess/resourceCatalog";

const availability = <T extends ResourceType>(
  type: T,
  remote: ResourceListingState,
  localNames: string[] = [],
): ResourceAvailability<T> => ({ type, remote, localNames });

const ready = <T extends ResourceType>(
  type: T,
  names: string[] = [],
  localNames: string[] = [],
) => availability(type, { kind: "ready", names }, localNames);

const unavailable = <T extends ResourceType>(
  type: T,
  localNames: string[] = [],
) =>
  availability(type, { kind: "failed", error: new Error("403") }, localNames);

describe("resource presence", () => {
  it("uses the ordinary missing-file check for a ready listing", () => {
    const errors = checkFontPresence(["Sloan.woff2"], ready("fonts"));
    expect(errors.map((e) => e.name)).toEqual(["Font file not found"]);
  });

  it("reports unverified, not missing, when the required listing failed", () => {
    const errors = checkFontPresence(["Sloan.woff2"], unavailable("fonts"));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      code: "RESOURCE_LISTING_UNAVAILABLE",
      name: "Resource list unavailable",
      parameters: ["font"],
    });
    expect(errors[0].message).toContain("Sloan.woff2");
    expect(errors[0].message).not.toContain("not found");
  });

  it("accepts a locally supplied file without consulting the failed listing", () => {
    expect(
      checkFontPresence(["Sloan.woff2"], unavailable("fonts", ["Sloan.woff2"])),
    ).toEqual([]);
  });

  it("still validates the format of a locally supplied file during an outage", () => {
    const errors = checkImpulseResponsePresence(
      ["bad.wav"],
      unavailable("impulseResponses", ["bad.wav"]),
      "impulse response files",
    );
    expect(errors.map((e) => e.name)).toEqual([
      "Invalid impulse response file format",
    ]);
  });

  it("combines ready repo names with locally supplied names for the ready check", () => {
    expect(
      checkFontPresence(
        ["Sloan.woff2", "New.woff2"],
        ready("fonts", ["Sloan.woff2"], ["New.woff2"]),
      ),
    ).toEqual([]);
  });

  it("lists only the unverified files when some requested files were supplied locally", () => {
    const errors = checkFontPresence(
      ["Local.woff2", "Remote.woff2"],
      unavailable("fonts", ["Local.woff2"]),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("RESOURCE_LISTING_UNAVAILABLE");
    expect(errors[0].message).toContain("Remote.woff2");
    expect(errors[0].message).not.toContain("Local.woff2");
  });

  it("does not turn a case-mismatched local name into missing during an outage", () => {
    const errors = checkFontPresence(
      ["Sloan.woff2"],
      unavailable("fonts", ["sloan.woff2"]),
    );
    expect(errors).toHaveLength(1);
    expect(errors.map((e) => e.name)).toEqual(["Resource list unavailable"]);
    expect(errors[0].code).toBe("RESOURCE_LISTING_UNAVAILABLE");
    expect(errors[0].message).not.toContain("not found");
  });

  it("preserves case-insensitive impulse-response matching for local files", () => {
    expect(
      checkImpulseResponsePresence(
        ["Room.gainVTime.csv"],
        unavailable("impulseResponses", ["room.gainvtime.csv"]),
        "impulse response files",
      ),
    ).toEqual([]);
  });

  it("preserves case-insensitive frequency-response matching for local files", () => {
    expect(
      checkFrequencyResponsePresence(
        ["Mic.gainVFreq.csv"],
        unavailable("frequencyResponses", ["mic.gainvfreq.csv"]),
        "frequency response files",
      ),
    ).toEqual([]);
  });

  it("preserves case-insensitive target-sound-list matching for local files", async () => {
    const fetchFiles = jest
      .fn()
      .mockResolvedValue([
        { name: "Words.targetSoundList.csv", file: "unused" },
      ]);
    const errors = await checkTargetSoundListPresence(
      [
        {
          targetSoundList: "Words.targetSoundList.csv",
          column: "word",
          targetSoundFolder: "sounds",
          conditionTrials: "1",
        },
      ],
      unavailable("targetSoundLists", ["words.targetsoundlist.csv"]),
      "targetSoundList",
      [{ parameter: "targetSoundFolder", name: { name: "sounds" }, file: {} }],
      null as any,
      fetchFiles,
    );
    expect(fetchFiles).toHaveBeenCalledWith(["Words.targetSoundList.csv"]);
    // The deliberately incomplete content fixture reaches content validation;
    // presence must produce neither a missing nor an unavailable alert.
    expect(errors.map((e) => e.code ?? e.name)).toEqual([
      "Target sound list file validation error",
    ]);
  });

  it("still validates a local file when another requested file is unverified", () => {
    const errors = checkImpulseResponsePresence(
      ["bad.wav", "Remote.gainVTime.csv"],
      unavailable("impulseResponses", ["bad.wav"]),
      "impulse response files",
    );
    expect(errors.map((e) => e.code ?? e.name)).toEqual(
      expect.arrayContaining([
        "RESOURCE_LISTING_UNAVAILABLE",
        "Invalid impulse response file format",
      ]),
    );
  });

  it("validates a local frequency response while another file is unverified", () => {
    const errors = checkFrequencyResponsePresence(
      ["bad.wav", "Remote.gainVFreq.csv"],
      unavailable("frequencyResponses", ["bad.wav"]),
      "frequency response files",
    );
    expect(errors.map((e) => e.code ?? e.name)).toEqual(
      expect.arrayContaining([
        "RESOURCE_LISTING_UNAVAILABLE",
        "Invalid frequency response file format",
      ]),
    );
  });

  it("validates a local target sound list while another file is unverified", async () => {
    const requested = (targetSoundList: string) => ({
      targetSoundList,
      column: "word",
      targetSoundFolder: "sounds",
      conditionTrials: "1",
    });
    const errors = await checkTargetSoundListPresence(
      [requested("bad.csv"), requested("Remote.targetSoundList.csv")],
      unavailable("targetSoundLists", ["bad.csv"]),
      "targetSoundList",
      [],
      null as any,
    );
    expect(errors.map((e) => e.code ?? e.name)).toEqual(
      expect.arrayContaining([
        "RESOURCE_LISTING_UNAVAILABLE",
        "Invalid target sound list file format",
      ]),
    );
  });

  it("keeps ready-list format and missing diagnostics without fetching content", async () => {
    const requested = (targetSoundList: string) => ({
      targetSoundList,
      column: "word",
      targetSoundFolder: "sounds",
      conditionTrials: "1",
    });
    const fetchFiles = jest.fn();
    const errors = await checkTargetSoundListPresence(
      [requested("bad.csv"), requested("Missing.targetSoundList.csv")],
      ready("targetSoundLists", ["bad.csv"]),
      "targetSoundList",
      [],
      null as any,
      fetchFiles,
    );
    expect(errors.map((e) => e.name)).toEqual([
      "Invalid target sound list file format",
      "Target sound list file is missing",
    ]);
    expect(fetchFiles).not.toHaveBeenCalled();
  });

  it("does not report anything for an unused failed resource type", () => {
    expect(checkImagePresence([], unavailable("images"))).toEqual([]);
  });

  it("treats idle availability as unverified in Studio", () => {
    const errors = checkTextPresence(
      ["corpus.txt"],
      availability("texts", { kind: "idle" }),
    );
    expect(errors[0].code).toBe("RESOURCE_LISTING_UNAVAILABLE");
  });

  it("keeps the image-folder GitLab client lazy during an outage", async () => {
    const client = jest.fn(() => {
      throw new Error("must not authenticate for an unavailable listing");
    });
    const errors = await checkImageFolderPresence(
      { targetImageFolderList: ["stimuli"], targetImageObjectList: [] },
      unavailable("folders"),
      client,
    );
    expect(errors[0].code).toBe("RESOURCE_LISTING_UNAVAILABLE");
    expect(client).not.toHaveBeenCalled();
  });

  it("reports a sound folder missing from a ready listing", () => {
    const errors = checkSoundFolderPresence(
      { maskerSoundFolder: ["noise", "missingFolder"], targetSoundFolder: [] },
      ready("folders", ["noise.zip", "other.zip"]),
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].name).toBe("Sound folder is missing");
    expect(errors[0].message).toContain("missingFolder.zip");
    expect(errors[0].message).not.toContain("noise.zip");
  });

  const crossKindCases: Array<
    [ResourceType, () => Alert[] | Promise<Alert[]>]
  > = [
    ["fonts", () => checkFontPresence(["A.woff2"], unavailable("fonts"))],
    [
      "forms",
      () =>
        checkFormPresence("consent.pdf", unavailable("forms"), "_consentForm"),
    ],
    ["texts", () => checkTextPresence(["corpus.txt"], unavailable("texts"))],
    [
      "folders",
      () =>
        checkSoundFolderPresence(
          { maskerSoundFolder: ["noise"], targetSoundFolder: [] },
          unavailable("folders"),
        ),
    ],
    ["images", () => checkImagePresence(["target.png"], unavailable("images"))],
    ["code", () => checkCodePresence(["movie.js"], unavailable("code"))],
    [
      "impulseResponses",
      () =>
        checkImpulseResponsePresence(
          ["room.gainVTime.csv"],
          unavailable("impulseResponses"),
          "impulse response files",
        ),
    ],
    [
      "frequencyResponses",
      () =>
        checkFrequencyResponsePresence(
          ["mic.gainVFreq.csv"],
          unavailable("frequencyResponses"),
          "frequency response files",
        ),
    ],
    [
      "targetSoundLists",
      () =>
        checkTargetSoundListPresence(
          [
            {
              targetSoundList: "words.targetSoundList.csv",
              column: "word",
              targetSoundFolder: "sounds",
              conditionTrials: "1",
            },
          ],
          unavailable("targetSoundLists"),
          "targetSoundList",
          [],
          null as any,
        ),
    ],
    [
      "phrases",
      () => checkPhraseFilePresence("phrases.xlsx", unavailable("phrases")),
    ],
  ];

  it.each(crossKindCases)(
    "%s reports unavailability through its own validator",
    async (_type, check) => {
      const errors = await check();
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe("RESOURCE_LISTING_UNAVAILABLE");
      expect(errors[0].message).not.toContain("not found");
    },
  );
});
