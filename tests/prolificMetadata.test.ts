jest.mock("../preprocess/prolificRequest", () => ({
  prolificRequest: jest.fn(),
}));

import {
  clearProlificMetadataCache,
  getProlificParticipantGroups,
} from "../preprocess/prolificMetadata";
import { prolificRequest } from "../preprocess/prolificRequest";

const response = (ok: boolean, status: number, groups: string[] = []) =>
  ({
    ok,
    status,
    json: jest.fn().mockResolvedValue({
      results: groups.map((name) => ({ id: `id-${name}`, name })),
    }),
  }) as any;

beforeEach(() => {
  jest.clearAllMocks();
  clearProlificMetadataCache();
});

describe("Prolific participant-group metadata", () => {
  it("makes no request for an empty token", async () => {
    await getProlificParticipantGroups("");
    expect(prolificRequest).not.toHaveBeenCalled();
  });
  it("deduplicates concurrent and subsequent calls per token", async () => {
    (prolificRequest as jest.Mock).mockResolvedValue(
      response(true, 200, ["Done"]),
    );

    const [a, b] = await Promise.all([
      getProlificParticipantGroups("token-a"),
      getProlificParticipantGroups("token-a"),
    ]);
    const c = await getProlificParticipantGroups("token-a");

    expect(a.map((g) => g.name)).toEqual(["Done"]);
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(prolificRequest).toHaveBeenCalledTimes(1);
  });

  it("does not share metadata between tokens", async () => {
    (prolificRequest as jest.Mock).mockImplementation(async () =>
      response(true, 200, ["Done"]),
    );

    await getProlificParticipantGroups("token-a");
    await getProlificParticipantGroups("token-b");

    expect(prolificRequest).toHaveBeenCalledTimes(2);
  });

  it("does not cache failed responses", async () => {
    (prolificRequest as jest.Mock)
      .mockResolvedValueOnce(response(false, 429))
      .mockResolvedValueOnce(response(true, 200, ["Recovered"]));

    await expect(getProlificParticipantGroups("token-a")).rejects.toMatchObject(
      { status: 429 },
    );
    const recovered = await getProlificParticipantGroups("token-a");

    expect(recovered.map((g) => g.name)).toEqual(["Recovered"]);
    expect(prolificRequest).toHaveBeenCalledTimes(2);
  });

  it("refreshes after five minutes", async () => {
    let now = Date.parse("2026-01-01T00:00:00Z");
    const dateNow = jest.spyOn(Date, "now").mockImplementation(() => now);
    try {
      (prolificRequest as jest.Mock).mockImplementation(async () =>
        response(true, 200, ["Done"]),
      );
      await getProlificParticipantGroups("token-a");
      now += 5 * 60_000 + 1;
      await getProlificParticipantGroups("token-a");
      expect(prolificRequest).toHaveBeenCalledTimes(2);
    } finally {
      dateNow.mockRestore();
    }
  });

  it("clears cached values on account change", async () => {
    (prolificRequest as jest.Mock).mockResolvedValue(
      response(true, 200, ["Done"]),
    );
    await getProlificParticipantGroups("token-a");
    clearProlificMetadataCache();
    await getProlificParticipantGroups("token-a");
    expect(prolificRequest).toHaveBeenCalledTimes(2);
  });
});
