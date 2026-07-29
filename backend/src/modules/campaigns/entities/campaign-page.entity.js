import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Campaign } from './campaign.entity';
import { Template } from '../../templates/entities/template.entity';

export const CampaignPageType = {
  HOME: 'HOME',
  CONFIRM: 'CONFIRM',
  OTP: 'OTP',
  THANKYOU: 'THANKYOU',
  BLOCKED: 'BLOCKED',
  ERROR: 'ERROR',
};

export const REQUIRED_CAMPAIGN_PAGE_TYPES = [
  CampaignPageType.HOME,
  CampaignPageType.CONFIRM,
  CampaignPageType.OTP,
  CampaignPageType.THANKYOU,
];

export const ALL_CAMPAIGN_PAGE_TYPES = [
  CampaignPageType.HOME,
  CampaignPageType.CONFIRM,
  CampaignPageType.OTP,
  CampaignPageType.THANKYOU,
  CampaignPageType.BLOCKED,
  CampaignPageType.ERROR,
];

@Entity('campaign_pages')
@Index(['campaignId', 'pageType'], { unique: true })
export class CampaignPage {
  @PrimaryGeneratedColumn()
  id;

  @Column({ name: 'campaign_id' })
  campaignId;

  @ManyToOne(() => Campaign, (campaign) => campaign.pages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign;

  @Column({
    type: 'varchar',
    name: 'page_type',
  })
  pageType;

  @Column({ name: 'template_id', nullable: true })
  templateId;

  @ManyToOne(() => Template, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'template_id' })
  template;

  @CreateDateColumn({ name: 'created_at' })
  createdAt;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt;
}
