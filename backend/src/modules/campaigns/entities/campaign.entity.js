import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CampaignPage } from './campaign-page.entity';
import { CampaignTracking } from './campaign-tracking.entity';
import { Operator } from '../../markets/entities/operator.entity';

@Entity('campaigns')
@Index(['operatorId', 'name'], { unique: true })
export class Campaign {
  @PrimaryGeneratedColumn()
  id;

  @Column()
  name;

  @Column()
  country;

  @Column()
  operator;

  @Column({ name: 'operator_id', nullable: true })
  operatorId;

  @ManyToOne(() => Operator, (op) => op.campaigns, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'operator_id' })
  marketOperator;

  @Column({ name: 'service_id', nullable: true })
  serviceId;

  @Column({ default: false })
  active;

  @Column({ name: 'user_id' })
  userId;

  @OneToMany(() => CampaignTracking, (tracking) => tracking.campaign, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  trackings;

  @Column({ name: 'verification_mode', type: 'varchar', length: 16, nullable: true })
  verificationMode;

  @Column({ name: 'flow_config', type: 'text', nullable: true })
  flowConfig;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user;

  @OneToMany(() => CampaignPage, (page) => page.campaign)
  pages;

  @CreateDateColumn({ name: 'created_at' })
  createdAt;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt;

  trackingId;
}
