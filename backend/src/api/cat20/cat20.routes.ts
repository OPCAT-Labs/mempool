import config from '../../config';
import { Application, Request, Response } from 'express';
import axios from 'axios';

class Cat20Routes {
  constructor() { }

  public initRoutes(app: Application) {
    app
      .get(
        config.MEMPOOL.API_URL_PREFIX + 'cat20/token/:tokenId',
        this.$searchTokenByTokenIdOrTokenHash
      )
      .get(config.MEMPOOL.API_URL_PREFIX + 'cat20/token/:tokenId/holders',
        this.$searchHoldersByTokenIdOrTokenHash
      )
      .get(config.MEMPOOL.API_URL_PREFIX + 'cat20/address/:addrOrPkh/balances',
        this.$searchBalancesByAddrOrPkh
      )
      .get(config.MEMPOOL.API_URL_PREFIX + 'cat20/tx/:address/transactions',
        this.$searchTransationsByAddress
      );
  }

  private async $searchTransationsByAddress(req: Request, res: Response) {

    try {
      const { address } = req.params;
      const { page, size } = req.query;

      const targetUrl = `${config.EXTERNAL_DATA_SERVER.TRACKURL}/tx/`
        + address + `/transactions?page=` + page + `&size=` + size;

      const response = await axios.get(targetUrl, { responseType: 'stream', timeout: 10000 });

      response.data.pipe(res);
    } catch (e) {
      console.error("Error occurred while processing request:", e);
      res.status(500).end();
    }

  }

  private async $searchBalancesByAddrOrPkh(req: Request, res: Response) {

    try {
      const { addrOrPkh } = req.params;

      const targetUrl = `${config.EXTERNAL_DATA_SERVER.TRACKURL}/addresses/`
        + addrOrPkh + `/balances`;

      // console.log("====searchHoldersByTokenIdOrTokenHash===targetUrl:" + targetUrl);

      const response = await axios.get(targetUrl, { responseType: 'stream', timeout: 10000 });

      response.data.pipe(res);
    } catch (e) {
      console.error("Error occurred while processing request:", e);
      res.status(500).end();
    }

  }


  private async $searchHoldersByTokenIdOrTokenHash(req: Request, res: Response) {

    try {
      const { tokenId } = req.params;
      const { offset, limit } = req.query;

      const targetUrl = `${config.EXTERNAL_DATA_SERVER.TRACKURL}/tokens/`
        + tokenId + `/holders?offset=` + offset + `&limit=` + limit;

      const response = await axios.get(targetUrl, { responseType: 'stream', timeout: 10000 });

      response.data.pipe(res);
    } catch (e) {
      console.error("Error occurred while processing request:", e);
      res.status(500).end();
    }

  }


  private async $searchTokenByTokenIdOrTokenHash(req: Request, res: Response) {

    try {
      const { tokenId } = req.params;
      //console.log("====searchTokenByTokenIdOrTokenHash===" + tokenId);
      const targetUrl = `${config.EXTERNAL_DATA_SERVER.TRACKURL}/tokens/` + tokenId;
      //console.log("====searchTokenByTokenIdOrTokenHash===targetUrl:" + targetUrl);
      const response = await axios.get(targetUrl, { responseType: 'stream', timeout: 10000 });
      response.data.pipe(res);
    } catch (e) {
      console.error("Error occurred while processing request:", e);
      res.status(500).end();
    }
  }

}

export default new Cat20Routes();
