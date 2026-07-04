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

export enum CampaignPageType {
  HOME = 'HOME',
  CONFIRM = 'CONFIRM',
  OTP = 'OTP',
  THANKYOU = 'THANKYOU',
  BLOCKED = 'BLOCKED',
  ERROR = 'ERROR',
}

export const REQUIRED_CAMPAIGN_PAGE_TYPES: CampaignPageType[] = [
  CampaignPageType.HOME,
  CampaignPageType.CONFIRM,
  CampaignPageType.OTP,
  CampaignPageType.THANKYOU,
];

export const ALL_CAMPAIGN_PAGE_TYPES: CampaignPageType[] = [
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
  id: number;

  @Column({ name: 'campaign_id' })
  campaignId: number;

  @ManyToOne(() => Campaign, (campaign) => campaign.pages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({
    type: 'varchar',
    name: 'page_type',
  })
  pageType: CampaignPageType;

  @Column({ name: 'template_id', nullable: true })
  templateId?: number;

  @ManyToOne(() => Template, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'template_id' })
  template?: Template;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
