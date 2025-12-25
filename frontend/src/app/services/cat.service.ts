import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map, switchMap, shareReplay, tap, finalize } from 'rxjs/operators';
import { TrackerService, TokenInfo } from './tracker.service';
import { Transaction, Vout, Vin, CatInfo } from '../interfaces/electrs.interface';
import { CAT20, ConstantsLib } from '@opcat-labs/cat-sdk'
import { Address, Script, hash256, sha256 } from '@opcat-labs/scrypt-ts-opcat'

@Injectable({
  providedIn: 'root'
})
export class CatService {

  constructor(
    private tracker: TrackerService
  ) { }

  // add a method to get cat20 token info by tokenIdOrScriptHash, the method should cache the result for future calls
  private cache: Map<string, any> = new Map();
  private pendingRequests: Map<string, Observable<any>> = new Map();

  isTokenIdOrScriptHash(input: string): boolean {
    const parts = input.split('_');
    if (parts.length > 2) return false;
    if (parts.length === 2) {
      const outputIndex = +parts[1]
      if (isNaN(outputIndex) || outputIndex < 0) {
        return false;
      }
    }
    const hexRegex = /^[0-9a-fA-F]{64}$/;
    const isHex = hexRegex.test(input);
    if (!isHex) {
      return false;
    }
    return parts[0].length === 64;
  }

  getCat20TokenInfo(tokenIdOrScriptHash: string): Observable<any> {
    // Return cached result if available
    if (this.cache.has(tokenIdOrScriptHash)) {
      return of(this.cache.get(tokenIdOrScriptHash));
    }

    // Return pending request if exists
    if (this.pendingRequests.has(tokenIdOrScriptHash)) {
      return this.pendingRequests.get(tokenIdOrScriptHash)!;
    }

    // Create new request with shareReplay to ensure single execution
    const request$ = this.tracker.getTokenInfo(tokenIdOrScriptHash).pipe(
      tap(response => {
        // Cache the response
        this.cache.set(tokenIdOrScriptHash, response);
        if (response) {
          this.cache.set(response.tokenId, response);
          this.cache.set(response.tokenScriptHash, response);
        }
      }),
      catchError(error => {
        console.error('Error fetching Cat20 token info:', error);
        return of(null);
      }),
      finalize(() => {
        // Remove from pending requests after completion (success or error)
        this.pendingRequests.delete(tokenIdOrScriptHash);
      }),
      shareReplay(1) // Share the result among all subscribers
    );

    // Store pending request
    this.pendingRequests.set(tokenIdOrScriptHash, request$);

    return request$;
  }


