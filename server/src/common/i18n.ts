export type AppLocale = 'zh' | 'en';

/** 从 Accept-Language 或 lang 查询参数解析服务端语言，默认中文保持现有行为。 */
export function resolveLocale(
  acceptLanguage?: string | string[],
  lang?: string | string[],
): AppLocale {
  const query = (
    Array.isArray(lang) ? String(lang[0] ?? '') : String(lang ?? '')
  )
    .trim()
    .toLowerCase();
  if (query.startsWith('en')) return 'en';
  if (query.startsWith('zh')) return 'zh';

  const header = Array.isArray(acceptLanguage)
    ? String(acceptLanguage[0] ?? '')
    : String(acceptLanguage ?? '');
  const first = header.split(',')[0]?.trim().toLowerCase() ?? '';
  if (first.startsWith('en')) return 'en';
  return 'zh';
}

/** 服务端错误文案（抛出时仍保留中文作为 key，英文由本表提供）。 */
const ERROR_EN: Record<string, string> = {
  服务器内部错误: 'Internal server error.',
  未登录: 'You are not signed in.',
  登录已过期: 'Your session has expired.',
  '登录已过期，请重新登录': 'Your session has expired. Please sign in again.',
  账号已被禁用: 'This account has been disabled.',
  '账号已被禁用，请重新登录':
    'This account has been disabled. Please sign in again.',
  '账号已被强制下线，请重新登录':
    'Your account has been signed out. Please sign in again.',
  无管理权限: 'Admin permission required.',

  用户不存在: 'User not found.',
  用户名已被占用: 'Username is already taken.',
  '用户名至少 2 位': 'Username must be at least 2 characters.',
  '用户名最多 30 位': 'Username must be at most 30 characters.',
  '用户名仅支持字母、数字和下划线':
    'Username can only contain letters, numbers, and underscores.',
  用户名一年内只能修改一次: 'Username can only be changed once a year.',
  该邮箱已注册: 'This email is already registered.',
  '该邮箱未注册，请先注册账号':
    'This email is not registered. Please create an account first.',
  邮箱格式不正确: 'Invalid email format.',
  '密码至少 6 位': 'Password must be at least 6 characters.',
  '密码最多 32 位': 'Password must be at most 32 characters.',
  '验证码为 6 位数字': 'Verification code must be 6 digits.',
  验证码错误或已过期: 'Incorrect or expired verification code.',
  用户名或密码错误: 'Incorrect username or password.',
  '用户名或邮箱至少 2 位': 'Username or email must be at least 2 characters.',
  用户名或邮箱过长: 'Username or email is too long.',
  '发送过于频繁，请稍后再试':
    'You are sending too often. Please try again later.',
  '发送过于频繁，请 60 秒后再试':
    'You are sending too often. Please try again in 60 seconds.',
  '尝试次数过多，请稍后再试': 'Too many attempts. Please try again later.',
  '尝试次数过多，请 10 分钟后再试':
    'Too many attempts. Please try again in 10 minutes.',
  请输入原密码: 'Current password is required.',
  原密码不正确: 'Current password is incorrect.',

  作品不存在: 'Post not found.',
  评论不存在: 'Comment not found.',
  回复的评论不存在: 'The comment you replied to was not found.',
  只能删除自己的作品: 'You can only delete your own posts.',
  视频不存在: 'Video not found.',
  '标题不能超过 200 字': 'Title must not exceed 200 characters.',
  '文案不能超过 5000 字': 'Content must not exceed 5000 characters.',
  '评论不能超过 500 字': 'Comment must not exceed 500 characters.',
  '最多上传 9 张图片': 'Maximum 9 images.',
  '最多上传 9 个媒体': 'Maximum 9 media items.',
  '状态仅可为 approved 或 rejected': 'Status must be approved or rejected.',
  '时长必须大于 0 秒': 'Duration must be greater than 0 seconds.',

  不能关注自己: 'You cannot follow yourself.',
  不能拉黑自己: 'You cannot block yourself.',
  'following 必须是布尔值': 'following must be a boolean.',
  'blocked 必须是布尔值': 'blocked must be a boolean.',

  门店不存在: 'Store not found.',
  桌位不存在: 'Table not found.',
  时段不存在: 'Time slot not found.',
  套餐不存在: 'Package not found.',
  套餐不存在或已下架: 'Package not found or unavailable.',
  '开始时间格式为 HH:mm': 'Start time must be in HH:mm format.',
  '结束时间格式为 HH:mm': 'End time must be in HH:mm format.',
  '日期格式为 YYYY-MM-DD': 'Date must be in YYYY-MM-DD format.',
  '人数至少 1 人': 'People count must be at least 1.',
  '支付方式仅支持微信/支付宝': 'Payment method must be WeChat or Alipay.',
  '预约码为 6 位数字或字母':
    'Booking code must be 6 characters (letters or digits).',
  '核销码为 6 位数字或字母':
    'Redemption code must be 6 characters (letters or digits).',
  预约码无效: 'Invalid booking code.',
  预约单不存在: 'Booking not found.',

  '门店预约需要选择门店、桌位和预约方式':
    'Store bookings require a store, table, and booking method.',
  门店预约需要选择桌位: 'Store bookings require selecting a table.',
  门店预约需要选择日期: 'Store bookings require selecting a date.',
  不能预约过去的日期: 'You cannot book a past date.',
  套餐预约需要选择套餐: 'Package bookings require selecting a package.',
  套餐预约需要选择开始时间: 'Package bookings require selecting a start time.',
  按小时预约需要选择开始时间: 'Hourly bookings require selecting a start time.',
  按小时预约需要选择时长: 'Hourly bookings require selecting a duration.',
  部分桌位不存在或已停用: 'Some tables do not exist or are disabled.',
  '该日期营业时段已结束，无法预约': 'Business hours have ended for this date.',
  '该时段已开始，无法预约':
    'This time slot has already started and cannot be booked.',
  '该桌位刚被其他用户预约，请选择其他时段或桌位':
    'These tables were just booked by another user. Please choose another time or table.',
  活动预约需要选择活动和场次:
    'Activity bookings require selecting an activity and session.',
  活动不存在或不可预约: 'Activity not found or unavailable for booking.',
  活动不存在: 'Activity not found.',
  活动不存在或已下架: 'Activity not found or unavailable.',
  活动场次不存在: 'Activity session not found.',
  不能预约过去的场次: 'You cannot book a past session.',
  '该场次名额刚被其他用户抢走，请选择其他场次':
    'Seats in this session were just taken. Please choose another session.',

  优惠券不存在或已过期: 'Coupon not found or expired.',
  '优惠券不可用（未领取或已使用）':
    'Coupon is unavailable (not claimed or already used).',
  仅限有效会员领取: 'Only active members can claim this.',
  已经领取过了: 'You have already claimed this.',
  优惠券已领完: 'Coupon is sold out.',

  无权查看该预约单: 'You do not have permission to view this booking.',
  无权操作该预约单: 'You do not have permission to operate this booking.',
  仅待确认或待核销状态的预约可取消:
    'Only bookings pending confirmation or check-in can be cancelled.',
  '仅待确认、待核销或已核销状态的预约可取消':
    'Only bookings pending confirmation, pending check-in, or checked in can be cancelled.',
  仅待确认状态的预约可确认: 'Only pending bookings can be confirmed.',
  '预约日期已过，无法确认':
    'The booking date has passed and cannot be confirmed.',
  仅已核销状态的预约可上钟: 'Only checked-in bookings can start service.',
  仅服务中状态的预约可下钟: 'Only bookings in service can end service.',
  该预约已取消: 'This booking has been cancelled.',
  '该预约待门店确认，确认后方可到店核销':
    'This booking is pending store confirmation. It can be checked in after confirmation.',
  '该预约码已核销，不可重复核销':
    'This booking code has already been checked in.',

  开通申请不存在: 'Membership application not found.',
  仅待确认的开通申请可确认:
    'Only pending membership applications can be confirmed.',
  仅待确认的开通申请可取消:
    'Only pending membership applications can be cancelled.',
  会员记录不存在: 'Membership record not found.',
  有效期格式不正确: 'Invalid expiry date format.',
  有效期需晚于当前时间: 'Expiry date must be later than now.',
  '该用户已是会员，请直接编辑该记录':
    'This user is already a member. Please edit the existing record instead.',

  缺少文件: 'No file provided.',
  '文件过大，请压缩后再上传':
    'File is too large. Please compress it before uploading.',
  '仅支持 jpg/png/gif/webp 图片': 'Only jpg/png/gif/webp images are supported.',
  '封面仅支持 jpg/png/gif/webp 图片': 'Cover images must be jpg/png/gif/webp.',
  仅支持常见音频格式: 'Only common audio formats are supported.',
  '仅支持 mp3/m4a/aac/wav/ogg/flac 等常见音频格式':
    'Only common audio formats such as mp3/m4a/aac/wav/ogg/flac are supported.',
  '仅支持 mp4/mov/avi/webm/3gp 等常见视频格式':
    'Only common video formats such as mp4/mov/avi/webm/3gp are supported.',
  请选择音频文件: 'Please select an audio file.',
  请选择要替换的音频或封面文件:
    'Please select the audio or cover file to replace.',
  曲目不存在: 'Music track not found.',

  配乐不存在或缺少音频文件: 'Music track not found or missing audio file.',
  '视频文件不存在，无法合成配乐': 'Video file not found. Cannot mix music.',
  '缺少照片素材，无法合成配乐':
    'No photos provided. Cannot create slideshow with music.',
  '照片文件不存在，无法合成配乐':
    'Photo file not found. Cannot create slideshow with music.',
  '配乐下载失败，请更换配乐后重试':
    'Failed to download music. Please try a different track.',
  '配乐音频文件不存在，无法合成': 'Music audio file not found. Cannot mix.',
  '服务器缺少 ffmpeg 环境，无法合成配乐':
    'ffmpeg is missing on the server. Cannot mix music.',
  '无法读取视频信息，请重新上传后重试':
    'Could not read video info. Please upload again.',
  '无法读取视频时长，请重新上传':
    'Could not read video duration. Please upload again.',
  '配乐合成失败，请重试或更换配乐':
    'Music mix failed. Please try again or use another track.',

  会话不存在: 'Conversation not found.',
  无权访问该会话: 'You do not have permission to access this conversation.',
  不能和自己发起会话: 'You cannot start a conversation with yourself.',
  对方不存在: 'User not found.',
  对方账号已被禁用: 'This account has been disabled.',
  '你已拉黑对方，无法发起会话':
    'You have blocked this user and cannot start a conversation.',
  '对方已把你拉黑，无法发起会话':
    'This user has blocked you and cannot start a conversation.',
  '你已拉黑对方，无法发送消息':
    'You have blocked this user and cannot send messages.',
  '对方已把你拉黑，无法发送消息':
    'This user has blocked you and cannot send messages.',
  被引用的消息不存在: 'The referenced message was not found.',
  消息不存在: 'Message not found.',
  参数不合法: 'Invalid parameters.',
  图片地址不合法: 'Invalid image URL.',
  视频地址不合法: 'Invalid video URL.',
  语音内容不合法: 'Invalid voice content.',
  消息内容不能为空: 'Message content cannot be empty.',

  请至少选择一名群成员: 'Please select at least one group member.',
  存在无效的群成员: 'Invalid group member.',
  存在已被禁用的用户: 'Some users are disabled.',
  '存在与你存在拉黑关系的用户，无法创建群聊':
    'Some users have a block relationship with you. Group chat cannot be created.',
  消息内容不合法: 'Invalid message content.',
  请选择需要邀请的成员: 'Please select members to invite.',
  '存在与你存在拉黑关系的用户，无法邀请进群':
    'Some users have a block relationship with you. They cannot be invited.',
  所选成员均已在群内: 'All selected members are already in the group.',
  群聊不存在: 'Group not found.',
  '群主不能退出群聊，如需解散请使用「解散群聊」':
    'The group owner cannot leave. Use "dissolve group" to end it.',
  你不是该群成员: 'You are not a member of this group.',
  不能移出自己: 'You cannot remove yourself.',
  该用户不是群成员: 'This user is not a group member.',
  不能移出群主: 'You cannot remove the group owner.',
  不能移出其他管理员: 'You cannot remove another admin.',
  不能修改群主的角色: "You cannot change the group owner's role.",
  不能转让给自己: 'You cannot transfer ownership to yourself.',
  仅群主可执行该操作: 'Only the group owner can perform this action.',
  仅群主和管理员可执行该操作:
    'Only the group owner and admins can perform this action.',

  '昵称最长 30 个字符': 'Nickname must be at most 30 characters.',
  '简介最长 200 个字符': 'Bio must be at most 200 characters.',
  性别取值不合法: 'Invalid gender value.',
  '生日格式应为 YYYY-MM-DD': 'Birthday must be in YYYY-MM-DD format.',
  '所在地最长 60 个字符': 'Location must be at most 60 characters.',

  关键词不能为空: 'Keyword cannot be empty.',
  '关键词最长 30 个字符': 'Keyword must be at most 30 characters.',
  关键词不能包含空格: 'Keyword cannot contain spaces.',
  '场次日期格式为 YYYY-MM-DD': 'Session date must be in YYYY-MM-DD format.',
};

