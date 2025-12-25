import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { delay, switchMap, map, catchError } from 'rxjs/operators';
import { TokenBalance, TokenInfo, TrackerService } from './tracker.service';
import { CatService } from './cat.service';
import { ElectrsApiService } from './electrs-api.service';
import { Transaction } from '../interfaces/electrs.interface';

export interface Cat20Balance extends TokenBalance {
  tokenInfo: TokenInfo;
  balance: string;
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
    // todo: implement real API call
    return of(1234);
  }

  getTotalHolders(tokenId: string): Observable<number> {
    // todo: implement real API call
    return of(567);
  }

  getTotalSupply(tokenId: string): Observable<string> {
    // todo: implement real API call  
    return of('10000000000001');
  }

  searchToken(searchText: string): Observable<Cat20Token[]> {
    const isSearchId = this.catService.isTokenIdOrScriptHash(searchText);
    if (isSearchId) {
      return this.catService.getCat20TokenInfo(searchText).pipe(
        map(tokenInfo => tokenInfo ? [tokenInfo as Cat20Token] : [])
      );
    } else {
      // todo, use search api
      return this.catService.getCat20TokenInfo('14a1404898f94add5d07906fa34377cd839b29ce1758a23311f5182413c2e13f_0').pipe(
        map(tokenInfo => tokenInfo ? [tokenInfo as Cat20Token] : [])
      );
      // return of([]); // No name search implemented yet
    }
  }

  getTokenHolders(tokenId: string, offset: number, limit: number): Observable<{
    holders: Cat20Holder[]
  }> {
     const mockHolders: Cat20Holder[] = Array.from({ length: limit }, (_, i) => ({
      address: `bc1qholder${(offset - 1) * limit + i}`.padEnd(42, '0'),
      balance: (Math.random() * 10000000000).toFixed(0),
      percentage: Math.random() * 10
    }));

    return of({
      holders: mockHolders,
    })
  }

  getTokenTransactions(tokenId: string, offset: number, limit: number): Observable<{
    txs: Transaction[]
    total: number;
  }> {
    // todo use api to get txids by tokenId
    const txids = [
      '65be16be8f9846043516a1b221aaa3c6e25010c39f7d4ad21fd0413dcfbbc214',
      '8fe94cc5b497a7c3d8c80bb09da714f4debb685662ab4f5a4006529f7cefd01a',
      '76d534bd06db798dad825642dbb67c483c77acb56c2093a536ce43123a2bc6df',
      '985e97928562fe93d8b88c790d5f5f16b45974224dfe099e5d76b8122c5d84d0',
    ];
    const total = txids.length;

    // Fetch all transactions in parallel
    const txObservables = txids.map(txid =>
      this.electrsApiService.getTransaction$(txid).pipe(
        catchError(error => {
          console.error(`Error fetching transaction ${txid}:`, error);
          return of(null);
        })
      )
    );

    return forkJoin(txObservables).pipe(
      switchMap(transactions => {
        // Filter out null transactions (failed requests)
        const validTransactions = transactions.filter(tx => tx !== null) as Transaction[];

        // If no valid transactions, return empty result
        if (validTransactions.length === 0) {
          return of({ txs: [], total });
        }

        // Add CAT info to each transaction
        const txsWithCatInfo = validTransactions.map(tx =>
          this.catService.addCatInfoToTx(tx)
        );

        return forkJoin(txsWithCatInfo).pipe(
          map(txs => ({ txs, total }))
        );
      }),
      catchError(error => {
        console.error('Error fetching CAT20 transactions:', error);
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

        // 2. For each token balance, get token info from CatService
        const balanceWithInfoObservables = balances.map(balance =>
          this.catService.getCat20TokenInfo(balance.tokenId).pipe(
            map(tokenInfo => {
              // Map TokenInfo to Cat20Token format
              
              const cat20Balance: Cat20Balance = {
                tokenId: balance.tokenId,
                confirmed: balance.confirmed,
                balance: balance.confirmed,
                tokenInfo: tokenInfo,
              };

              return cat20Balance;
            }),
            catchError(error => {
              console.error(`Error fetching token info for ${balance.tokenId}:`, error);
              // Return null for failed requests
              return of(null);
            })
          )
        );

        // Wait for all token info requests to complete
        return forkJoin(balanceWithInfoObservables).pipe(
          map(results => results.filter(result => result !== null) as Cat20Balance[])
        );
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
    const txids = [
      '65be16be8f9846043516a1b221aaa3c6e25010c39f7d4ad21fd0413dcfbbc214',
      '76d534bd06db798dad825642dbb67c483c77acb56c2093a536ce43123a2bc6df',
      '8fe94cc5b497a7c3d8c80bb09da714f4debb685662ab4f5a4006529f7cefd01a',
      '985e97928562fe93d8b88c790d5f5f16b45974224dfe099e5d76b8122c5d84d0',
    ];

    // Calculate total count
    const total = txids.length;

    console.log(`Fetching CAT20 transactions for address ${address} with offset ${offset} and limit ${limit}`);
    // Apply pagination to txids

    // Fetch all transactions in parallel
    const txObservables = txids.map(txid =>
      this.electrsApiService.getTransaction$(txid).pipe(
        catchError(error => {
          console.error(`Error fetching transaction ${txid}:`, error);
          return of(null);
        })
      )
    );

    return forkJoin(txObservables).pipe(
      switchMap(transactions => {
        // Filter out null transactions (failed requests)
        const validTransactions = transactions.filter(tx => tx !== null) as Transaction[];

        // If no valid transactions, return empty result
        if (validTransactions.length === 0) {
          return of({ txs: [], total });
        }

        // Add CAT info to each transaction
        const txsWithCatInfo = validTransactions.map(tx =>
          this.catService.addCatInfoToTx(tx)
        );

        return forkJoin(txsWithCatInfo).pipe(
          map(txs => ({ txs, total }))
        );
      }),
      catchError(error => {
        console.error('Error fetching CAT20 transactions:', error);
        return of({ txs: [], total: 0 });
      })
    );
  }
}
