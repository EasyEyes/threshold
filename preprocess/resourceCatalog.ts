import { resourcesFileTypes } from "./constants";

export type ResourceType = (typeof resourcesFileTypes)[number];

/** A ready empty list is authoritative; a failed listing has no names. */
export type ResourceListing =
  | { kind: "ready"; names: string[] }
  | { kind: "failed"; error: unknown };

export type ResourceListings = Record<ResourceType, ResourceListing>;

export type ResourceListingState =
  | ResourceListing
  | { kind: "idle" }
  | { kind: "loading" };

/**
 * The whole catalog is one state, rather than independent resources and
 * resourcesLoaded fields that can disagree. `settled` permits partial success;
 * top-level `failed` is a failure before per-type outcomes were available.
 */
export type ResourceCatalog =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "settled"; listings: ResourceListings }
  | { kind: "failed"; error: unknown };

/** Remote knowledge plus local supply for exactly one repository type. */
export interface ResourceAvailability<T extends ResourceType = ResourceType> {
  readonly type: T;
  readonly remote: ResourceListingState;
  readonly localNames: readonly string[];
}

export type ResourceAvailabilities = {
  [T in ResourceType]: ResourceAvailability<T>;
};

export const idleResourceCatalog = (): ResourceCatalog => ({ kind: "idle" });

export const loadingResourceCatalog = (): ResourceCatalog => ({
  kind: "loading",
});

export const settledResourceCatalog = (
  listings: ResourceListings,
): ResourceCatalog => ({ kind: "settled", listings });

export const failedResourceCatalog = (error: unknown): ResourceCatalog => ({
  kind: "failed",
  error,
});

export const readyResourceListings = (
  namesByType: Partial<Record<ResourceType, string[]>> = {},
): ResourceListings =>
  Object.fromEntries(
    resourcesFileTypes.map((type) => [
      type,
      { kind: "ready", names: [...(namesByType[type] ?? [])] },
    ]),
  ) as ResourceListings;

export const resourceCatalogHasSettled = (catalog: ResourceCatalog): boolean =>
  catalog.kind === "settled" || catalog.kind === "failed";

/** Resolve top-level states at one boundary instead of re-deriving them. */
export const resourceListingFor = (
  catalog: ResourceCatalog,
  type: ResourceType,
): ResourceListingState => {
  switch (catalog.kind) {
    case "idle":
    case "loading":
      return { kind: catalog.kind };
    case "failed":
      return { kind: "failed", error: catalog.error };
    case "settled":
      return catalog.listings[type];
  }
};

export const resourceAvailabilityFor = <T extends ResourceType>(
  catalog: ResourceCatalog,
  type: T,
  localNames: readonly string[] = [],
): ResourceAvailability<T> => ({
  type,
  remote: resourceListingFor(catalog, type),
  localNames,
});

/** Construct the complete availability boundary once for all consumers. */
export const resourceAvailabilities = (
  catalog: ResourceCatalog,
  localNames: readonly string[] = [],
): ResourceAvailabilities =>
  Object.fromEntries(
    resourcesFileTypes.map((type) => [
      type,
      resourceAvailabilityFor(catalog, type, localNames),
    ]),
  ) as ResourceAvailabilities;

/** Local/archive resources are authoritative ready listings by construction. */
export const readyResourceAvailabilities = (
  namesByType: Partial<Record<ResourceType, string[]>> = {},
  localNames: readonly string[] = [],
): ResourceAvailabilities =>
  resourceAvailabilities(
    settledResourceCatalog(readyResourceListings(namesByType)),
    localNames,
  );

/** Add files obtained outside the catalog, such as an exact phrase fetch. */
export const withLocalResourceNames = <T extends ResourceType>(
  availability: ResourceAvailability<T>,
  names: readonly string[],
): ResourceAvailability<T> => ({
  ...availability,
  localNames: [...availability.localNames, ...names],
});

export const failedResourceTypes = (
  catalog: ResourceCatalog,
): ResourceType[] => {
  if (catalog.kind === "failed") return [...resourcesFileTypes];
  if (catalog.kind !== "settled") return [];
  return resourcesFileTypes.filter(
    (type) => catalog.listings[type].kind === "failed",
  );
};

export const unverifiableResourceTypes = (
  catalog: ResourceCatalog,
): ResourceType[] => {
  if (catalog.kind !== "settled") return [...resourcesFileTypes];
  return failedResourceTypes(catalog);
};
