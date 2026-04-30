import { BadRequestException } from "@nestjs/common";

export async function assertNoRelations(
    entity: string,
    checks: { label: string; count: () => Promise<number> }[],
) {
    const res = await Promise.all(
        checks.map(async (c) => ({ label: c.label, count: await c.count() })),
    );

    const used = res.filter((x) => x.count > 0);
    if (used.length) {
        throw new BadRequestException(
            `${entity} cannot be deleted. Used in: ${used
                .map((x) => `${x.label}(${x.count})`)
                .join(", ")}`
        );
    }
}