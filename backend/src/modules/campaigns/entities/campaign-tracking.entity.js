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
  id;

  @Column({ name: 'campaign_id' })
  campaignId;

  @ManyToOne(() => Campaign, (campaign) => campaign.trackings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign;

  @Column({ name: 'vendor_id' })
  vendorId;

  @ManyToOne(() => Vendor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor;

  @Column({ name: 'affiliate_id', nullable: true })
  affiliateId;

  @ManyToOne(() => Affiliate, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'affiliate_id' })
  affiliate;

  @Column({ default: true })
  active;

  @CreateDateColumn({ name: 'created_at' })
  createdAt;
}
