import { Prisma, PrismaClient } from '@prisma/client';

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
 * Enforces installationId filtering on repository and PRReview queries.
 */
export function createTenantPrisma(installationId: string) {
  return prisma.$extends(
    Prisma.defineExtension({
      name: 'tenant-scoped',

      query: {
        repository: {
          async findMany({ args, query }) {
            const where: Prisma.RepositoryWhereInput = {
              ...(args.where as Prisma.RepositoryWhereInput | undefined),
              installationId,
            };

            args.where = where;

            return query(args);
          },

          async findFirst({ args, query }) {
            const where: Prisma.RepositoryWhereInput = {
              ...(args.where as Prisma.RepositoryWhereInput | undefined),
              installationId,
            };

            args.where = where;

            return query(args);
          },
        },

        pRReview: {
          async findMany({ args, query }) {
            const where: Prisma.PRReviewWhereInput = {
              ...(args.where as Prisma.PRReviewWhereInput | undefined),
              repository: {
                installationId,
              },
            };

            args.where = where;

            return query(args);
          },
        },
      },
    }),
  );
}

export type TenantPrismaClient = ReturnType<typeof createTenantPrisma>;

export { PrismaClient } from '@prisma/client';