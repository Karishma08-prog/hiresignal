import { MinHasher, lshBandKeys, signatureSimilarity } from '../minhash';
import { ClusterPartition, IDedupStrategy, PreparedJob } from '../types';

/**
 * Tuning knobs for {@link MinHashStrategy}.
 *
 * Defaults target Spec 003 / FR-7 (similarity threshold ≥ 0.85) and
 * NFR-1 / NFR-2 (1 K jobs < 250 ms, 10 K jobs < 2.5 s).
 *
 * With `signatureSize = 128` and `bands = 16` (`rows = 8`) the LSH banding
 * threshold is `(1/B)^(1/R) ≈ 0.71` — pairs with Jaccard ≥ 0.85 surface as
 * LSH candidates with probability > 0.95, and are then verified explicitly
 * via `signatureSimilarity ≥ similarityThreshold`. The (B=16, R=8) split
 * trades a few extra candidate-pair verifications for materially better
 * recall in the spec-target band (0.85+).
 */
export interface MinHashStrategyOptions {
  /** Number of MinHash permutations. Must be divisible by `bands`. Default `128`. */
  readonly signatureSize?: number;
  /** Number of LSH bands (`rows = signatureSize / bands`). Default `16`. */
  readonly bands?: number;
  /** Word-shingle size. Default `3`. */
  readonly shingleSize?: number;
  /**
   * Minimum length (chars after trim) before a job's text is considered
   * MinHashable. Below this we skip the job — short text gives noisy
   * signatures. Default `80`.
   */
  readonly minTextLength?: number;
  /**
   * Verification threshold applied to each LSH candidate pair. Pairs below
   * this signature-similarity are dropped. Default `0.85`.
   */
  readonly similarityThreshold?: number;
  /**
   * Cap on candidate pairs evaluated per LSH bucket. Protects against
   * pathological buckets (e.g. boilerplate descriptions). Default `200`.
   */
  readonly maxBucketSize?: number;
  /** Deterministic seed for permutation coefficients. Default `0xCAFEBABE`. */
  readonly seed?: number;
}

interface SignedJob {
  readonly job: PreparedJob;
  readonly signature: Uint32Array;
}

/**
 * Stage 2 — MinHash + LSH near-duplicate detection on long-form text.
 *
 * Pipeline:
 *  1. Pick text per job (`description` if present, else `title + company`).
 *  2. Skip jobs whose text is too short (`minTextLength`).
 *  3. Compute MinHash signature → split into LSH band-keys.
 *  4. Group jobs by band-key (any shared band ⇒ candidate pair).
 *  5. For each candidate pair, verify Jaccard estimate ≥ `similarityThreshold`.
 *  6. Emit verified pairs as 2-element clusters; the service's Union-Find
 *     merges those with the Stage-1 hash clusters.
 *
 * The strategy is pure — no I/O, no global state, fully deterministic given
 * the same inputs and options. Allocation-light: signatures are typed
 * arrays; bucket maps are cleared once the partition is materialised.
 *
 * Spec 003 / FR-2 stage 2.
 */
export class MinHashStrategy implements IDedupStrategy {
  readonly name = 'minhash';

  private readonly hasher: MinHasher;
  private readonly bands: number;
  private readonly minTextLength: number;
  private readonly similarityThreshold: number;
  private readonly maxBucketSize: number;

  constructor(opts: MinHashStrategyOptions = {}) {
    const signatureSize = opts.signatureSize ?? 128;
    const bands = opts.bands ?? 16;
    if (signatureSize % bands !== 0) {
      throw new Error(
        `signatureSize (${signatureSize}) must be divisible by bands (${bands})`,
      );
    }
    this.bands = bands;
    this.minTextLength = opts.minTextLength ?? 80;
    this.similarityThreshold = opts.similarityThreshold ?? 0.85;
    this.maxBucketSize = opts.maxBucketSize ?? 200;
    this.hasher = new MinHasher({
      signatureSize,
      shingleSize: opts.shingleSize ?? 3,
      seed: opts.seed,
    });
  }

  cluster(input: ReadonlyArray<PreparedJob>): ClusterPartition {
    if (input.length < 2) return { clusters: [] };

    // Build signatures for jobs with sufficient text.
    const signed: SignedJob[] = [];
    for (let i = 0; i < input.length; i++) {
      const job = input[i];
      const text = pickText(job);
      if (text.length < this.minTextLength) continue;
      const sig = this.hasher.signature(text);
      if (!sig) continue;
      signed.push({ job, signature: sig });
    }
    if (signed.length < 2) return { clusters: [] };

    // LSH bucketing — `signed` indices stored per band-key.
    const buckets = new Map<string, number[]>();
    for (let i = 0; i < signed.length; i++) {
      const keys = lshBandKeys(signed[i].signature, this.bands);
      for (const key of keys) {
        const bucket = buckets.get(key);
        if (bucket) bucket.push(i);
        else buckets.set(key, [i]);
      }
    }

    // Verify candidate pairs and emit each verified pair as a 2-cluster.
    // Avoid re-evaluating the same pair across multiple band collisions.
    const seenPairs = new Set<number>();
    const clusters: number[][] = [];

    buckets.forEach((bucket) => {
      if (bucket.length < 2) return;
      const cap = Math.min(bucket.length, this.maxBucketSize);
      for (let i = 0; i < cap; i++) {
        for (let j = i + 1; j < cap; j++) {
          const a = bucket[i];
          const b = bucket[j];
          const lo = a < b ? a : b;
          const hi = a < b ? b : a;
          // Encode pair as a 53-bit integer key (safe for Set numbers).
          // signed.length is bounded by input.length; for 10 K jobs the
          // pair-key fits comfortably under Number.MAX_SAFE_INTEGER.
          const pairKey = lo * 0x200000 + hi;
          if (seenPairs.has(pairKey)) continue;
          seenPairs.add(pairKey);
          const sim = signatureSimilarity(signed[lo].signature, signed[hi].signature);
          if (sim >= this.similarityThreshold) {
            clusters.push([signed[lo].job.index, signed[hi].job.index]);
          }
        }
      }
    });

    return { clusters };
  }
}

/**
 * Resolve the text used to build a job's MinHash signature. We prefer the
 * description (long-form, high-information) but fall back to the
 * title + company combination so jobs with empty descriptions still get a
 * deterministic signature when the text is long enough overall.
 */
function pickText(job: PreparedJob): string {
  const desc = job.raw.description ?? '';
  if (desc.length > 0) return desc;
  const title = job.raw.title ?? '';
  const company = job.raw.companyName ?? '';
  return `${title} ${company}`.trim();
}
