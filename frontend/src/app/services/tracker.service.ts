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
  minterScriptHash: string;
  tokenScriptHash: string;
  firstMintHeight: number;
  info: string;
  iconUrl: string;
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
  satoshis: string;
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

// Token Mint Amount
export interface TokenMintAmountData {
  amount: string;
  trackerBlockHeight: number;
}

// Token Circulation
export interface TokenCirculationData {
  amount: string;
  trackerBlockHeight: number;
}

// Token Holders
export interface TokenHolder {
  ownerPubKeyHash: string;
  balance: string;
}

export interface TokenHoldersData {
  holders: TokenHolder[];
  trackerBlockHeight: number;
}

// Minter UTXO
export interface MinterUtxo {
  txid: string;
  outputIndex: number;
  lockingScript: string;
  satoshis: string;
  blockHeight: number;
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
}

export interface TokenBalancesData {
  balances: TokenBalance[];
  trackerBlockHeight: number;
}

// Collection Balance
export interface CollectionBalance {
  collectionId: string;
  confirmed: string;
}

export interface CollectionBalancesData {
  collections: CollectionBalance[];
  trackerBlockHeight: number;
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
  metadata: string;
}

// NFT Info
export interface NftInfo {
  collectionId: string;
  localId: number;
  mintTxid: string;
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
  satoshis: string;
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
  confirmed: number;
  trackerBlockHeight: number;
}

// Collection Mint Amount
export interface CollectionMintAmount {
  amount: string;
  trackerBlockHeight: number;
}

// Collection Circulation
export interface CollectionCirculation {
  amount: string;
  trackerBlockHeight: number;
}

// NFT Holders
export interface NftHolder {
  ownerPubKeyHash: string;
  nftAmount: string;
}

export interface NftHolderData {
  holders: NftHolder[];
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
  getTokenInfo(tokenIdOrTokenScriptHash: string): Observable<TokenInfo> {
    return this.http.get<ApiResponse<TokenInfo>>(
      `${this.apiBaseUrl}/tokens/${tokenIdOrTokenScriptHash}`
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

  getTokenMintAmount(tokenIdOrTokenScriptHash: string): Observable<TokenMintAmountData> {
    return this.http.get<ApiResponse<TokenMintAmountData>>(
      `${this.apiBaseUrl}/tokens/${tokenIdOrTokenScriptHash}/mintAmount`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getTokenCirculation(tokenIdOrTokenScriptHash: string): Observable<TokenCirculationData> {
    return this.http.get<ApiResponse<TokenCirculationData>>(
      `${this.apiBaseUrl}/tokens/${tokenIdOrTokenScriptHash}/circulation`
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

  // Collection endpoints
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

  getCollectionMintAmount(collectionIdOrAddr: string): Observable<CollectionMintAmount> {
    return this.http.get<ApiResponse<CollectionMintAmount>>(
      `${this.apiBaseUrl}/collections/${collectionIdOrAddr}/mintAmount`
    ).pipe(map(response => this.handleResponse(response)));
  }

  getCollectionCirculation(collectionIdOrAddr: string): Observable<CollectionCirculation> {
    return this.http.get<ApiResponse<CollectionCirculation>>(
      `${this.apiBaseUrl}/collections/${collectionIdOrAddr}/circulation`
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


