import { ApiProperty } from '@nestjs/swagger';

export class CampaignAnalyticsDto {
  @ApiProperty({
    example: 1250,
    description: 'Total visits logged for the campaign',
  })
  totalVisits;

  @ApiProperty({ example: 50, description: 'Number of visits blocked' })
  blockedUsers;

  @ApiProperty({
    example: 450,
    description: 'Number of visits already subscribed',
  })
  subscribedUsers;

  @ApiProperty({
    example: 120,
    description: 'Number of successful new subscriptions',
  })
  successfulSubscriptions;

  @ApiProperty({
    example: 25,
    description: 'Number of failed subscription attempts',
  })
  failedSubscriptions;

  @ApiProperty({ example: 9.6, description: 'Conversion rate percentage' })
  conversionRate;

  @ApiProperty({ example: 4, description: 'Number of requests blocked due to security rules' })
  blockedRequests;

  @ApiProperty({ example: 12, description: 'Number of rate limit events triggered' })
  rateLimitHits;

  @ApiProperty({ example: 3, description: 'Number of visits triggering brute-force protection' })
  bruteForceAttempts;
}
