import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { delay, switchMap, map, catchError } from 'rxjs/operators';import { TokenBalance, TokenInfo, TrackerService } from './tracker.service';
import { CatService } from './cat.service';
import { ElectrsApiService } from './electrs-api.service';
import { Transaction } from '../interfaces/electrs.interface';

export interface Cat20Balance {
  tokenId: string;
  confirmed: string;
  tokenScriptHash: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface Cat20Token extends TokenInfo {
  tokenId: string;
  name: string;
  symbol: string;
  decimals: number;
  deployTxid: string;
  deployHeight: number;
  deployTime: number;
  deployBlock: number;
  minterScriptHash: string;
  tokenScriptHash: string;
  iconUrl: string;
  genesisTxid: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface Cat20Holder {
  address: string;
  balance: string;
  percentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class Cat20ApiService {
  private apiBaseUrl = '/api/cat20/api';

  // Mock data for development
  private useMockData = true;

  constructor(
    private http: HttpClient,
    private tracker: TrackerService,
    private catService: CatService,
    private electrsApiService: ElectrsApiService,
  ) { }



  /**
   * Get token information by token ID or script hash
   */
  getToken$(tokenIdOrScriptHash: string): Observable<Cat20Token> {
    return this.catService.getCat20TokenInfo(tokenIdOrScriptHash) as any;
  }


  getTotalTxs(tokenId: string): Observable<number> {
    return this.tracker.getTokenTotalTxs(tokenId).pipe(
      switchMap(totalTxsData => {
        return of(totalTxsData.totalTxs);
      }),
      catchError(error => {
        console.error('Error fetching token total transactions:', error);
        return of(0);
      })
    );
  }

  getTotalHolders(tokenId: string): Observable<number> {
    return this.tracker.getTokenTotalHolders(tokenId).pipe(
      switchMap(totalHoldersData => {
        return of(totalHoldersData.totalHolders);
      }),
      catchError(error => {
        console.error('Error fetching token total holders:', error);
        return of(0);
      })
    );
  }

  getTotalSupply(tokenId: string): Observable<string> {
    return this.tracker.getTokenTotalSupply(tokenId).pipe(
      switchMap(totalSupplyData => {
        return of(totalSupplyData.totalSupply);
      }),
      catchError(error => {
        console.error('Error fetching token total supply:', error);
        return of('0');
      })
    );
  }

  searchToken(searchText: string): Observable<Cat20Token[]> {
    return this.tracker.searchTokens(searchText).pipe(
      switchMap(searchTokenData => {
        return of(searchTokenData as Cat20Token[]);
      }),
      catchError(error => {
        console.error('Error fetching search tokens:', error);
        return of([]);
      })
    );
  }

  getTokenHolders(tokenId: string, offset: number, limit: number): Observable<{
    holders: Cat20Holder[]
  }> {

    return this.tracker.getTokenHolders(tokenId, offset, limit).pipe(
      switchMap(holdersData => {
        const holders = holdersData.holders.map(holder => ({
          address: holder.address,
          balance: holder.balance,
          percentage: holder.percentage
        }));
        return of({ holders });
      }),
      catchError(error => {
        console.error('Error fetching token holders:', error);
        return of({ holders: [] });
      })
    )
  }

  getTokenTransactions(tokenId: string, offset: number, limit: number): Observable<{
    txs: Transaction[]
    total: number;
  }> {
    return this.tracker.getTokenTxs(tokenId, offset, limit).pipe(
      switchMap(txsData => {
        const txids = txsData.txs;
        const total = txsData.total;

        // If no transactions, return empty array
        if (txids.length === 0) {
          return of({ txs: [], total });
        }

        // Fetch all transactions in a single bulk request
        return this.electrsApiService.getTxsByIds$(txids).pipe(
          map(txs => ({ txs: txs.filter(tx => tx !== null) as Transaction[], total })),
          catchError(error => {
            console.error('Error fetching transactions in bulk:', error);
            return of({ txs: [], total });
          })
        );
      }),
      catchError(error => {
        console.error('Error fetching token transactions:', error);
        return of({ txs: [], total: 0 });
      })
    );
  }


  getCat20Balances(address: string): Observable<Cat20Balance[]> {
    // 1. Get token balances from TrackerService, the confirmed is the balance
    return this.tracker.getTokenBalances(address).pipe(
      switchMap(balancesData => {
        const balances = balancesData.balances;

        // Handle empty balances array
        if (!balances || balances.length === 0) {
          return of([]);
        }
        return of(balances)
      }),
      catchError(error => {
        console.error('Error fetching token balances:', error);
        return of([]);
      })
    );
  }

  getCat20Transactions(address: string, offset: number, limit: number): Observable<{
    txs: Transaction[]
    total: number;
  }> {
    return this.tracker.getTokenTransactions(address, offset, limit).pipe(
      switchMap(txsData => {
        const txids = txsData.list;
        const total = txsData.total;

        // Fetch all transactions in a single bulk request
        return this.electrsApiService.getTxsByIds$(txids).pipe(
          map(txs => ({ txs: txs.filter(tx => tx !== null) as Transaction[], total })),
          catchError(error => {
            console.error('Error fetching transactions in bulk:', error);
            return of({ txs: [], total });
          })
        );
      }),
      catchError(error => {
        console.error('Error fetching CAT20 transactions:', error);
        return of({ txs: [], total: 0 });
      })
    )
  }
}
