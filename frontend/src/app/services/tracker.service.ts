import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// Response wrapper interfaces
export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export interface ErrorResponse {
  code: number;
  msg: string;
  data: null;
}

// Health Check
export interface HealthCheckData {
  trackerBlockHeight: number;
  nodeBlockHeight: number | null;
  latestBlockHeight: number | null;
}

// Token Info
export interface TokenInfo {
  tokenId: string;
  genesisTxid: string;
  name: string;
  symbol: string;
  decimals: number;
  hasAdmin: boolean;
  minterScriptHash: string;
  adminScriptHash: string;
  tokenScriptHash: string;
  firstMintHeight: number;
  info: string;
  deployHeight: number;
  deployTxid: string;
}

// Token List
export interface TokenListData {
  list: TokenInfo[];
  total: number;
  trackerBlockHeight: number;
}

// Token UTXO
export interface TokenUtxoState {
  address: string;
  amount: string;
}

export interface TokenUtxo {
  txId: string;
  outputIndex: number;
  script: string;
  satoshis: number;
  data: string;
  state: TokenUtxoState;
}

export interface TokenUtxosData {
  utxos: TokenUtxo[];
  trackerBlockHeight: number;
}

// Token Balance
export interface TokenBalanceData {
  tokenId: string;
  confirmed: string;
  trackerBlockHeight: number;
}

// Token Total Minted Amount
export interface TokenTotalMintedAmountData {
  totalMintedAmount: string;
  trackerBlockHeight: number;
}

// Token Total Supply
export interface TokenTotalSupplyData {
  totalSupply: string;
  trackerBlockHeight: number;
}

// Token Holders
export interface TokenHolder {
  address: string;
  balance: string;
  rank: number;
  percentage: number;
}

export interface TokenHoldersData {
  holders: TokenHolder[];
  total: number;
  trackerBlockHeight: number;
}

// Total Holders
export interface TotalHoldersData {
  totalHolders: number;
  trackerBlockHeight: number;
}

// Total Txs
export interface TotalTxsData {
  totalTxs: number;
  trackerBlockHeight: number;
}

export interface TokenTxsData {
  total: number;
  txs: string[];
  trackerBlockHeight: number;
}

// Minter UTXO
export interface MinterUtxo {
  txId: string;
  outputIndex: number;
  script: string;
  satoshis: number;
  data: string;
}

export interface MinterUtxosData {
  utxos: MinterUtxo[];
  trackerBlockHeight: number;
}

// Minter UTXO Count
export interface MinterUtxoCountData {
  count: number;
  trackerBlockHeight: number;
}

// Token Balances
export interface TokenBalance {
  tokenId: string;
  confirmed: string;
  tokenScriptHash: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface TokenBalancesData {
  balances: TokenBalance[];
  trackerBlockHeight: number;
}

// Collection Balance
export interface CollectionBalance {
  collectionId: string;
  confirmed: string;
  collectionScriptHash: string;
  name: string;
  symbol: string;
}

export interface CollectionBalancesData {
  collections: CollectionBalance[];
  trackerBlockHeight: number;
}

// Transaction Data
export interface TransactionData {
  total: number;
  list: string[];
}

// Collection Info
export interface CollectionInfo {
  collectionId: string;
  genesisTxid: string;
  name: string;
  symbol: string;
  minterScriptHash: string;
  collectionScriptHash: string;
  firstMintHeight: number;
  deployTxid: string;
  deployHeight: number;
  metadata: string;
}

// Collection List
export interface CollectionListData {
  list: CollectionInfo[];
  total: number;
  trackerBlockHeight: number;
}

// NFT Info
export interface NftInfo {
  collectionId: string;
  localId: string;
  mintTxid: string;
  commitTxid: string;
  mintHeight: number;
  metadata: any;
}

// NFT UTXO
export interface NftUtxoState {
  address: string;
  localId: string;
}

export interface Utxo {
  txId: string;
  outputIndex: number;
  script: string;
  satoshis: number;
  data: string;
  state: NftUtxoState;
}

export interface NftUtxoData {
  utxo: Utxo;
  trackerBlockHeight: number;
}

// Collection UTXOs
export interface UtxosData {
  utxos: Utxo[];
  trackerBlockHeight: number;
}

// Collection NFT Local IDs
export interface CollectionNftLocalIds {
  localIds: string[];
  trackerBlockHeight: number;
}

// Collection Balance (single)
export interface CollectionBalanceData {
  collectionId: string;
  confirmed: string;
  trackerBlockHeight: number;
}

// Collection Mint Amount
export interface CollectionMintAmount {
  amount: string;
  trackerBlockHeight: number;
}

// Collection Total Supply
export interface CollectionTotalSupply {
  totalSupply: string;
  trackerBlockHeight: number;
}

// NFT Holders
export interface NftHolder {
  address: string;
  balance: string;
  rank: number;
  percentage: number;
}

export interface NftHolderData {
  holders: NftHolder[];
  total: number;
  trackerBlockHeight: number;
}

// Collection Total Txs
export interface CollectionTotalTxs {
  totalTxs: number;
  trackerBlockHeight: number;
}

// Collection Txs
export interface CollectionTxs {
  txs: string[];
  total: number;
  trackerBlockHeight: number;
}

// Collection Total Holders
export interface CollectionTotalHolders {
  totalHolders: number;
  trackerBlockHeight: number;
}

// Transaction Token Outputs
export interface TokenOutput {
  outputIndex: number;
  ownerPubKeyHash: string;
  tokenAmount?: string;
  tokenId?: string;
  localId?: string;
  collectionId?: string;
}

export interface TxTokenOutputsData {
  outputs: TokenOutput[];
}

@Injectable({
  providedIn: 'root'
})
export class TrackerService {
  private apiBaseUrl = '/api/tracker/api';

