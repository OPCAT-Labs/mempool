import bitcoinClient from './bitcoin/bitcoin-client';

interface RecommendedFees {
  fastestFee: number,
  halfHourFee: number,
  hourFee: number,
  economyFee: number,
  minimumFee: number,
}

class FeeApi {
  private cachedFees: RecommendedFees | null = null;

  constructor() {
    this.updateFees();
    setInterval(() => this.updateFees(), 60000); // update every minute
  }

  private async updateFees(): Promise<void> {
    try {
      const feeRate = await bitcoinClient.getBlockMinFee();
      const feeRateSatPerByte = feeRate * 100000; // BTC/kB -> sat/vB
      const minFee = feeRateSatPerByte;
      this.cachedFees = {
        fastestFee: minFee,
        halfHourFee: minFee,
        hourFee: minFee,
        economyFee: minFee,
        minimumFee: minFee
      };
    } catch (e) {
      console.error('Failed to update fees from RPC:', e);
    }
  }

  public getRecommendedFee(): RecommendedFees {
    if (this.cachedFees) {
      return this.cachedFees;
    }
    // default value
    return {
      fastestFee: 1,
      halfHourFee: 1,
      hourFee: 1,
      economyFee: 1,
      minimumFee: 1,
    };
  }
}

export default new FeeApi();
