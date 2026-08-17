import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Tenant-scoped Prisma client extension.
 * Enforces `installationId` filtering on repository and PRReview queries.
 */
export function createTenantPrisma(installationId: string) {
  return prisma.$extends(
    Prisma.defineExtension({
      name: 'tenant-scoped',
      query: {
        repository: {
          async findMany({ args, query }) {
            args.where = {
              ...args.where,
              installationId,
            };

            return query(args);
          },

          async findFirst({ args, query }) {
            args.where = {
              ...args.where,
              installationId,
            };

            return query(args);
          },
        },

        pRReview: {
          async findMany({ args, query }) {
            args.where = {
              ...args.where,
              repository: {
                installationId,
              },
            };

            return query(args);
          },
        },
      },
    }),
  );
}

export type TenantPrismaClient = ReturnType<typeof createTenantPrisma>;

export { PrismaClient } from '@prisma/client';