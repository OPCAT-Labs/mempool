import { Pipe, PipeTransform } from '@angular/core';
import { fromSupportedNetwork, Script, SupportedNetwork } from '@opcat-labs/scrypt-ts-opcat';
import { StateService } from '@app/services/state.service';

@Pipe({
  name: 'catOwnerAddress'
})
export class CatOwnerAddressPipe implements PipeTransform {
  constructor(private stateService: StateService) {}

  /**
   * Transforms a CAT20 owner address (which can be either a p2pkh script hex or a sha256 hash/script)
   * into a displayable format.
   *
   * @param ownerAddr - The owner address from CAT20 state (p2pkh script hex or sha256 hash/script)
   * @returns The converted address if it's a valid p2pkh script, otherwise the original value
   */
  transform(ownerAddr: string): string {
    if (!ownerAddr) {
      return '';
    }

    try {
      // Get current network and map to opcat network format
      const network = this.getOpcatNetwork();

      // Try to parse as a script and convert to address
      const script = Script.fromHex(ownerAddr);
      const address = script.toAddress(fromSupportedNetwork(network));

      if (address) {
        return address.toString();
      }
    } catch (e) {
      // If conversion fails, it's likely a sha256 hash or non-standard script
      // Return the original value
    }

    // Return the original value if it's not a convertible p2pkh script
    return ownerAddr;
  }

  /**
   * Maps mempool network names to opcat network format
   */
  private getOpcatNetwork(): SupportedNetwork {
    const network = this.stateService.network;
    const rootNetwork = this.stateService.env.ROOT_NETWORK;
    const baseModule = this.stateService.env.BASE_MODULE;
    console.log('Network info:', {
      network,
      rootNetwork,
      baseModule,
      url: window.location.pathname
    });

    // Map mempool network names to opcat network format
    switch (network) {
      case '': // mainnet
      case 'mainnet':
        return 'opcat-mainnet';
      case 'testnet':
      case 'testnet4':
      case 'signet':
        return 'opcat-testnet';
      default:
        // Default to testnet for any unknown network
        return 'opcat-testnet';
    }
  }
}