  detectAOutputIsCat20(vout: Vout): boolean {
    const isAddress = this.detectAOutputIsAddress(vout);
    if (isAddress) {
      return false;
    }
    try {
      const state = CAT20.deserializeState(vout.data)
      if (state.tag === ConstantsLib.OPCAT_CAT20_TAG) {
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  detectAOutputIsCat721(vout: Vout): boolean {
    const isAddress = this.detectAOutputIsAddress(vout);
    if (isAddress) {
      return false;
    }
    try {
      // const state = CAT20.deserializeState(vout.data)
      // if (state.tag === ConstantsLib.OPCAT_CAT721_TAG) {
      //   return true;
      // }
    } catch (e) {
      return false;
    }
    return false;
  }

  detectAOutputIsAddress(vout: Vout): boolean {
    try {
      Script.fromHex(vout.scriptpubkey).toAddress()
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Helper function to calculate SHA256 hash of scriptpubkey
   */
  private getScriptHash(scriptpubkey: string): string {
    return sha256(scriptpubkey)
  }

  /**
   * Detect if output is a CAT20 minter
   */
  private detectAOutputIsCat20Minter(vout: Vout): boolean {
    const isAddress = this.detectAOutputIsAddress(vout);
    if (isAddress) {
      return false;
    }
    return true;
  }

  addCatInfoToTx(tx: Transaction): Observable<Transaction> {
    // Step 1: Parse outputs to find CAT20 tokens
    const tokenScriptHashes = new Set<string>();
    const inputVoutScriptHashes = new Set<string>();
    const outputScriptHashes = new Set<string>();
    tx.vin.forEach((vin) => {
      if (!vin.prevout) return;
      inputVoutScriptHashes.add(this.getScriptHash(vin.prevout.scriptpubkey));
      if (this.detectAOutputIsCat20(vin.prevout)) {
        tokenScriptHashes.add(this.getScriptHash(vin.prevout.scriptpubkey));
      }
    });
    tx.vout.forEach((vout) => {
      outputScriptHashes.add(this.getScriptHash(vout.scriptpubkey));
      if (this.detectAOutputIsCat20(vout)) {
        tokenScriptHashes.add(this.getScriptHash(vout.scriptpubkey));
      }
    });

    // If no CAT20 tokens found, return original transaction
    if (tokenScriptHashes.size === 0) {
      return of(tx);
    }

    // Step 3: Fetch token info for all unique script hashes
    const tokenInfoObservables: Observable<{ scriptHash: string; info: TokenInfo | null }>[] = [];
    tokenScriptHashes.forEach(scriptHash => {
      tokenInfoObservables.push(
        this.getCat20TokenInfo(scriptHash).pipe(
          map(info => ({ scriptHash, info }))
        )
      );
    });

    // Step 4: Process all token info requests
    if (tokenInfoObservables.length === 0) {
      return of(tx);
    }

    return forkJoin(tokenInfoObservables).pipe(
      map(tokenInfos => {
        // Create a map of scriptHash -> TokenInfo
        const tokenScriptTokenInfoMap = new Map<string, TokenInfo>();
        const minterScriptTokenInfoMap = new Map<string, TokenInfo>();

        tokenInfos.forEach(({ scriptHash, info }) => {
          if (info) {
            tokenScriptTokenInfoMap.set(scriptHash, info);
            minterScriptTokenInfoMap.set(info.minterScriptHash, info);
          }
        });

        // Step 5: Validate outputs against inputs
        // For each output token, check if there's a corresponding input
        // Mark inputs with catInfo
        tx.vin.forEach((vin) => {
          if (!vin.prevout) return;
          const scriptHash = this.getScriptHash(vin.prevout.scriptpubkey);
          const tokenInfo = tokenScriptTokenInfoMap.get(scriptHash);
          if (tokenInfo) {
            const type = scriptHash === tokenInfo.minterScriptHash ? 'cat20Minter' : 'cat20';
            
            vin.prevout.catInfo = {
              tokenInfo: {
                info: tokenInfo,
              },
              type,
            };
            if (type === 'cat20') {
              const state = CAT20.deserializeState(vin.prevout.data);
              vin.prevout.catInfo!.tokenInfo!.cat20State = {
                amount: state.amount.toString(),
                // todo, convert to address
                address: state.ownerAddr,
              }
            }
          }
        })

        tx.vout.forEach((vout) => {
          const scriptHash = this.getScriptHash(vout.scriptpubkey);
          const tokenInfo = tokenScriptTokenInfoMap.get(scriptHash);
          if (tokenInfo) {
            const tokenScriptHash = tokenInfo.tokenScriptHash;
            const minterScriptHash = tokenInfo.minterScriptHash;

            // avoid false positive by checking if any input has the minter or token script hash
            const inputsHasMinterOrToken = inputVoutScriptHashes.has(tokenScriptHash) || inputVoutScriptHashes.has(minterScriptHash);
            if (inputsHasMinterOrToken) {
              const type = scriptHash === minterScriptHash ? 'cat20Minter' : 'cat20';
              vout.catInfo = {
                tokenInfo: {
                  info: tokenInfo,
                },
                type,
              }
              if (type === 'cat20') {
                const state = CAT20.deserializeState(vout.data);
                vout.catInfo!.tokenInfo!.cat20State = {
                  amount: state.amount.toString(),
                  // todo, convert to address
                  address: state.ownerAddr,
                }
              }
            };
          }
        })
        return tx;
      }),
      catchError(error => {
        console.error('Error adding CAT info to transaction:', error);
        return of(tx);
      })
    );
  }
}
