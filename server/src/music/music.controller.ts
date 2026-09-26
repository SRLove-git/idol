import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { MusicService } from './music.service';

/** 客户端：曲库（拍摄页选择配乐） */
@Controller('musics')
export class MusicController {
  constructor(private readonly music: MusicService) {}

  /** 曲库列表（歌名/歌手模糊搜索，分页） */
  @Get()
  list(
    @Query('keyword') keyword?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
  ) {
    return this.music.list(keyword, page);
  }
}
