import { Inject, Injectable, Logger } from '@nestjs/common';
import { CDN_REFRESHER, type CdnRefresher } from './cdn-refresh';
import { UPLOAD_PROVIDER, type UploadProvider } from './uploads.provider';

/**
 * 媒体资源清理：删除内容时同步删除存储中的对象并刷新 CDN 缓存。
 * 尽力而为——单条失败只记日志，不阻断业务删除。
 */
@Injectable()
export class MediaCleanupService {
  private readonly logger = new Logger(MediaCleanupService.name);

  constructor(
    @Inject(UPLOAD_PROVIDER)
    private readonly uploader: UploadProvider,
    @Inject(CDN_REFRESHER)
    private readonly cdn: CdnRefresher,
  ) {}

  /** 删除一组媒体 URL 并刷新 CDN 缓存（自动去重、跳过空值/非存储资源） */
  async deleteAndPurge(urls: Array<string | null | undefined>): Promise<void> {
    const targets = [
      ...new Set(
        urls.filter(
          (u): u is string => typeof u === 'string' && u.trim() !== '',
        ),
      ),
    ];
    if (!targets.length) return;

    const results = await Promise.allSettled(
      targets.map((url) => this.uploader.delete(url)),
    );
    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger.warn(`删除媒体失败: ${(result.reason as Error).message}`);
      }
    }

    try {
      await this.cdn.refresh(targets);
    } catch (err) {
      this.logger.warn(`CDN 缓存刷新失败: ${(err as Error).message}`);
    }
  }
}
