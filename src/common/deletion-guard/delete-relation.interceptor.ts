import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";

import { PrismaService } from "src/prisma.service";
import { DeleteRelationGuardService } from "./delete-relation-guard.service";
import { DELETE_ENTITY_KEY } from "./delete-entity.decorator";

@Injectable()
export class DeleteRelationInterceptor implements NestInterceptor {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
        private guard: DeleteRelationGuardService
    ) { }

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<any>> {
        const meta = this.reflector.get<{ entity: string; idParam: string }>(
            DELETE_ENTITY_KEY,
            context.getHandler()
        );

        if (!meta) return next.handle(); // not decorated → skip

        const req = context.switchToHttp().getRequest();
        const id = req.params?.[meta.idParam];

        if (id) {
            await this.guard.ensure(this.prisma, meta.entity, id);
        }

        return next.handle();
    }
}