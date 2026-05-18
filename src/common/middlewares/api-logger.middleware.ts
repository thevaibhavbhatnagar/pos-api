import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ApiLoggerMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    const oldJson = res.json.bind(res);

    let response_body: any;

    res.json = (body: any) => {
      response_body = body;
      return oldJson(body);
    };

    res.on('finish', async () => {
      try {
        // Skip static files
        if (
          req.originalUrl.includes('/uploads') ||
          req.originalUrl.includes('/public')
        ) {
          return;
        }

        // Hide sensitive data
        const request_body = { ...req.body };

        if (request_body.password) {
          request_body.password = 'HIDDEN';
        }

        await this.prisma.api_logs.create({
          data: {
            method: req.method,
            endpoint: req.originalUrl,

            status_code: res.statusCode,

            request_body,
            response_body,

            query_params: req.query || {},

            ip_address: req.ip,
            user_agent: req.headers['user-agent'] || null,

            user_id: (req as any)?.user?.id || null,

            execution_time: Date.now() - start,

            error_message:
              res.statusCode >= 400 ? JSON.stringify(response_body) : null,
          },
        });
      } catch (error) {
        console.error('API Log Error:', error);
      }
    });

    next();
  }
}
