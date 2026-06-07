import { PrismaClient } from '@prisma/client/extension';

type Counter = (prisma: PrismaClient, id: string) => Promise<number>;

export const RELATION_REGISTRY: Record<string, Record<string, Counter>> = {
  category: {
    products: (p, id) =>
      p.product.count({
        where: { categoryId: id },
      }),
  },

  product: {
    orderItems: (p, id) =>
      p.orderItem.count({
        where: { productId: id },
      }),

    kotItems: (p, id) =>
      p.kotItem.count({
        where: { productId: id },
      }),

    productAddons: (p, id) =>
      p.productAddon.count({
        where: { productId: id },
      }),
  },

  branch: {
    orders: (p, id) =>
      p.orders.count({
        where: { branchId: id },
      }),

    users: (p, id) =>
      p.user.count({
        where: { branchId: id },
      }),

    kots: (p, id) =>
      p.kot.count({
        where: { branchId: id },
      }),
  },

  user: {
    orders: (p, id) =>
      p.orders.count({
        where: { userId: id },
      }),
  },
};
