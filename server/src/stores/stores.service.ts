import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './store.entity';
import { StoreTable } from './store-table.entity';
import { TimeSlot } from './time-slot.entity';
import { StorePackage } from './store-package.entity';
import {
  CreateSlotDto,
  CreateStoreDto,
  CreateTableDto,
  CreatePackageDto,
  UpdateSlotDto,
  UpdateStoreDto,
  UpdateTableDto,
  UpdatePackageDto,
} from './store.dto';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store) private readonly stores: Repository<Store>,
    @InjectRepository(StoreTable)
    private readonly tables: Repository<StoreTable>,
    @InjectRepository(TimeSlot)
    private readonly slots: Repository<TimeSlot>,
    @InjectRepository(StorePackage)
    private readonly packages: Repository<StorePackage>,
  ) {}

  // ===== 客户端（只读，仅 enabled） =====

  /** 附近可约门店列表（距离由客户端按经纬度计算） */
  listEnabled(): Promise<Store[]> {
    return this.stores.find({ where: { enabled: true }, order: { id: 'ASC' } });
  }

  /** 按名称查门店（审核演示/种子幂等用；不含关联数据） */
  findByName(name: string): Promise<Store | null> {
    return this.stores.findOneBy({ name });
  }

  async detail(id: number): Promise<Store | null> {
    const store = await this.stores.findOne({
      where: { id, enabled: true },
      relations: { tables: true, slots: true, packages: true },
    });
    if (!store) return null;
    store.tables = store.tables.filter((t) => t.enabled);
    store.slots = store.slots.filter((s) => s.enabled);
    store.packages = (store.packages ?? [])
      .filter((p) => p.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.hours - b.hours);
    return store;
  }

  // ===== 管理端（含 CRUD） =====

  adminList(): Promise<Store[]> {
    return this.stores.find({
      relations: { tables: true, slots: true, packages: true },
      order: { id: 'DESC' },
    });
  }

  async adminDetail(id: number): Promise<Store> {
    const store = await this.stores.findOne({
      where: { id },
      relations: { tables: true, slots: true, packages: true },
    });
    if (!store) throw new NotFoundException('门店不存在');
    return store;
  }

  create(dto: CreateStoreDto): Promise<Store> {
    return this.stores.save(
      this.stores.create({ ...dto, images: dto.images ?? [] }),
    );
  }

  async update(id: number, dto: UpdateStoreDto): Promise<Store> {
    const store = await this.adminDetail(id);
    Object.assign(store, dto);
    return this.stores.save(store);
  }

  async remove(id: number) {
    const store = await this.adminDetail(id);
    await this.stores.remove(store);
  }

  /** 桌位命名规则：字母 = 人数（A=1人桌 / B=2人桌 / C=4人桌） */
  private static readonly capacityPrefix: Record<number, string> = {
    1: 'A',
    2: 'B',
    4: 'C',
  };

  /**
   * 按容量规则生成桌位名：前缀 + 同类型最小空闲序号（如 B2 = 第二个二人桌）。
   * 座位号由桌位名派生：B1-2 = 第一个二人桌的 2 号座位。
   */
  private async nextTableName(
    storeId: number,
    capacity: number,
  ): Promise<string> {
    const prefix = StoresService.capacityPrefix[capacity];
    if (!prefix) {
      throw new BadRequestException('桌位容量仅支持 1 / 2 / 4 人');
    }
    const siblings = await this.tables.find({ where: { storeId } });
    const used = new Set(
      siblings
        .filter((t) => t.name.startsWith(prefix))
        .map((t) => parseInt(t.name.slice(prefix.length), 10))
        .filter((n) => !Number.isNaN(n)),
    );
    let i = 1;
    while (used.has(i)) i++;
    return `${prefix}${i}`;
  }

  async addTable(storeId: number, dto: CreateTableDto): Promise<StoreTable> {
    await this.adminDetail(storeId);
    // 桌位名按容量规则自动生成，忽略入参 name
    const name = await this.nextTableName(storeId, dto.capacity);
    return this.tables.save(this.tables.create({ storeId, ...dto, name }));
  }

  async updateTable(id: number, dto: UpdateTableDto): Promise<StoreTable> {
    const table = await this.tables.findOneBy({ id });
    if (!table) throw new NotFoundException('桌位不存在');
    const capacityChanged =
      dto.capacity != null && dto.capacity !== table.capacity;
    // 桌位名不允许手改：忽略入参 name，容量变化时按规则重新生成
    const rest = { ...dto };
    delete rest.name;
    Object.assign(table, rest);
    if (capacityChanged) {
      table.name = await this.nextTableName(table.storeId, table.capacity);
    }
    return this.tables.save(table);
  }

  async removeTable(id: number) {
    const table = await this.tables.findOneBy({ id });
    if (!table) throw new NotFoundException('桌位不存在');
    await this.tables.remove(table);
  }

  async addSlot(storeId: number, dto: CreateSlotDto): Promise<TimeSlot> {
    await this.adminDetail(storeId);
    return this.slots.save(this.slots.create({ storeId, ...dto }));
  }

  async updateSlot(id: number, dto: UpdateSlotDto): Promise<TimeSlot> {
    const slot = await this.slots.findOneBy({ id });
    if (!slot) throw new NotFoundException('时段不存在');
    Object.assign(slot, dto);
    return this.slots.save(slot);
  }

  async removeSlot(id: number) {
    const slot = await this.slots.findOneBy({ id });
    if (!slot) throw new NotFoundException('时段不存在');
    await this.slots.remove(slot);
  }

  // ===== 时长套餐 =====

  async addPackage(
    storeId: number,
    dto: CreatePackageDto,
  ): Promise<StorePackage> {
    await this.adminDetail(storeId);
    return this.packages.save(
      this.packages.create({
        ...dto,
        storeId,
        sortOrder: dto.sortOrder ?? 0,
      }),
    );
  }

  async updatePackage(
    id: number,
    dto: UpdatePackageDto,
  ): Promise<StorePackage> {
    const pkg = await this.packages.findOneBy({ id });
    if (!pkg) throw new NotFoundException('套餐不存在');
    Object.assign(pkg, dto);
    return this.packages.save(pkg);
  }

  async removePackage(id: number) {
    const pkg = await this.packages.findOneBy({ id });
    if (!pkg) throw new NotFoundException('套餐不存在');
    await this.packages.remove(pkg);
  }
}
