/** 消息内容类型：text 文本/表情；image 图片；video 视频（content 存 /uploads/video/... 相对路径）；voice 语音（content 存 {url,duration} JSON） */
export type MessageContentType = 'text' | 'image' | 'voice' | 'video';

/** 聊天媒体内容必须是本站上传的相对路径（图片走 chat/，视频走 video/） */
const MEDIA_URL_RE = /^\/uploads\/(chat|video)\/[\w./-]+$/;

/** 语音内容校验：JSON { url, duration }，url 必须是本站上传路径 */
function isValidVoiceContent(content: string): boolean {
  try {
    const j = JSON.parse(content) as { url?: unknown; duration?: unknown };
    return (
      typeof j.url === 'string' &&
      MEDIA_URL_RE.test(j.url) &&
      typeof j.duration === 'number' &&
      j.duration >= 0
    );
  } catch {
    return false;
  }
}

/** 消息内容合法性校验（单聊/群聊共用） */
export function isValidChatContent(
  type: MessageContentType,
  content: string,
): boolean {
  const body = content.trim();
  if (type === 'image' || type === 'video') return MEDIA_URL_RE.test(body);
  if (type === 'voice') return isValidVoiceContent(body);
  return body.length > 0;
}

/** 从聊天消息中提取媒体 URL（image/video 直接是 URL；voice 是 {url,duration} JSON） */
export function messageMediaUrls(
  type: MessageContentType,
  content: string,
): string[] {
  if (type === 'image' || type === 'video') {
    const url = content.trim();
    return url ? [url] : [];
  }
  if (type === 'voice') {
    try {
      const j = JSON.parse(content) as { url?: unknown };
      return typeof j.url === 'string' && j.url ? [j.url] : [];
    } catch {
      return [];
    }
  }
  return [];
}
