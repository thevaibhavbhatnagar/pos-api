import { PrismaClient } from '@prisma/client/extension';

type Counter = (prisma: PrismaClient, id: string) => Promise<number>;

export const RELATION_REGISTRY: Record<string, Record<string, Counter>> = {
    // class: {
    //     subjects: (p, id) => p.subject.count({ where: { classId: id, deletedAt: null } }),
    //     books: (p, id) => p.book.count({ where: { classId: id, deletedAt: null } }),
    //     purchaseOrderItem: (p, id) => p.PurchaseOrderItem.count({ where: { classId: id, deletedAt: null } }),
    //     grnItem: (p, id) => p.GrnItem.count({ where: { classId: id, deletedAt: null } }),
    //     purchaseReturnItem: (p, id) => p.PurchaseReturnItem.count({ where: { classId: id, deletedAt: null } }),
    // }, 
    
};
