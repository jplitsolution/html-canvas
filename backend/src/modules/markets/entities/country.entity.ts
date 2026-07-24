import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Operator } from './operator.entity';

@Entity('countries')
@Index(['userId', 'code'], { unique: true })
export class Country {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  /** Stable code used in tracking IDs, e.g. IN */
  @Column({ length: 16 })
  code: string;

  @Column({ name: 'user_id' })
  userId: number;

  @OneToMany(() => Operator, (operator) => operator.country)
  operators: Operator[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
