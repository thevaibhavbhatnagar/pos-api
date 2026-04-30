import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
} from "@nestjs/common";
import { Prisma } from "src/generated/prisma/client";

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
    catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();

        if (exception.code === "P2002") {
            const field = this.getDuplicateField(exception);

            return res.status(HttpStatus.CONFLICT).json({
                statusCode: HttpStatus.CONFLICT,
                error: "Conflict",
                field,
                message: `${field} already exists`,
            });
        }

        if (exception.code === "P2003") {
            return res.status(HttpStatus.BAD_REQUEST).json({
                statusCode: HttpStatus.BAD_REQUEST,
                error: "Bad Request",
                message: "Cannot delete record because it is used in another table.",
            });
        }

        if (exception.code === "P2025") {
            return res.status(HttpStatus.NOT_FOUND).json({
                statusCode: HttpStatus.NOT_FOUND,
                error: "Not Found",
                message: "Record not found",
            });
        }

        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: "Internal Server Error",
            message: "Database error",
        });
    }

    private getDuplicateField(
        exception: Prisma.PrismaClientKnownRequestError
    ): string {
        const meta = (exception.meta ?? {}) as any;

        // ✅ Best: Prisma meta.target (string[])
        const target = meta.target;
        if (Array.isArray(target) && target.length) {
            // If composite unique, you can return target.map(...).join(", ")
            return this.toCamel(target[0]);
        }

        // ✅ Fallback: parse message (when meta.target missing)
        // Example: "Unique constraint failed on the fields: (`isbn_no`)"
        const msg = exception.message ?? "";
        const match = msg.match(/fields:\s*\(([^)]+)\)/i);
        if (match?.[1]) {
            const first = match[1].replace(/`/g, "").split(",")[0].trim();
            return this.toCamel(first);
        }

        // last fallback
        return "value";
    }

    // snake_case -> camelCase
    private toCamel(str: string) {
        return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    }
}