  constructor(private http: HttpClient) { }

  /**
   * Helper method to extract data from API response and handle errors
   */
  private handleResponse<T>(response: ApiResponse<T>): T {
    if (response.code !== 0) {
      throw new Error(response.msg || 'Unknown error occurred');
    }
    return response.data;
  }

  // Health Check
  checkHealth(): Observable<HealthCheckData> {
    return this.http.get<ApiResponse<HealthCheckData>>(`${this.apiBaseUrl}/`)
      .pipe(map(response => this.handleResponse(response)));
  }

  // Token endpoints
  getTokens(offset?: number, limit?: number): Observable<TokenListData> {
    let params = new HttpParams();
    if (offset !== undefined) {
      params = params.set('offset', offset.toString());
    }
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<ApiResponse<TokenListData>>(
      `${this.apiBaseUrl}/tokens`,
      { params }
    ).pipe(map(response => this.handleResponse(response)));
  }

  searchTokens(q: string, offset?: number, limit?: number): Observable<TokenInfo[]> {
    let params = new HttpParams();
    params = params.set('q', q);
    if (offset !== undefined) {
      params = params.set('offset', offset.toString());
    }
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<ApiResponse<{ tokens: TokenInfo[] }>>(
      `${this.apiBaseUrl}/tokens/search`,
      { params }
    ).pipe(map(response => response?.data?.tokens || []));
  }

