import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { Repository } from 'typeorm';
import { Music } from '../music/music.entity';
import { uploadRoot } from '../uploads/uploads.provider';

const execFileAsync = promisify(execFile);

/** ffprobe 探测结果 */
interface ProbeResult {
  durationSec: number;
  hasAudio: boolean;
}

@Injectable()
export class AudioMixService {
  private readonly logger = new Logger(AudioMixService.name);
  /** 配乐音量（0~1，作为原声背景音乐） */
  private readonly MUSIC_VOLUME = 0.5;

  constructor(
    @InjectRepository(Music)
    private readonly music: Repository<Music>,
  ) {}

  /**
   * 把 [musicId] 对应的曲目混入 [videoUrl]（/uploads/... 相对路径）指向的视频，
   * 返回混音后新视频的相对 URL；原视频文件在成功后删除。
   *
   * 混音规则（短视频场景）：
   * - 保留原视频音轨（人声/环境音），配乐以 0.5 音量垫底；
   * - 配乐循环铺满整段视频（超出部分裁剪，不足部分循环）；
   * - 视频流直接 copy 不重编码，仅重编码音频，速度更快且不损失画质。
   */
  async mix(musicId: number, videoUrl: string): Promise<string> {
    const musicRow = await this.music.findOneBy({ id: musicId });
    if (!musicRow || !musicRow.musicUrl) {
      throw new NotFoundException('配乐不存在或缺少音频文件');
    }

    const videoPath = this.resolveLocalPath(videoUrl, 'videoUrl');
    if (!videoPath || !existsSync(videoPath)) {
      throw new BadRequestException('视频文件不存在，无法合成配乐');
    }

    const musicInput = await this.prepareMusicInput(musicRow.musicUrl);

    try {
      const probe = await this.probe(videoPath);
      const output = this.buildOutputPath();
      await this.runFfmpeg(videoPath, musicInput.input, output, probe);
      // 混音成功：原上传视频已无保留价值，删除避免占用存储
      this.removeFile(videoPath);
      return this.toRelativeUrl(output);
    } catch (err) {
      throw this.toFriendlyError(err, '配乐混音失败');
    } finally {
      if (musicInput.temp) this.removeFile(musicInput.temp);
    }
  }

  /**
   * 照片作品配乐：把照片列表 + 配乐合成一段竖屏幻灯片视频。
   *
   * 每张照片展示 [PHOTO_SECONDS] 秒，总时长 6~30 秒；配乐循环铺满整段。
   * 返回生成的视频 URL 与真实时长（供作品元数据记录）。
   */
  async makePhotoSlideshow(
    musicId: number,
    photoUrls: string[],
    cover: string,
  ): Promise<{ url: string; duration: number }> {
    const musicRow = await this.music.findOneBy({ id: musicId });
    if (!musicRow || !musicRow.musicUrl) {
      throw new NotFoundException('配乐不存在或缺少音频文件');
    }

    const photos = (photoUrls.length ? photoUrls : [cover]).filter((u) => u);
    if (!photos.length) {
      throw new BadRequestException('缺少照片素材，无法合成配乐');
    }
    const photoPaths = photos.map((u) => this.resolveLocalPath(u, 'videoUrl'));
    for (const p of photoPaths) {
      if (!p || !existsSync(p)) {
        throw new BadRequestException('照片文件不存在，无法合成配乐');
      }
    }

    const totalSec = Math.max(
      Math.min(photos.length * this.PHOTO_SECONDS, 30),
      6,
    );
    const musicInput = await this.prepareMusicInput(musicRow.musicUrl);
    try {
      const output = this.buildOutputPath('photos');
      await this.runSlideshowFfmpeg(
        photoPaths as string[],
        musicInput.input,
        output,
        totalSec,
      );
      return { url: this.toRelativeUrl(output), duration: totalSec };
    } catch (err) {
      throw this.toFriendlyError(err, '照片配乐合成失败');
    } finally {
      if (musicInput.temp) this.removeFile(musicInput.temp);
    }
  }

