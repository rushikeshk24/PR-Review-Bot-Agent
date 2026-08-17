import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@codelens/database';

@Injectable()
export class InstallationsService {
  async getInstallations(): Promise<any> {
    return prisma.installation.findMany({
      where: { status: 'ACTIVE' },
      include: {
        repositories: {
          where: { isActive: true },
          include: {
            settings: true,
            _count: {
              select: { reviews: true },
            },
          },
        },
        marketplacePlan: true,
      },
      orderBy: { installedAt: 'desc' },
    });
  }

  async getInstallationById(id: string): Promise<any> {
    const installation = await prisma.installation.findUnique({
      where: { id },
      include: {
        repositories: {
          include: {
            settings: true,
            _count: {
              select: { reviews: true },
            },
          },
        },
        settings: true,
        marketplacePlan: true,
      },
    });

    if (!installation) {
      throw new NotFoundException(`Installation ${id} not found`);
    }

    return installation;
  }

  async getRepositoryById(id: string): Promise<any> {
    const repository = await prisma.repository.findUnique({
      where: { id },
      include: {
        installation: true,
        settings: true,
        pullRequests: {
          orderBy: { updatedAt: 'desc' },
          take: 50,
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!repository) {
      throw new NotFoundException(`Repository ${id} not found`);
    }

    return repository;
  }
}