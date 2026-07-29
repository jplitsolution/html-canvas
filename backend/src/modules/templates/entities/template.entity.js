import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('templates')
export class Template {
  @PrimaryGeneratedColumn()
  id;

  @Column()
  name;

  @Column({ type: 'json' })
  data;

  @Column({ name: 'user_id', nullable: true })
  userId;

  @Column({ name: 'is_prebuilt', type: 'boolean', default: false })
  isPrebuilt;

  @CreateDateColumn({ name: 'created_at' })
  createdAt;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt;
}
