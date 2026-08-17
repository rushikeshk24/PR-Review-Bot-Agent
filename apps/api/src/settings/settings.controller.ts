import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { RepoSettings } from '@codelens/shared';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('repos/:id')
  async getRepoSettings(@Param('id') id: string) {
    return this.settingsService.getRepoSettings(id);
  }

  @Put('repos/:id')
  async updateRepoSettings(@Param('id') id: string, @Body() body: Partial<RepoSettings>) {
    return this.settingsService.updateRepoSettings(id, body);
  }
}
