import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { of, Subscription, forkJoin } from 'rxjs';
import { StateService } from '@app/services/state.service';
import { SeoService } from '@app/services/seo.service';
import { Cat20ApiService, Cat20Token, Cat20Holder } from '@app/services/cat20-api.service';
import { Transaction } from '@app/interfaces/electrs.interface';

@Component({
  selector: 'app-cat20-token',
  templateUrl: './cat20-token.component.html',
  styleUrls: ['./cat20-token.component.scss'],
})
export class Cat20TokenComponent implements OnInit, OnDestroy {
  tokenId: string;
  token: Cat20Token;
  transactions: Transaction[] = [];
  holders: Cat20Holder[] = [];
  isLoading = true;
  isLoadingTransactions = false;
  isLoadingHolders = false;
  error: any;
  mainSubscription: Subscription;

  // Token statistics
  totalSupply: string = '0';
  totalHolders: number = 0;
  totalTransfers: number = 0;

  // Pagination for transactions
  transactionsOffset = 0;
  transactionsLimit = 25;
  fullyTransactionsLoaded = false;

  // Pagination for holders
  holdersOffset = 0;
  holdersLimit = 25;
  fullyHoldersLoaded = false;

  // Tab state
  activeTab: 'transactions' | 'holders' = 'transactions';

  constructor(
    private route: ActivatedRoute,
    public stateService: StateService,
    private seoService: SeoService,
    private cat20ApiService: Cat20ApiService
  ) {}

  ngOnInit(): void {
    this.mainSubscription = this.route.paramMap
      .pipe(
        switchMap((params: ParamMap) => {
          this.error = undefined;
          this.isLoading = true;
          this.token = null;
          this.transactions = [];
          this.holders = [];
          this.transactionsOffset = 0;
          this.holdersOffset = 0;
          this.fullyTransactionsLoaded = false;
          this.fullyHoldersLoaded = false;
          this.tokenId = params.get('tokenId') || '';

          this.seoService.setTitle(
            `CAT20 Token: ${this.tokenId}`
          );
          this.seoService.setDescription(
            `View CAT20 token ${this.tokenId} information, including total supply, holders, and transfer history.`
          );

          return this.cat20ApiService.getToken$(this.tokenId);
        }),
        tap((token: Cat20Token) => {
          this.token = token;
          this.isLoading = false;

          // Update title with token name if available
          if (token.name) {
            this.seoService.setTitle(
              `${token.name} (${token.symbol}) - CAT20 Token`
            );
          }
        }),
        catchError((error) => {
          console.error('Error loading token:', error);
          this.error = error;
          this.isLoading = false;
          this.seoService.logSoft404();
          return of(null);
        })
      )
      .subscribe(() => {
        // Fetch token statistics after token data is loaded
        this.fetchTokenStatistics();
        // Fetch initial transactions
        this.loadTransactions();
      });
  }

  private loadTransactions(): void {
    if (!this.tokenId || this.isLoadingTransactions || this.fullyTransactionsLoaded) {
      return;
    }

    this.isLoadingTransactions = true;

    this.cat20ApiService.getTokenTransactions(
      this.tokenId,
      this.transactionsOffset,
      this.transactionsLimit
    ).subscribe({
      next: (result: { txs: Transaction[], total: number }) => {
        if (result.txs.length === 0) {
          this.fullyTransactionsLoaded = true;
        } else {
          this.transactions = [...this.transactions, ...result.txs];
          this.totalTransfers = result.total;
          this.transactionsOffset += result.txs.length;
          if (this.transactions.length >= result.total) {
            this.fullyTransactionsLoaded = true;
          }
        }
        this.isLoadingTransactions = false;
      },
      error: (error: any) => {
        console.error('Error loading transactions:', error);
        this.isLoadingTransactions = false;
      }
    });
  }

  loadMoreTransactions(): void {
    this.loadTransactions();
  }

  private loadHolders(): void {
    if (!this.tokenId || this.isLoadingHolders || this.fullyHoldersLoaded) {
      return;
    }

    this.isLoadingHolders = true;

    this.cat20ApiService.getTokenHolders(
      this.tokenId,
      this.holdersOffset,
      this.holdersLimit
    ).subscribe({
      next: (result: { holders: Cat20Holder[] }) => {
        if (result.holders.length === 0) {
          this.fullyHoldersLoaded = true;
        } else {
          this.holders = [...this.holders, ...result.holders];
          this.holdersOffset += result.holders.length;
          // If we received less than the limit, we've loaded all holders
          if (result.holders.length < this.holdersLimit) {
            this.fullyHoldersLoaded = true;
          }
        }
        this.isLoadingHolders = false;
      },
      error: (error: any) => {
        console.error('Error loading holders:', error);
        this.isLoadingHolders = false;
      }
    });
  }

  loadMoreHolders(): void {
    this.loadHolders();
  }

  private fetchTokenStatistics() {
    if (!this.tokenId) {
      return;
    }

    forkJoin({
      totalSupply: this.cat20ApiService.getTotalSupply(this.tokenId),
      totalHolders: this.cat20ApiService.getTotalHolders(this.tokenId),
      totalTransfers: this.cat20ApiService.getTotalTxs(this.tokenId)
    }).subscribe({
      next: (stats: { totalSupply: string; totalHolders: number; totalTransfers: number }) => {
        this.totalSupply = stats.totalSupply;
        this.totalHolders = stats.totalHolders;
        this.totalTransfers = stats.totalTransfers;
      },
      error: (error: any) => {
        console.error('Error loading token statistics:', error);
      }
    });
  }


  setActiveTab(tab: 'transactions' | 'holders'): void {
    this.activeTab = tab;

    // Load holders when switching to holders tab for the first time
    if (tab === 'holders' && this.holders.length === 0 && !this.isLoadingHolders) {
      this.loadHolders();
    }
  }

  getMetadataKeys(): string[] {
    if (!this.token?.metadata) {
      return [];
    }
    return Object.keys(this.token.metadata);
  }

  formatMetadataKey(key: string): string {
    // Convert camelCase or snake_case to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  getFormattedTotalSupply(): string {
    if (!this.token || !this.totalSupply) {
      return '0';
    }

    const decimals = this.token.decimals || 0;
    const supply = parseFloat(this.totalSupply);
    const divisor = Math.pow(10, decimals);
    const formatted = supply / divisor;

    // Format with appropriate decimal places
    return formatted.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  }

  formatHolderBalance(balance: string): string {
    if (!this.token) {
      return '0';
    }

    const decimals = this.token.decimals || 0;
    const balanceNum = parseFloat(balance);
    const divisor = Math.pow(10, decimals);
    const formatted = balanceNum / divisor;

    return formatted.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  }

  ngOnDestroy(): void {
    if (this.mainSubscription) {
      this.mainSubscription.unsubscribe();
    }
  }
}
