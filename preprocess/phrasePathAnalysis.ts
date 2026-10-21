// Scalar-only evaluation: unsupported syntax and runtime state stay unresolved.
export type Scalar = string | number | boolean | null;
export type PhraseExpression = {
  kind: string;
  name?: string;
  value?: Scalar;
  argument?: PhraseExpression;
  left?: PhraseExpression;
  right?: PhraseExpression;
};
export type PhraseSourceIndex = {
  schemaVersion: number;
  fingerprint: string;
  parseFailures: unknown[];
  coverage: { limitations: string[]; [key: string]: unknown };
  glossarySites?: PhraseSourceIndex["sites"];
  sites: {
    id: string;
    file: string;
    line: number;
    keys: string[];
    guards: { truth: boolean; text: string; expression: PhraseExpression }[];
  }[];
};
export type PhraseCondition = {
  name: string;
  parameters: Record<string, Scalar>;
};

export function evaluatePhraseExpression(
  node: PhraseExpression | undefined,
  parameters: Record<string, Scalar>,
): Scalar | undefined {
  if (!node) return undefined;
  if (node.kind === "literal") return node.value;
  if (node.kind === "parameter")
    return node.name &&
      Object.prototype.hasOwnProperty.call(parameters, node.name)
      ? parameters[node.name]
      : undefined;
  if (node.kind === "not") {
    const value = evaluatePhraseExpression(node.argument, parameters);
    return value === undefined ? undefined : !value;
  }
  const left = evaluatePhraseExpression(node.left, parameters);
  if (left === undefined) return undefined;
  if (node.kind === "&&" && !left) return left;
  if (node.kind === "||" && left) return left;
  const right = evaluatePhraseExpression(node.right, parameters);
  if (right === undefined) return undefined;
  if (node.kind === "&&" || node.kind === "||") return right;
  const sameType =
    typeof left === typeof right && (left === null) === (right === null);
  if ((node.kind === "==" || node.kind === "!=") && !sameType) return undefined;
  if (node.kind === "===" || node.kind === "==") return left === right;
  if (node.kind === "!==" || node.kind === "!=") return left !== right;
  if (
    !sameType ||
    !["number", "string"].includes(typeof left) ||
    left === null ||
    right === null
  )
    return undefined;
  switch (node.kind) {
    case ">":
      return left > right;
    case "<":
      return left < right;
    case ">=":
      return left >= right;
    case "<=":
      return left <= right;
    default:
      return undefined;
  }
}

export function analysePhrasePaths(
  index: PhraseSourceIndex,
  conditions: PhraseCondition[],
) {
  if (
    index.schemaVersion !== 2 ||
    !/^[a-f0-9]{64}$/.test(index.fingerprint) ||
    index.parseFailures.length
  )
    throw new Error("Invalid or incomplete phrase source index");
  const sites = index.sites.map((site) => ({
    ...site,
    runtimeReachability: "unresolved" as const,
    studyPaths: conditions.map((condition) => {
      const values = site.guards.map((guard) =>
        evaluatePhraseExpression(guard.expression, condition.parameters),
      );
      const excluded = values.some(
        (value, i) =>
          value !== undefined && Boolean(value) !== site.guards[i].truth,
      );
      return {
        condition: condition.name,
        localPath: excluded
          ? "excluded"
          : values.every((value) => value !== undefined)
          ? "possible"
          : "unresolved",
      };
    }),
  }));
  return {
    schemaVersion: 1,
    fingerprint: index.fingerprint,
    sites,
    candidateKeys: [
      ...new Set(
        sites
          .filter((site) =>
            site.studyPaths.some((path) => path.localPath !== "excluded"),
          )
          .flatMap((site) => site.keys),
      ),
    ].sort(),
    fullRuntimeAnswerAvailable: false,
    limitations: index.coverage.limitations,
  };
}
export type PhrasePathReport = ReturnType<typeof analysePhrasePaths>;

export function analyseGlossaryPaths(
  index: PhraseSourceIndex,
  conditions: PhraseCondition[],
) {
  if (!Array.isArray(index.glossarySites))
    throw new Error("Glossary source index missing");
  return analysePhrasePaths(
    { ...index, sites: index.glossarySites },
    conditions,
  );
}
