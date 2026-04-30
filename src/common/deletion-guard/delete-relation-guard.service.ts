import { BadRequestException, Injectable } from '@nestjs/common';
import { RELATION_REGISTRY } from './relation.registry';
import { PrismaClient } from '@prisma/client/extension';

@Injectable()
export class DeleteRelationGuardService {
  async ensure(prisma: PrismaClient, entity: string, id: string) {
    const checks = RELATION_REGISTRY[entity];
    if (!checks) return; // no relations defined → allow delete

    const entries = Object.entries(checks);

    const results = await Promise.all(
      entries.map(async ([name, fn]) => [name, await fn(prisma, id)] as const),
    );

    const refs = results
      .filter(([, count]) => count > 0)
      .map(([name, count]) => `${name}(${count})`);

    if (refs.length) {
      throw new BadRequestException(
        `Cannot delete ${entity}: referenced by ${refs.join(', ')}.`,
      );
      //   throw new BadRequestException({
      //     message: `Cannot delete ${entity}. It is referenced by related records.`,
      //     error: 'RELATION_CONFLICT',
      //   });
    }
  }
}
