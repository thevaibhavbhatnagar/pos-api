import { PrismaClient } from '@prisma/client/extension';

type Counter = (prisma: PrismaClient, id: string) => Promise<number>;

export const RELATION_REGISTRY: Record<string, Record<string, Counter>> = {
  category: {
    products: (p, id) =>
      p.product.count({
        where: { categoryId: id },
      }),
  },
};
