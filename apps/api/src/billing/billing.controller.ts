import { Controller, Get, Param } from '@nestjs/common';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  async getPlans() {
    return this.billingService.getPlans();
  }

  @Get('installation/:id')
  async getInstallationBilling(@Param('id') id: string) {
    return this.billingService.getInstallationBilling(id);
  }
}
