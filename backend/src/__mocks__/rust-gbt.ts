/**
 * Jest mock for the rust-gbt native module.
 * RUST_GBT is disabled for OPCAT compatibility, so this mock allows
 * tests to import the module without loading native binaries.
 * The GbtGenerator.make() returns an empty result so gbt-tests are skipped.
 */

export class GbtGenerator {
  constructor(_blockWeightUnits?: number, _sigopsLimit?: number) {}

  async make(_mempool: unknown[], _accelerations: unknown[], _maxUid: number): Promise<GbtResult> {
    return new GbtResult();
  }
}

export class GbtResult {
  blocks: number[][] = [];
  clusters: number[][] = [];

  constructor() {}
}

export type ThreadTransaction = {
  uid: number;
  order: number;
  fee: number;
  weight: number;
  sigops: number;
  effectiveFeePerVsize: number;
  inputs: number[];
};

export type ThreadAcceleration = unknown;
