import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('blocklist_entries')
export class BlocklistEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  phone: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
