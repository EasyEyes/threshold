/**
 * CLI argument parsing for the table fuzzer (`npm run fuzz`).
 *
 * Usage: npm run fuzz -- [tier] [-n count] [--seed n] [--invalid-frac f]
 *        [--no-minimize] [--forever] [--report]
 *
 * tier: all | compiler | runtime (default all). Anything else is a usage
 * error — silently fuzzing the wrong tier would waste a batch.
 * All numeric flags reject non-numeric and flag-looking values loudly.
 */

export interface FuzzArgs {
  tier: "all" | "compiler" | "runtime";
  count: number;
  seed?: number;
  seedExplicit: boolean;
  invalidFrac: number;
  minimize: boolean;
  forever: boolean;
  report: boolean;
}

const TIERS = ["all", "compiler", "runtime"] as const;

const usage = (why: string): Error =>
  new Error(
    `${why}\nUsage: npm run fuzz -- [all|compiler|runtime] [-n count] [--seed n] [--invalid-frac f] [--no-minimize] [--forever] [--report]`,
  );

const parseNumber = (
  flag: string,
  raw: string | undefined,
  { integer = false }: { integer?: boolean } = {},
): number => {
  if (raw === undefined || raw === "" || raw.startsWith("-"))
    throw usage(`${flag} needs a numeric value.`);
  const n = Number(raw);
  if (!Number.isFinite(n))
    throw usage(`${flag} must be a number, got "${raw}".`);
  if (integer && !Number.isInteger(n))
    throw usage(`${flag} must be an integer, got "${raw}".`);
  return n;
};

export const parseFuzzArgs = (argv: string[]): FuzzArgs => {
  const args: FuzzArgs = {
    tier: "all",
    count: 10,
    seedExplicit: false,
    invalidFrac: 0.15,
    minimize: true,
    forever: false,
    report: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const [flag, eq] = a.includes("=") ? a.split(/=(.*)/s) : [a, undefined];
    switch (flag) {
      case "-n":
      case "--count":
        args.count = parseNumber("count", eq ?? argv[++i], { integer: true });
        break;
      case "--seed": {
        args.seed = parseNumber("seed", eq ?? argv[++i], { integer: true });
        args.seedExplicit = true;
        break;
      }
      case "--invalid-frac": {
        const f = parseNumber("invalid-frac", eq ?? argv[++i]);
        if (f < 0 || f > 1)
          throw usage(`invalid-frac must be a fraction in [0,1], got "${f}".`);
        args.invalidFrac = f;
        break;
      }
      case "--no-minimize":
        args.minimize = false;
        break;
      case "--minimize":
        args.minimize = true;
        break;
      case "--forever":
        args.forever = true;
        break;
      case "--report":
        args.report = true;
        break;
      default:
        if (a.startsWith("-")) throw usage(`Unknown flag "${a}".`);
        if (args.tier !== "all" || i > 0)
          throw usage(`Unexpected argument "${a}".`);
        if (!(TIERS as readonly string[]).includes(a))
          throw usage(`Unknown tier "${a}" (expected ${TIERS.join("|")}).`);
        args.tier = a as FuzzArgs["tier"];
    }
  }
  return args;
};
