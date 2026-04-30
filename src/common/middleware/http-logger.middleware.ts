import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLogger } from '../../logger/logger.service';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
    constructor(private readonly logger: AppLogger) { }

    use(req: Request, res: Response, next: NextFunction) {
        const start = Date.now();

        res.on('finish', () => {
            const ms = Date.now() - start;

            this.logger.log('HTTP Request', {
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                durationMs: ms,
                requestId: (req as any).requestId,
            });
        });

        next();
    }
}