const MIX_PREFIX_EN: Record<string, string> = {
  配乐混音失败: 'Music mix failed',
  照片配乐合成失败: 'Photo slideshow creation failed',
};

interface ErrorPattern {
  regex: RegExp;
  build: (match: RegExpExecArray) => string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    regex: /^内容包含违规关键词「(.+?)」，请修改后发布$/,
    build: (m) =>
      `Content contains the blocked keyword "${m[1]}". Please revise before publishing.`,
  },
  {
    regex: /^预约时段（(.+?)）已结束，无法核销$/,
    build: (m) =>
      `The booking time (${m[1]}) has ended and cannot be checked in.`,
  },
  {
    regex: /^所选桌位最多容纳 (\d+) 人，当前 (\d+) 人，请增加桌位$/,
    build: (m) =>
      `The selected tables hold up to ${m[1]} people but you selected ${m[2]}. Please add more tables.`,
  },
  {
    regex: /^预约时段需在营业时间（(.+?)）内$/,
    build: (m) => `The booking time must be within business hours (${m[1]}).`,
  },
  {
    regex: /^该场次最多容纳 (\d+) 人$/,
    build: (m) => `This session holds up to ${m[1]} people.`,
  },
  {
    regex: /^该场次剩余名额不足，剩余 (\d+) 人$/,
    build: (m) =>
      `Not enough seats left in this session. Only ${m[1]} seats remain.`,
  },
  {
    regex: /^桌位 (.+?) (.+?)-(.+?) 已被预约，请选择其他时段或桌位$/,
    build: (m) =>
      `Table ${m[1]} (${m[2]}-${m[3]}) is already booked. Please choose another time or table.`,
  },
  {
    regex: /^订单金额未满足优惠券使用门槛（(.+?)）$/,
    build: (m) => `Order amount does not meet the coupon threshold (${m[1]}).`,
  },
  {
    regex: /^预约日期为 (.+?)，仅可在预约当天核销$/,
    build: (m) =>
      `The booking date is ${m[1]} and can only be checked in on that day.`,
  },
  {
    regex: /^该活动已有 (\d+) 条预约记录，无法删除，请改为下架$/,
    build: (m) =>
      `This activity has ${m[1]} bookings and cannot be deleted. Please take it offline instead.`,
  },
  {
    regex: /^未互相关注，最多可发送 (\d+) 条消息，互相关注后即可畅聊$/,
    build: (m) =>
      `You can send up to ${m[1]} messages until you follow each other.`,
  },
  {
    regex: /^(.+?)，请重试或更换配乐$/,
    build: (m) =>
      `${MIX_PREFIX_EN[m[1]] ?? `${m[1]} failed`}. Please try again or use another track.`,
  },
];

export function translateError(message: string, locale: AppLocale): string {
  if (locale !== 'en') return message;
  const exact = ERROR_EN[message];
  if (exact) return exact;
  for (const pattern of ERROR_PATTERNS) {
    const match = pattern.regex.exec(message);
    if (match) return pattern.build(match);
  }
  return message;
}

export function translateErrors(
  message: string | string[] | null | undefined,
  locale: AppLocale,
): string | string[] | null | undefined {
  if (typeof message === 'string') return translateError(message, locale);
  if (Array.isArray(message)) {
    return message.map((item) => translateError(String(item), locale));
  }
  return message;
}