  /** 每张照片在幻灯片视频中的展示秒数 */
  private readonly PHOTO_SECONDS = 3;

  /** 曲库音频 → 本地绝对路径；远程音频先下载到临时文件（流式循环更可靠） */
  private async prepareMusicInput(
    musicUrl: string,
  ): Promise<{ input: string; temp?: string }> {
    if (/^https?:\/\//i.test(musicUrl)) {
      const temp = join(tmpdir(), `diy-music-${randomUUID()}.mp3`);
      try {
        const resp = await fetch(musicUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const { writeFile } = await import('fs/promises');
        await writeFile(temp, Buffer.from(await resp.arrayBuffer()));
        return { input: temp, temp };
      } catch (err) {
        this.logger.warn(`配乐下载失败：${musicUrl}（${String(err)}）`);
        throw new BadRequestException('配乐下载失败，请更换配乐后重试');
      }
    }
    const local = this.resolveMusicInput(musicUrl);
    if (!local) {
      throw new BadRequestException('配乐音频文件不存在，无法合成');
    }
    return { input: local };
  }

  /** 删除文件；失败静默（不阻塞发布） */
  private removeFile(path: string) {
    try {
      unlinkSync(path);
    } catch {
      /* 忽略删除失败 */
    }
  }

  /** 把意外异常统一转成用户可读的 400 错误，避免暴露 500 */
  private toFriendlyError(err: unknown, prefix: string): BadRequestException {
    if (err instanceof BadRequestException) return err;
    this.logger.error(`${prefix}：${String(err)}`);
    return new BadRequestException(`${prefix}，请重试或更换配乐`);
  }

  /** ffprobe 探测视频时长与是否含音轨 */
  private async probe(videoPath: string): Promise<ProbeResult> {
    let stdout: string;
    try {
      const result = await execFileAsync('ffprobe', [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_streams',
        '-show_format',
        videoPath,
      ]);
      stdout = result.stdout;
    } catch (err) {
      this.logger.error(`ffprobe 探测失败：${String(err)}`);
      if (
        err &&
        typeof err === 'object' &&
        (err as { code?: string }).code === 'ENOENT'
      ) {
        throw new BadRequestException('服务器缺少 ffmpeg 环境，无法合成配乐');
      }
      throw new BadRequestException('无法读取视频信息，请重新上传后重试');
    }
    const data = JSON.parse(stdout) as {
      streams?: Array<{ codec_type?: string }>;
      format?: { duration?: string };
    };
    const durationSec = parseFloat(data.format?.duration ?? '0') || 0;
    const hasAudio = (data.streams ?? []).some((s) => s.codec_type === 'audio');
    if (!durationSec) {
      throw new BadRequestException('无法读取视频时长，请重新上传');
    }
    return { durationSec, hasAudio };
  }

  /** 合成输出路径：uploads/video/{yyyy}/{mm}/{uuid}-{tag}.mp4 */
  private buildOutputPath(tag = 'music'): string {
    const d = new Date();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dir = join(uploadRoot(), 'video', `${d.getFullYear()}`, mm);
    mkdirSync(dir, { recursive: true });
    return join(dir, `${randomUUID()}-${tag}.mp4`);
  }

  private async runFfmpeg(
    videoPath: string,
    musicPath: string,
    outputPath: string,
    probe: ProbeResult,
  ) {
    const args = ['-y', '-i', videoPath, '-stream_loop', '-1', '-i', musicPath];
    if (probe.hasAudio) {
      // 原声 + 配乐混音；配乐循环播放至视频结束
      args.push(
        '-filter_complex',
        `[0:a]volume=1.0[a0];[1:a]volume=${this.MUSIC_VOLUME}[a1];` +
          '[a0][a1]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,' +
          'alimiter=limit=0.95:level=false[aout]',
        '-map',
        '0:v',
        '-map',
        '[aout]',
      );
    } else {
      // 视频无音轨：直接以配乐作为唯一音轨
      args.push('-map', '0:v', '-map', '1:a');
    }
    args.push(
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-ac',
      '2',
      '-t',
      String(probe.durationSec),
      '-movflags',
      '+faststart',
      outputPath,
    );
    try {
      await execFileAsync('ffmpeg', args, { timeout: 5 * 60 * 1000 });
    } catch (err) {
      const stderr =
        err && typeof err === 'object' && 'stderr' in err
          ? String((err as { stderr: unknown }).stderr).slice(0, 500)
          : String(err);
      this.logger.error(`配乐混音失败：${stderr}`);
      throw new BadRequestException('配乐合成失败，请重试或更换配乐');
    }
  }

  /** 照片幻灯片 + 配乐 → 一段竖屏 MP4（mpeg4/aac，与客户端合成器一致） */
  private async runSlideshowFfmpeg(
    photos: string[],
    musicPath: string,
    outputPath: string,
    totalSec: number,
  ) {
    const perSec = totalSec / photos.length;
    const args = ['-y'];
    for (const p of photos) {
      args.push('-loop', '1', '-t', perSec.toFixed(3), '-i', p);
    }
    args.push('-stream_loop', '-1', '-i', musicPath);

    const filters = photos.map(
      (_, i) =>
        `[${i}:v]scale=720:1280:force_original_aspect_ratio=decrease,` +
        'pad=720:1280:(ow-iw)/2:(oh-ih)/2:black,setsar=1' +
        `[v${i}]`,
    );
    const concatInputs = photos.map((_, i) => `[v${i}]`).join('');
    filters.push(
      `${concatInputs}concat=n=${photos.length}:v=1:a=0[vc]`,
      `[${photos.length}:a]volume=0.9[a]`,
    );
    args.push(
      '-filter_complex',
      filters.join(';'),
      '-map',
      '[vc]',
      '-map',
      '[a]',
      '-c:v',
      'mpeg4',
      '-q:v',
      '3',
      '-pix_fmt',
      'yuv420p',
      '-r',
      '30',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-ac',
      '2',
      '-t',
      String(totalSec),
      '-movflags',
      '+faststart',
      outputPath,
    );
    try {
      await execFileAsync('ffmpeg', args, { timeout: 5 * 60 * 1000 });
    } catch (err) {
      const stderr =
        err && typeof err === 'object' && 'stderr' in err
          ? String((err as { stderr: unknown }).stderr).slice(0, 500)
          : String(err);
      this.logger.error(`照片配乐合成失败：${stderr}`);
      throw new BadRequestException('配乐合成失败，请重试或更换配乐');
    }
  }

  /** 服务端本地文件 → 绝对路径（/uploads/... 与 /assets/music/...） */
  private resolveLocalPath(url: string, kind: 'videoUrl' | 'musicUrl') {
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/uploads/')) {
      const rel = url.replace(/^\/uploads\//, '');
      return join(process.cwd(), uploadRoot(), ...rel.split('/'));
    }
    if (url.startsWith('/assets/music/')) {
      const rel = url.replace(/^\/assets\/music\//, '');
      return join(process.cwd(), 'assets', 'music', ...rel.split('/'));
    }
    this.logger.warn(
      `无法解析${kind === 'videoUrl' ? '视频' : '配乐'}路径：${url}`,
    );
    return null;
  }

  /** 曲库音频 → 本地绝对路径或远程 URL（远程由 mix() 下载） */
  private resolveMusicInput(musicUrl: string): string | null {
    if (/^https?:\/\//i.test(musicUrl)) return musicUrl;
    const resolved = this.resolveLocalPath(musicUrl, 'musicUrl');
    if (!resolved) return null;
    // 曲库音频可能不在 assets 下（如上传到 /uploads 的音频），存在即用
    if (musicUrl.startsWith('/assets/music/')) return resolved;
    return existsSync(resolved) ? resolved : null;
  }

  /** 绝对输出路径 → /uploads/... 相对 URL */
  private toRelativeUrl(absPath: string): string {
    const rel = absPath
      .replace(process.cwd(), '')
      .split(/\//)
      .map((s) => s.trim())
      .filter(Boolean)
      .join('/');
    return `/${rel}`;
  }
}
