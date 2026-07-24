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
import { Country } from './country.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('operators')
@Index(['countryId', 'code'], { unique: true })
export class Operator {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  /** Stable code used in tracking IDs, e.g. AIRTEL */
  @Column({ length: 64 })
  code: string;

  @Column({ name: 'country_id' })
  countryId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => Country, (country) => country.operators, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'country_id' })
  country: Country;

  @OneToMany(() => Campaign, (campaign) => campaign.marketOperator)
  campaigns: Campaign[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
