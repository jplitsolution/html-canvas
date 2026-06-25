import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('api_configs')
export class ApiConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: 'project_id' })
  projectId: number;

  @OneToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'user_api', nullable: true })
  userApi?: string;

  @Column({ name: 'blocklist_api', nullable: true })
  blocklistApi?: string;

  @Column({ name: 'subscription_api', nullable: true })
  subscriptionApi?: string;

  @Column({ name: 'subscribe_api', nullable: true })
  subscribeApi?: string;

  @Column({ name: 'headers_json', type: 'text', nullable: true })
  headersJson?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
