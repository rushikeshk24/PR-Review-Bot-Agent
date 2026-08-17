import { Controller, Get, Param } from '@nestjs/common';
import { InstallationsService } from './installations.service';

@Controller('installations')
export class InstallationsController {
  constructor(private readonly installationsService: InstallationsService) {}

  @Get()
  async getInstallations() {
    return this.installationsService.getInstallations();
  }

  @Get(':id')
  async getInstallation(@Param('id') id: string) {
    return this.installationsService.getInstallationById(id);
  }

  @Get('repos/:repoId')
  async getRepository(@Param('repoId') repoId: string) {
    return this.installationsService.getRepositoryById(repoId);
  }
}
