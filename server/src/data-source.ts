import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * TypeORM CLI 专用数据源（migration:generate / migration:run 等）。
 * 与 app.module 的 TypeOrmModule 配置保持一致，仅用于命令行迁移操作。
 */
export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? 'root',
  database: process.env.DB_NAME ?? 'diy',
  entities: [__dirname + '/**/*.entity.ts'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
