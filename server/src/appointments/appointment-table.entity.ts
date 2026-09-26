import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * 预约-桌位关联表：一单多桌关系从 appointments.tables JSON 列抽成独立关联表，
 * availability / 冲突校验直接走关联表查询，替代 JSON_TABLE 展开。
 *
 * storeId/date 冗余存储：让 availability 与冲突校验能用
 * (storeId, date, tableId) 复合索引一步收窄，无需先回表 appointments。
 */
@Entity('appointment_tables')
@Index(
  'IDX_appointment_tables_appointment_table',
  ['appointmentId', 'tableId'],
  {
    unique: true, // 同一预约单同一桌位只记录一次
  },
)
@Index('IDX_appointment_tables_store_date_table', [
  'storeId',
  'date',
  'tableId',
])
export class AppointmentTable {
  @PrimaryGeneratedColumn()
  id: number;

  /** 预约单 ID */
  @Column({ type: 'int' })
  appointmentId: number;

  /** 桌位 ID */
  @Column({ type: 'int' })
  tableId: number;

  /** 冗余门店 ID：供 (storeId, date, tableId) 索引直接过滤 */
  @Column({ type: 'int' })
  storeId: number;

  /** 冗余预约日期（YYYY-MM-DD）：供 (storeId, date, tableId) 索引直接过滤 */
  @Column({ type: 'varchar', length: 10 })
  date: string;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  createdAt: Date;
}
