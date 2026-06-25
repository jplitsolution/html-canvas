import { ApiProperty } from '@nestjs/swagger';

export class ProjectAnalyticsDto {
  @ApiProperty({ example: 1250, description: 'Total visits logged for the project' })
  totalVisits: number;

  @ApiProperty({ example: 50, description: 'Number of visits blocked due to blocklist checks' })
  blockedUsers: number;

  @ApiProperty({ example: 450, description: 'Number of visits identified as already subscribed' })
  subscribedUsers: number;

  @ApiProperty({ example: 120, description: 'Number of successful new subscriptions triggered' })
  successfulSubscriptions: number;

  @ApiProperty({ example: 25, description: 'Number of failed subscription attempts' })
  failedSubscriptions: number;

  @ApiProperty({ example: 9.6, description: 'Conversion rate percentage (successfulSubscriptions / totalVisits * 100)' })
  conversionRate: number;
}