  getTokenInfo(tokenIdOrTokenScriptHash: string): Observable<TokenInfo> {
    return this.http.get<ApiResponse<TokenInfo>>(
      `${this.apiBaseUrl}/tokens/${tokenIdOrTokenScriptHash}`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getTokenIcon(tokenIdOrTokenScriptHash: string): string {
    return `${this.apiBaseUrl}/tokens/${tokenIdOrTokenScriptHash}/icon`;
  }

  getTokenTotalHolders(tokenIdOrTokenScriptHash: string): Observable<TotalHoldersData> {
    return this.http.get<ApiResponse<TotalHoldersData>>(
      `${this.apiBaseUrl}/tokens/${tokenIdOrTokenScriptHash}/totalHolders`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getTokenTotalTxs(tokenIdOrTokenScriptHash: string): Observable<TotalTxsData> {
    return this.http.get<ApiResponse<TotalTxsData>>(
      `${this.apiBaseUrl}/tokens/${tokenIdOrTokenScriptHash}/totalTxs`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getTokenTxs(
    tokenIdOrTokenScriptHash: string,
    offset?: number,
    limit?: number
  ): Observable<TokenTxsData> {
    let params = new HttpParams();
    if (offset !== undefined) {
      params = params.set('offset', offset.toString());
    }
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<ApiResponse<TokenTxsData>>(
      `${this.apiBaseUrl}/tokens/${tokenIdOrTokenScriptHash}/txs`,
      { params }
    ).pipe(map(response => this.handleResponse(response)));
  }

  getTokenUtxosByOwnerAddress(
    tokenIdOrTokenScriptHash: string,
    ownerAddrOrPkh: string,
    offset?: number,
    limit?: number
  ): Observable<TokenUtxosData> {
    let params = new HttpParams();
    if (offset !== undefined) {
      params = params.set('offset', offset.toString());
    }
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<ApiResponse<TokenUtxosData>>(
      `${this.apiBaseUrl}/tokens/${tokenIdOrTokenScriptHash}/addresses/${ownerAddrOrPkh}/utxos`,
      { params }
    ).pipe(map(response => this.handleResponse(response)));
  }

  getTokenBalanceByOwnerAddress(
    tokenIdOrTokenScriptHash: string,
    ownerAddrOrPkh: string
  ): Observable<TokenBalanceData> {
    return this.http.get<ApiResponse<TokenBalanceData>>(
      `${this.apiBaseUrl}/tokens/${tokenIdOrTokenScriptHash}/addresses/${ownerAddrOrPkh}/balance`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getTokenTotalMintedAmount(tokenIdOrTokenScriptHash: string): Observable<TokenTotalMintedAmountData> {
    return this.http.get<ApiResponse<TokenTotalMintedAmountData>>(
      `${this.apiBaseUrl}/tokens/${tokenIdOrTokenScriptHash}/totalMintedAmount`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getTokenTotalSupply(tokenIdOrTokenScriptHash: string): Observable<TokenTotalSupplyData> {
    return this.http.get<ApiResponse<TokenTotalSupplyData>>(
      `${this.apiBaseUrl}/tokens/${tokenIdOrTokenScriptHash}/totalSupply`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getTokenHolders(
    tokenIdOrTokenScriptHash: string,
    offset?: number,
    limit?: number
  ): Observable<TokenHoldersData> {
    let params = new HttpParams();
    if (offset !== undefined) {
      params = params.set('offset', offset.toString());
    }
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<ApiResponse<TokenHoldersData>>(
      `${this.apiBaseUrl}/tokens/${tokenIdOrTokenScriptHash}/holders`,
      { params }
    ).pipe(map(response => this.handleResponse(response)));
  }

  // Minter endpoints
  getMinterUtxos(
    tokenIdOrTokenScriptHash: string,
    offset?: number,
    limit?: number
  ): Observable<MinterUtxosData> {
    let params = new HttpParams();
    if (offset !== undefined) {
      params = params.set('offset', offset.toString());
    }
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<ApiResponse<MinterUtxosData>>(
      `${this.apiBaseUrl}/minters/${tokenIdOrTokenScriptHash}/utxos`,
      { params }
    ).pipe(map(response => this.handleResponse(response)));
  }

  getMinterUtxoCount(tokenIdOrTokenScriptHash: string): Observable<MinterUtxoCountData> {
    return this.http.get<ApiResponse<MinterUtxoCountData>>(
      `${this.apiBaseUrl}/minters/${tokenIdOrTokenScriptHash}/utxoCount`
    ).pipe(map(response => this.handleResponse(response)));
  }

  // Address endpoints
  getTokenBalances(ownerAddrOrPkh: string): Observable<TokenBalancesData> {
    return this.http.get<ApiResponse<TokenBalancesData>>(
      `${this.apiBaseUrl}/addresses/${ownerAddrOrPkh}/balances`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getCollectionBalances(ownerAddrOrPkh: string): Observable<CollectionBalancesData> {
    return this.http.get<ApiResponse<CollectionBalancesData>>(
      `${this.apiBaseUrl}/addresses/${ownerAddrOrPkh}/collections`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getTokenTransactions(
    ownerAddrOrPkh: string,
    offset?: number,
    limit?: number
  ): Observable<TransactionData> {
    let params = new HttpParams();
    if (offset !== undefined) {
      params = params.set('offset', offset.toString());
    }
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<ApiResponse<TransactionData>>(
      `${this.apiBaseUrl}/addresses/${ownerAddrOrPkh}/tokenTxs`,
      { params }
    ).pipe(map(response => this.handleResponse(response)));
  }

  // Collection endpoints
  getCollections(offset?: number, limit?: number): Observable<CollectionListData> {
    let params = new HttpParams();
    if (offset !== undefined) {
      params = params.set('offset', offset.toString());
    }
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<ApiResponse<CollectionListData>>(
      `${this.apiBaseUrl}/collections`,
      { params }
    ).pipe(map(response => this.handleResponse(response)));
  }

  getCollectionInfo(collectionIdOrAddr: string): Observable<CollectionInfo> {
    return this.http.get<ApiResponse<CollectionInfo>>(
      `${this.apiBaseUrl}/collections/${collectionIdOrAddr}`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getCollectionContent(collectionIdOrAddr: string): Observable<Blob> {
    return this.http.get(
      `${this.apiBaseUrl}/collections/${collectionIdOrAddr}/content`,
      { responseType: 'blob' }
    );
  }

  getNftContent(collectionIdOrAddr: string, localId: number): Observable<Blob> {
    return this.http.get(
      `${this.apiBaseUrl}/collections/${collectionIdOrAddr}/localId/${localId}/content`,
      { responseType: 'blob' }
    );
  }

  getNftInfo(collectionIdOrAddr: string, localId: number): Observable<NftInfo> {
    return this.http.get<ApiResponse<NftInfo>>(
      `${this.apiBaseUrl}/collections/${collectionIdOrAddr}/localId/${localId}`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getNftUtxo(collectionIdOrAddr: string, localId: number): Observable<NftUtxoData> {
    return this.http.get<ApiResponse<NftUtxoData>>(
      `${this.apiBaseUrl}/collections/${collectionIdOrAddr}/localId/${localId}/utxo`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getCollectionUtxosByOwnerAddress(
    collectionIdOrAddr: string,
    ownerAddrOrPkh: string,
    offset?: number,
    limit?: number
  ): Observable<UtxosData> {
    let params = new HttpParams();
    if (offset !== undefined) {
      params = params.set('offset', offset.toString());
    }
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<ApiResponse<UtxosData>>(
      `${this.apiBaseUrl}/collections/${collectionIdOrAddr}/addresses/${ownerAddrOrPkh}/utxos`,
      { params }
    ).pipe(map(response => this.handleResponse(response)));
  }

  getCollectionNftLocalIdsByOwnerAddress(
    collectionIdOrAddr: string,
    ownerAddrOrPkh: string
  ): Observable<CollectionNftLocalIds> {
    return this.http.get<ApiResponse<CollectionNftLocalIds>>(
      `${this.apiBaseUrl}/collections/${collectionIdOrAddr}/addresses/${ownerAddrOrPkh}/localIds`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getCollectionBalanceByOwnerAddress(
    collectionIdOrAddr: string,
    ownerAddrOrPkh: string
  ): Observable<CollectionBalanceData> {
    return this.http.get<ApiResponse<CollectionBalanceData>>(
      `${this.apiBaseUrl}/collections/${collectionIdOrAddr}/addresses/${ownerAddrOrPkh}/nftAmount`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getCollectionTotalMintedAmount(collectionIdOrAddr: string): Observable<CollectionMintAmount> {
    return this.http.get<ApiResponse<CollectionMintAmount>>(
      `${this.apiBaseUrl}/collections/${collectionIdOrAddr}/totalMintedAmount`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getCollectionTotalSupply(collectionIdOrAddr: string): Observable<CollectionTotalSupply> {
    return this.http.get<ApiResponse<CollectionTotalSupply>>(
      `${this.apiBaseUrl}/collections/${collectionIdOrAddr}/totalSupply`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getCollectionHolders(
    collectionIdOrAddr: string,
    offset?: number,
    limit?: number
  ): Observable<NftHolderData> {
    let params = new HttpParams();
    if (offset !== undefined) {
      params = params.set('offset', offset.toString());
    }
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<ApiResponse<NftHolderData>>(
      `${this.apiBaseUrl}/collections/${collectionIdOrAddr}/holders`,
      { params }
    ).pipe(map(response => this.handleResponse(response)));
  }

  getCollectionTotalTxs(collectionIdOrAddr: string): Observable<CollectionTotalTxs> {
    return this.http.get<ApiResponse<CollectionTotalTxs>>(
      `${this.apiBaseUrl}/collections/${collectionIdOrAddr}/totalTxs`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getCollectionTxs(
    collectionIdOrAddr: string,
    offset?: number,
    limit?: number
  ): Observable<CollectionTxs> {
    let params = new HttpParams();
    if (offset !== undefined) {
      params = params.set('offset', offset.toString());
    }
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }

    return this.http.get<ApiResponse<CollectionTxs>>(
      `${this.apiBaseUrl}/collections/${collectionIdOrAddr}/txs`,
      { params }
    ).pipe(map(response => this.handleResponse(response)));
  }

  getCollectionTotalHolders(collectionIdOrAddr: string): Observable<CollectionTotalHolders> {
    return this.http.get<ApiResponse<CollectionTotalHolders>>(
      `${this.apiBaseUrl}/collections/${collectionIdOrAddr}/totalHolders`
    ).pipe(map(response => this.handleResponse(response)));
  }

  // Transaction endpoints
  parseTransferTxTokenOutputs(txid: string): Observable<TxTokenOutputsData> {
    return this.http.get<ApiResponse<TxTokenOutputsData>>(
      `${this.apiBaseUrl}/tx/${txid}`
    ).pipe(map(response => this.handleResponse(response)));
  }

  parseDelegateContent(txid: string, inputIndex: number): Observable<Blob> {
    return this.http.get(
      `${this.apiBaseUrl}/tx/${txid}/content/${inputIndex}`,
      { responseType: 'blob' }
    );
  }
}