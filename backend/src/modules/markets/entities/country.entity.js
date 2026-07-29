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
  id;

  @Column()
  name;

  @Column({ length: 16 })
  code;

  @Column({ name: 'user_id' })
  userId;

  @OneToMany(() => Operator, (operator) => operator.country)
  operators;

  @CreateDateColumn({ name: 'created_at' })
  createdAt;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt;
}
