import { Application, Request, Response } from 'express';
import config from '../../config';
import axios from 'axios';

class FuzzySearchPrefix {
    public initRoutes(app: Application): void {
        console.log("Initializing FuzzySearchPrefix routes");
        app.get(config.MEMPOOL.API_URL_PREFIX + 'address-prefix/:prefix', this.$fuzzySearchPrefix.bind(this));
    }
    private async $fuzzySearchPrefix(req: Request, res: Response): Promise<void> {
        console.log("Received request for fuzzy search prefix:", req.params['prefix']);
        try {
            const addressPrefix = req.params['prefix'];
            const request_url = `${config.EXTERNAL_DATA_SERVER.TRACKURL}/tokens/${addressPrefix}/getTokensByNamePrefix`;
            console.log("Forwarding request to:", request_url);
            const response = await axios.get(request_url, { responseType: 'stream', timeout: 10000 });
            response.data.pipe(res);
        } catch (e: any) {
            console.error("Error occurred while processing request:", e);
            res.status(500).end();
        }
    }  
}

export default new FuzzySearchPrefix();