import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { StoresService } from './stores.service';

/** 客户端只读接口 */
@Controller('stores')
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  @Get()
  list() {
    return this.stores.listEnabled();
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const store = await this.stores.detail(id);
    if (!store) throw new NotFoundException('门店不存在');
    return store;
  }
}
