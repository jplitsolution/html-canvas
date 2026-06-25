import { ApiProperty } from '@nestjs/swagger';

export class CampaignAnalyticsDto {
  @ApiProperty({ example: 1250, description: 'Total visits logged for the campaign' })
  totalVisits: number;

  @ApiProperty({ example: 50, description: 'Number of visits blocked' })
  blockedUsers: number;

  @ApiProperty({ example: 450, description: 'Number of visits already subscribed' })
  subscribedUsers: number;

  @ApiProperty({ example: 120, description: 'Number of successful new subscriptions' })
  successfulSubscriptions: number;

  @ApiProperty({ example: 25, description: 'Number of failed subscription attempts' })
  failedSubscriptions: number;

  @ApiProperty({ example: 9.6, description: 'Conversion rate percentage' })
  conversionRate: number;
}
