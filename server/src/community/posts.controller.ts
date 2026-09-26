import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserOptional,
} from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { CreatePostDto } from './post.dto';
import { CreateCommentDto } from './comment.dto';
import { CommunityService } from './community.service';

/** 客户端：社区作品（发布/列表/详情） */
@Controller('posts')
export class PostsController {
  constructor(private readonly community: CommunityService) {}

  /** 发布作品 */
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePostDto) {
    return this.community.create(user.id, dto);
  }

  /** 删除自己的作品 */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteOwn(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.community
      .deleteOwn(user.id, id)
      .then(() => ({ deleted: true }));
  }

  /** 最新信息流（仅展示已通过审核的作品） */
  @Get()
  latest(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('q') q?: string,
    @Query('channel') channel?: string,
  ) {
    return this.community.listLatest(page, 20, q ?? '', channel ?? '');
  }

  /** 热门信息流 */
  @Get('hot')
  hot(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('q') q?: string,
    @Query('channel') channel?: string,
  ) {
    return this.community.listHot(page, 20, q ?? '', channel ?? '');
  }

  /** 关注流：我关注的人的作品（必须在 :id 路由前） */
  @Get('following')
  @UseGuards(JwtAuthGuard)
  following(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.community.followingFeed(user.id, page);
  }

  /** 我的作品列表 */
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  myPosts(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.community.myPosts(user.id, page);
  }

  /** 批量检查当前用户点赞状态（必须在 :id 路由前） */
  @Get('liked')
  @UseGuards(JwtAuthGuard)
  async batchLiked(@CurrentUser() user: AuthUser, @Query('ids') ids: string) {
    const postIds = (ids || '').split(',').map(Number).filter(Boolean);
    const likedSet = await this.community.hasUserLikedMultiple(
      user.id,
      postIds,
    );
    const result: Record<number, boolean> = {};
    for (const id of postIds) {
      result[id] = likedSet.has(id);
    }
    return result;
  }

  /** 我的收藏列表（必须在 :id 路由前） */
  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  myFavorites(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.community.getMyCollections(user.id, page);
  }

  /** 我的点赞列表（必须在 :id 路由前） */
  @Get('my-likes')
  @UseGuards(JwtAuthGuard)
  myLikes(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.community.getMyLikes(user.id, page);
  }

  /** 获取我的浏览历史（需在 @Get(':id') 之前声明，避免路由被 :id 吞掉） */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  fetchHistory(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.community.fetchHistory(user.id, page);
  }

  /** 作品详情 */
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.community.detail(id);
  }

  // ──── Likes ────

  /** 切换点赞 */
  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  toggleLike(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.community.toggleLike(user.id, id);
  }

  /** 检查是否已点赞 */
  @Get(':id/like')
  @UseGuards(JwtAuthGuard)
  isLiked(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.community.isLiked(user.id, id).then((liked) => ({ liked }));
  }

  // ──── Collections ────

  /** 切换收藏 */
  @Post(':id/collect')
  @UseGuards(JwtAuthGuard)
  toggleCollect(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.community.toggleCollect(user.id, id);
  }

  /** 检查是否已收藏 */
  @Get(':id/collect')
  @UseGuards(JwtAuthGuard)
  isCollected(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.community
      .isCollected(user.id, id)
      .then((collected) => ({ collected }));
  }

  // ──── Comments ────

  /** 获取评论列表 */
  @Get(':id/comments')
  @UseGuards(OptionalJwtAuthGuard)
  getComments(
    @CurrentUserOptional() user: AuthUser | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.community.getComments(id, page, 20, user?.id);
  }

  /** 添加评论 */
  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  addComment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCommentDto,
  ) {
    return this.community.addComment(user.id, id, dto);
  }

  /** 切换评论点赞 */
  @Post(':id/comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  toggleCommentLike(
    @CurrentUser() user: AuthUser,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.community.toggleCommentLike(user.id, commentId);
  }

  /** 检查当前用户是否已点赞评论 */
  @Get(':id/comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  isCommentLiked(
    @CurrentUser() user: AuthUser,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.community
      .isCommentLiked(user.id, commentId)
      .then((liked) => ({ liked }));
  }

  // ──── History ────

  /** 添加浏览历史 */
  @Post(':id/history')
  @UseGuards(JwtAuthGuard)
  addHistory(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.community.addHistory(user.id, id);
  }

  // ──── View ────

  /** 记录浏览（浏览量 +1） */
  @Post(':id/view')
  postView(@Param('id', ParseIntPipe) id: number) {
    return this.community.recordView(id).then(() => ({ ok: true }));
  }

  // ──── Share ────

  /** 记录分享（分享数 +1） */
  @Post(':id/share')
  postShare(@Param('id', ParseIntPipe) id: number) {
    return this.community.recordShare(id).then(() => ({ ok: true }));
  }

  // ──── User profile posts ────

  /** 查看某个用户发布的作品 */
  @Get('users/:userId/posts')
  userPosts(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.community.userPosts(userId, page);
  }
}
