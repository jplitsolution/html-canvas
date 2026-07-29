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
  id;

  @Column()
  name;

  @Column({ length: 64 })
  code;

  @Column({ name: 'country_id' })
  countryId;

  @Column({ name: 'user_id' })
  userId;

  @ManyToOne(() => Country, (country) => country.operators, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'country_id' })
  country;

  @OneToMany(() => Campaign, (campaign) => campaign.marketOperator)
  campaigns;

  @CreateDateColumn({ name: 'created_at' })
  createdAt;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt;
}
