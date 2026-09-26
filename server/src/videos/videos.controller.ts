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
import {
  CurrentUser,
  CurrentUserOptional,
} from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CreateVideoCommentDto, CreateVideoDto } from './video.dto';
import { VideosService } from './videos.service';

/** 客户端：短视频（信息流/发布/点赞/评论/分享/浏览） */
@Controller('videos')
export class VideosController {
  constructor(private readonly videos: VideosService) {}

  /** 推荐信息流（全部已通过视频，按创建时间倒序；q 为关键词模糊搜索） */
  @Get()
  recommend(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('q') q?: string,
  ) {
    return this.videos.recommendFeed(undefined, page, 20, q ?? '');
  }

  /** 关注信息流（已关注作者的视频，需登录） */
  @Get('following')
  @UseGuards(JwtAuthGuard)
  following(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.videos.followingFeed(user.id, page);
  }

  /** 我的发布列表（需登录） */
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  myVideos(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.videos.myVideos(user.id, page);
  }

  /** 我点赞过的视频列表（必须在 :id 路由前） */
  @Get('my-likes')
  @UseGuards(JwtAuthGuard)
  myLikes(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.videos.myLikedVideos(user.id, page);
  }

  /** 批量查询当前用户点赞状态（必须在 :id 路由前） */
  @Get('liked')
  @UseGuards(JwtAuthGuard)
  async batchLiked(@CurrentUser() user: AuthUser, @Query('ids') ids: string) {
    const videoIds = (ids || '').split(',').map(Number).filter(Boolean);
    const likedSet = await this.videos.hasUserLikedMultiple(user.id, videoIds);
    const result: Record<number, boolean> = {};
    for (const id of videoIds) {
      result[id] = likedSet.has(id);
    }
    return result;
  }

  /** 发布短视频（需登录） */
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVideoDto) {
    return this.videos.create(user.id, dto);
  }

  /** 删除自己的视频/照片作品 */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteOwn(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.videos.deleteOwn(user.id, id).then(() => ({ deleted: true }));
  }

  /** 查看某个用户发布的视频 */
  @Get('users/:userId/videos')
  userVideos(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.videos.userVideos(userId, page);
  }

  /** 获取我的视频浏览历史（必须在 :id 路由前） */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  fetchHistory(
    @CurrentUser() user: AuthUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.videos.fetchHistory(user.id, page);
  }

  /** 视频详情 */
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.videos.detail(id);
  }

  // ──── Likes ────

  /** 切换点赞 */
  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  toggleLike(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.videos.toggleLike(user.id, id);
  }

  /** 检查是否已点赞 */
  @Get(':id/like')
  @UseGuards(JwtAuthGuard)
  isLiked(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.videos.isLiked(user.id, id).then((liked) => ({ liked }));
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
    return this.videos.getComments(id, page, 50, user?.id);
  }

  /** 添加评论（需登录） */
  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  addComment(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateVideoCommentDto,
  ) {
    return this.videos.addComment(user.id, id, dto);
  }

  /** 切换评论点赞 */
  @Post(':id/comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  toggleCommentLike(
    @CurrentUser() user: AuthUser,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.videos.toggleCommentLike(user.id, commentId);
  }

  /** 检查当前用户是否已点赞评论 */
  @Get(':id/comments/:commentId/like')
  @UseGuards(JwtAuthGuard)
  isCommentLiked(
    @CurrentUser() user: AuthUser,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.videos
      .isCommentLiked(user.id, commentId)
      .then((liked) => ({ liked }));
  }

  // ──── History ────

  /** 添加视频浏览历史（需登录） */
  @Post(':id/history')
  @UseGuards(JwtAuthGuard)
  addHistory(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.videos.addHistory(user.id, id).then(() => ({ ok: true }));
  }

  // ──── View / Share ────

  /** 记录浏览（浏览量 +1） */
  @Post(':id/view')
  recordView(@Param('id', ParseIntPipe) id: number) {
    return this.videos.recordView(id).then(() => ({ ok: true }));
  }

  /** 记录分享（分享数 +1） */
  @Post(':id/share')
  recordShare(@Param('id', ParseIntPipe) id: number) {
    return this.videos.recordShare(id).then(() => ({ ok: true }));
  }
}
