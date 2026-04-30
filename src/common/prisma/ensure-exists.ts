import { NotFoundException } from "@nestjs/common";

export async function ensureExists<T>(
    query: Promise<T | null>,
    notFoundMessage: string,
): Promise<T> {
    const record = await query;
    if (!record) throw new NotFoundException(notFoundMessage);
    return record;
}
