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
import { Project } from '../../projects/entities/project.entity';
import { Template } from '../../templates/entities/template.entity';

export enum PageType {
  LOADING = 'LOADING',
  PLAN = 'PLAN',
  THANKYOU = 'THANKYOU',
  BLOCKED = 'BLOCKED',
  ERROR = 'ERROR',
}

@Entity('pages')
@Index(['projectId', 'pageType'])
export class Page {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'template_id', nullable: true })
  templateId?: number;

  @ManyToOne(() => Template, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'template_id' })
  template?: Template;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({
    type: 'varchar',
    name: 'page_type',
    default: PageType.PLAN,
  })
  pageType: PageType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
