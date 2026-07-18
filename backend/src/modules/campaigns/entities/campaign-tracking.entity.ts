import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Campaign } from './campaign.entity';
import { Vendor } from '../../partners/entities/vendor.entity';
import { Affiliate } from '../../partners/entities/affiliate.entity';

@Entity('campaign_trackings')
export class CampaignTracking {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Campaign, (campaign) => campaign.trackings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @ManyToOne(() => Vendor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @ManyToOne(() => Affiliate, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'affiliate_id' })
  affiliate: Affiliate;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
