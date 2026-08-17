import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@codelens/database';
import { RepoSettings } from '@codelens/shared';

@Injectable()
export class SettingsService {
  async getRepoSettings(repositoryId: string) {
    const repo = await prisma.repository.findUnique({
      where: { id: repositoryId },
      include: { settings: true },
    });

    if (!repo) {
      throw new NotFoundException(`Repository ${repositoryId} not found`);
    }

    if (!repo.settings) {
      return prisma.repoSettings.create({
        data: {
          repositoryId: repo.id,
          blockingMode: 'ADVISORY',
          severityThreshold: 'ERROR',
        },
      });
    }

    return repo.settings;
  }

  async updateRepoSettings(repositoryId: string, data: Partial<RepoSettings>) {
    const repo = await prisma.repository.findUnique({
      where: { id: repositoryId },
      include: { settings: true },
    });

    if (!repo) {
      throw new NotFoundException(`Repository ${repositoryId} not found`);
    }

    return prisma.repoSettings.upsert({
      where: { repositoryId: repo.id },
      update: {
        blockingMode: data.blockingMode === 'strict' ? 'STRICT' : 'ADVISORY',
        severityThreshold: data.severityThreshold as any,
        ignoredGlobs: data.ignoredGlobs,
        customPrompt: data.customPrompt,
        autoReview: data.autoReview,
        maxFilesPerReview: data.maxFilesPerReview,
        modelTier: data.modelTier,
      },
      create: {
        repositoryId: repo.id,
        blockingMode: data.blockingMode === 'strict' ? 'STRICT' : 'ADVISORY',
        severityThreshold: (data.severityThreshold as any) || 'ERROR',
        ignoredGlobs: data.ignoredGlobs || [],
        customPrompt: data.customPrompt,
        autoReview: data.autoReview ?? true,
        maxFilesPerReview: data.maxFilesPerReview || 50,
        modelTier: data.modelTier || 'flash',
      },
    });
  }
}
