import { PrismaClient } from '@prisma/client/extension';

type Counter = (prisma: PrismaClient, id: string) => Promise<number>;

export const RELATION_REGISTRY: Record<string, Record<string, Counter>> = {
    class: {
        subjects: (p, id) => p.subject.count({ where: { classId: id, deletedAt: null } }),
        books: (p, id) => p.book.count({ where: { classId: id, deletedAt: null } }),
        purchaseOrderItem: (p, id) => p.PurchaseOrderItem.count({ where: { classId: id, deletedAt: null } }),
        grnItem: (p, id) => p.GrnItem.count({ where: { classId: id, deletedAt: null } }),
        purchaseReturnItem: (p, id) => p.PurchaseReturnItem.count({ where: { classId: id, deletedAt: null } }),
    },
    subject: {
        books: (p, id) => p.book.count({ where: { subjectId: id, deletedAt: null } }),
        purchaseOrderItem: (p, id) => p.PurchaseOrderItem.count({ where: { subjectId: id, deletedAt: null } }),
        grnItem: (p, id) => p.GrnItem.count({ where: { subjectId: id, deletedAt: null } }),
        purchaseReturnItem: (p, id) => p.PurchaseReturnItem.count({ where: { subjectId: id, deletedAt: null } }),
    },
    book: {
        bookPublisher: (p, id) => p.bookPublisher.count({ where: { bookId: id, deletedAt: null } }),
        purchaseOrderItem: (p, id) => p.PurchaseOrderItem.count({ where: { bookId: id, deletedAt: null } }),
        grnItem: (p, id) => p.GrnItem.count({ where: { bookId: id, deletedAt: null } }),
        purchaseReturnItem: (p, id) => p.PurchaseReturnItem.count({ where: { bookId: id, deletedAt: null } }),
    },
    company: {
        branches: (p, id) => p.branch.count({ where: { companyId: id, deletedAt: null } })
    },
    publisher: {
        bookPublisher: (p, id) => p.bookPublisher.count({ where: { publisherId: id, deletedAt: null } }),
        purchaseOrder: (p, id) => p.PurchaseOrder.count({ where: { publisherId: id, deletedAt: null } }),
        grn: (p, id) => p.Grn.count({ where: { publisherId: id, deletedAt: null } }),
        purchaseReturn: (p, id) => p.PurchaseReturn.count({ where: { publisherId: id, deletedAt: null } }),
   
    },
    role: {
        users: (p, id) => p.user.count({ where: { roleId: id, deletedAt: null } }),
        rolePermission: (p, id) => p.rolePermission.count({ where: { roleId: id, deletedAt: null } }),
    }
    
};
