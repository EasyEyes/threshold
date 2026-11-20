import {
  failedResourceCatalog,
  failedResourceTypes,
  idleResourceCatalog,
  loadingResourceCatalog,
  readyResourceListings,
  resourceAvailabilities,
  resourceAvailabilityFor,
  resourceCatalogHasSettled,
  resourceListingFor,
  settledResourceCatalog,
  unverifiableResourceTypes,
  withLocalResourceNames,
} from "../preprocess/resourceCatalog";
import { resourcesFileTypes } from "../preprocess/constants";

describe("ResourceCatalog", () => {
  it("constructs a complete ready listing, including authoritative empty lists", () => {
    const catalog = settledResourceCatalog(readyResourceListings());
    for (const type of resourcesFileTypes) {
      expect(resourceListingFor(catalog, type)).toEqual({
        kind: "ready",
        names: [],
      });
    }
    expect(failedResourceTypes(catalog)).toEqual([]);
    expect(unverifiableResourceTypes(catalog)).toEqual([]);
    expect(resourceCatalogHasSettled(catalog)).toBe(true);
  });

  it("distinguishes idle, loading, and settled without a parallel boolean", () => {
    const idle = idleResourceCatalog();
    const loading = loadingResourceCatalog();
    expect(resourceListingFor(idle, "fonts").kind).toBe("idle");
    expect(resourceListingFor(loading, "fonts").kind).toBe("loading");
    expect(resourceCatalogHasSettled(idle)).toBe(false);
    expect(resourceCatalogHasSettled(loading)).toBe(false);
    expect(unverifiableResourceTypes(loading)).toEqual(resourcesFileTypes);
  });

  it("preserves partial failure without exposing names for the failed type", () => {
    const error = new Error("403");
    const listings = readyResourceListings({ images: ["a.png"] });
    listings.fonts = { kind: "failed", error };
    const catalog = settledResourceCatalog(listings);

    expect(resourceListingFor(catalog, "images")).toEqual({
      kind: "ready",
      names: ["a.png"],
    });
    expect(resourceListingFor(catalog, "fonts")).toEqual({
      kind: "failed",
      error,
    });
    expect(resourceListingFor(catalog, "fonts")).not.toHaveProperty("names");
    expect(failedResourceTypes(catalog)).toEqual(["fonts"]);
  });

  it("marks every type unverifiable after a whole-catalog failure", () => {
    const catalog = failedResourceCatalog(new Error("search failed"));
    expect(resourceCatalogHasSettled(catalog)).toBe(true);
    expect(failedResourceTypes(catalog)).toEqual(resourcesFileTypes);
    expect(resourceListingFor(catalog, "texts").kind).toBe("failed");
  });

  it("constructs typed availability with remote state and shared local supply", () => {
    const listings = readyResourceListings({ texts: ["corpus.txt"] });
    listings.fonts = { kind: "failed", error: new Error("403") };
    const availability = resourceAvailabilities(
      settledResourceCatalog(listings),
      ["Local.woff2"],
    );

    expect(availability.fonts).toEqual({
      type: "fonts",
      remote: listings.fonts,
      localNames: ["Local.woff2"],
    });
    expect(availability.texts).toEqual({
      type: "texts",
      remote: { kind: "ready", names: ["corpus.txt"] },
      localNames: ["Local.woff2"],
    });
    expect(resourceAvailabilityFor(idleResourceCatalog(), "images")).toEqual({
      type: "images",
      remote: { kind: "idle" },
      localNames: [],
    });
  });

  it("adds exact-fetch names without mutating the original availability", () => {
    const original = resourceAvailabilityFor(
      settledResourceCatalog(readyResourceListings()),
      "phrases",
      ["local.xlsx"],
    );
    const extended = withLocalResourceNames(original, ["fetched.xlsx"]);
    expect(extended.localNames).toEqual(["local.xlsx", "fetched.xlsx"]);
    expect(original.localNames).toEqual(["local.xlsx"]);
  });
});
