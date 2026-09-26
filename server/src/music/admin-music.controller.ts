import {
  BadRequestException,
  Body,
  Catch,
  Controller,
  DefaultValuePipe,
  Delete,
  ExceptionFilter,
  Get,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  PayloadTooLargeException,
  Post,
  Query,
  UploadedFiles,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { mkdirSync, unlinkSync } from 'fs';
import { diskStorage } from 'multer';
import { tmpdir } from 'os';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audit } from '../audit/audit.decorator';
import { AdminGuard } from '../stores/admin.guard';
import { PERMISSIONS } from '../common/admin-permissions';
import {
  AdminPermissionsGuard,
  Permissions,
} from '../common/permissions.guard';
import {
  UPLOAD_PROVIDER,
  type UploadProvider,
} from '../uploads/uploads.provider';
import { MediaCleanupService } from '../uploads/media-cleanup.service';
import { UpdateMusicDto, UploadMusicFieldsDto } from './music.dto';
import { MusicService } from './music.service';

/** 允许上传的音频类型 */
const ALLOWED_AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/flac',
  'audio/x-flac',
]);

/** 允许上传的封面图片类型 */
const ALLOWED_COVER_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

/** 曲库音频上传大小上限：曲目文件一般几 MB，放宽到 100MB */
const MAX_AUDIO_SIZE = 100 * 1024 * 1024;

/** multer 超限（LIMIT_FILE_SIZE）时返回友好中文提示 */
@Catch(PayloadTooLargeException)
class UploadSizeExceptionFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message: '文件过大，请压缩后再上传',
      error: 'Payload Too Large',
    });
  }
}

/** 当前月份子目录：yyyy/mm */
function monthDir(): string {
  const d = new Date();
  const mm = `${d.getMonth() + 1}`.padStart(2, '0');
  return `${d.getFullYear()}/${mm}`;
}

/** multer 磁盘存储：先写系统临时目录，由 UploadProvider 移动到最终位置 */
function multerStorage() {
  return diskStorage({
    destination: (_req, _file, cb) => {
      const dir = join(tmpdir(), 'diy-uploads');
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase() || '.bin';
      cb(null, `${randomUUID()}${ext}`);
    },
  });
}

/** 校验类型不合规时清理临时文件 */
function cleanup(file?: Express.Multer.File) {
  if (!file) return;
  try {
    unlinkSync(file.path);
  } catch {
    /* 忽略删除失败 */
  }
}

/**
 * 管理端：曲库管理。
 *
 * POST /api/admin/musics/upload 支持 multipart 一次提交：
 * - file：音频文件（必填）
 * - cover：封面图片（选填）
 * - title / artist / duration：文本字段
 */
@Controller('admin/musics')
@UseGuards(JwtAuthGuard, AdminGuard, AdminPermissionsGuard)
@Permissions(PERMISSIONS.CONTENT_MODERATION)
@UseFilters(UploadSizeExceptionFilter)
export class AdminMusicController {
  constructor(
    private readonly music: MusicService,
    @Inject(UPLOAD_PROVIDER)
    private readonly uploader: UploadProvider,
    private readonly cleanup: MediaCleanupService,
  ) {}

  /** 曲库列表（歌名/歌手模糊搜索，分页） */
  @Get()
  list(
    @Query('keyword') keyword?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe)
    pageSize: number = 20,
  ) {
    return this.music.list(keyword, page, pageSize);
  }

  /** 上传音频+封面，新建曲目 */
  @Post('upload')
  @Audit('music.upload', 'music')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
      ],
      {
        storage: multerStorage(),
        limits: { fileSize: MAX_AUDIO_SIZE },
      },
    ),
  )
  async upload(
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      cover?: Express.Multer.File[];
    },
    @Body() dto: UploadMusicFieldsDto,
  ) {
    const audio = files?.file?.[0];
    const cover = files?.cover?.[0];
    if (!audio) throw new BadRequestException('请选择音频文件');
    if (!ALLOWED_AUDIO_MIMES.has(audio.mimetype)) {
      cleanup(audio);
      cleanup(cover);
      throw new BadRequestException(
        '仅支持 mp3/m4a/aac/wav/ogg/flac 等常见音频格式',
      );
    }
    if (cover && !ALLOWED_COVER_MIMES.has(cover.mimetype)) {
      cleanup(audio);
      cleanup(cover);
      throw new BadRequestException('封面仅支持 jpg/png/gif/webp 图片');
    }

    const audioUrl = await this.uploader.save(audio, `music/${monthDir()}`);
    let coverUrl = '';
    if (cover) {
      const saved = await this.uploader.save(cover, `music/${monthDir()}`);
      coverUrl = saved.url;
    }

    return this.music.create({
      title: dto.title,
      artist: dto.artist ?? '',
      cover: coverUrl,
      musicUrl: audioUrl.url,
      duration: dto.duration ?? 0,
    });
  }

  /** 替换已有曲目的音频/封面文件（至少一个） */
  @Post(':id/files')
  @Audit('music.files_replace', 'music')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
      ],
      {
        storage: multerStorage(),
        limits: { fileSize: MAX_AUDIO_SIZE },
      },
    ),
  )
  async replaceFiles(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      cover?: Express.Multer.File[];
    },
  ) {
    const item = await this.music.findById(id);
    if (!item) throw new NotFoundException('曲目不存在');

    const audio = files?.file?.[0];
    const cover = files?.cover?.[0];
    if (!audio && !cover) {
      throw new BadRequestException('请选择要替换的音频或封面文件');
    }
    if (audio && !ALLOWED_AUDIO_MIMES.has(audio.mimetype)) {
      cleanup(audio);
      cleanup(cover);
      throw new BadRequestException(
        '仅支持 mp3/m4a/aac/wav/ogg/flac 等常见音频格式',
      );
    }
    if (cover && !ALLOWED_COVER_MIMES.has(cover.mimetype)) {
      cleanup(audio);
      cleanup(cover);
      throw new BadRequestException('封面仅支持 jpg/png/gif/webp 图片');
    }

    let musicUrl = item.musicUrl;
    let coverUrl = item.cover;
    if (audio) {
      const saved = await this.uploader.save(audio, `music/${monthDir()}`);
      musicUrl = saved.url;
    }
    if (cover) {
      const saved = await this.uploader.save(cover, `music/${monthDir()}`);
      coverUrl = saved.url;
    }

    const updated = await this.music.update(id, { musicUrl, cover: coverUrl });
    if (!updated) throw new NotFoundException('曲目不存在');
    // 替换成功后清理旧文件并刷新 CDN 缓存（尽力而为）
    await this.cleanup.deleteAndPurge([
      audio ? item.musicUrl : null,
      cover ? item.cover : null,
    ]);
    return updated;
  }

  /** 更新曲目元数据 */
  @Patch(':id')
  @Audit('music.update', 'music')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMusicDto,
  ) {
    const item = await this.music.update(id, dto);
    if (!item) throw new NotFoundException('曲目不存在');
    return item;
  }

  /** 删除曲目 */
  @Delete(':id')
  @Audit('music.delete', 'music')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const item = await this.music.findById(id);
    if (!item) throw new NotFoundException('曲目不存在');
    const ok = await this.music.remove(id);
    if (!ok) throw new NotFoundException('曲目不存在');
    await this.cleanup.deleteAndPurge([item.musicUrl, item.cover]);
    return { deleted: true };
  }
}
