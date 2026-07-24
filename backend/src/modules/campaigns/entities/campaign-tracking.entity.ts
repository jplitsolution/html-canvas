import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Column,
} from 'typeorm';
import { Campaign } from './campaign.entity';
import { Vendor } from '../../partners/entities/vendor.entity';
import { Affiliate } from '../../partners/entities/affiliate.entity';

@Entity('campaign_trackings')
export class CampaignTracking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'campaign_id' })
  campaignId: number;

  @ManyToOne(() => Campaign, (campaign) => campaign.trackings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({ name: 'vendor_id' })
  vendorId: number;

  @ManyToOne(() => Vendor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @Column({ name: 'affiliate_id', nullable: true })
  affiliateId: number | null;

  @ManyToOne(() => Affiliate, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'affiliate_id' })
  affiliate: Affiliate | null;

  /** When false, public tracking URLs for this assignment show "not available". */
  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
