import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../appointments/appointment.entity';
import { Comment } from '../community/comment.entity';
import { Like } from '../community/like.entity';
import { Post } from '../community/post.entity';
import { MemberOrder } from '../members/member-order.entity';
import { User } from '../users/user.entity';
import { Video } from '../videos/video.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(Like)
    private readonly likeRepo: Repository<Like>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(Video)
    private readonly videoRepo: Repository<Video>,
    @InjectRepository(MemberOrder)
    private readonly memberOrderRepo: Repository<MemberOrder>,
  ) {}

  async getOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      todayUsers,
      totalAppointments,
      todayAppointments,
      todayCheckIns,
      todayInService,
      todayCompleted,
      totalPosts,
      todayPosts,
      todayLikes,
      todayComments,
      totalVideos,
      todayVideos,
      pendingPosts,
      pendingVideos,
    ] = await Promise.all([
      this.userRepo.count(),
      this.userRepo
        .createQueryBuilder('u')
        .where('u.createdAt >= :today', { today })
        .getCount(),
      this.appointmentRepo.count(),
      this.appointmentRepo
        .createQueryBuilder('a')
        .where('a.createdAt >= :today', { today })
        .getCount(),
      this.appointmentRepo.count({ where: { status: 'checked_in' } }),
      this.appointmentRepo.count({ where: { status: 'in_service' } }),
      this.appointmentRepo.count({ where: { status: 'completed' } }),
      this.postRepo.count(),
      this.postRepo
        .createQueryBuilder('p')
        .where('p.createdAt >= :today', { today })
        .getCount(),
      this.likeRepo
        .createQueryBuilder('l')
        .where('l.createdAt >= :today', { today })
        .getCount(),
      this.commentRepo
        .createQueryBuilder('c')
        .where('c.createdAt >= :today', { today })
        .getCount(),
      this.videoRepo.count(),
      this.videoRepo
        .createQueryBuilder('v')
        .where('v.createdAt >= :today', { today })
        .getCount(),
      this.postRepo.count({ where: { status: 'pending' } }),
      this.videoRepo.count({ where: { status: 'pending' } }),
    ]);

    return {
      users: { total: totalUsers, today: todayUsers },
      appointments: {
        total: totalAppointments,
        today: todayAppointments,
        checkedIn: todayCheckIns,
        inService: todayInService,
        completed: todayCompleted,
      },
      community: {
        totalPosts,
        todayPosts,
        todayLikes,
        todayComments,
      },
      videos: {
        total: totalVideos,
        today: todayVideos,
      },
      pending: {
        posts: pendingPosts,
        videos: pendingVideos,
      },
    };
  }

  /** 近7天趋势数据 */
  async getTrends() {
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const results = await Promise.all(
      dates.map(async (date) => {
        const start = new Date(`${date}T00:00:00`);
        const end = new Date(`${date}T23:59:59`);

        const [users, appointments, posts, likes, comments, videos] =
          await Promise.all([
            this.userRepo
              .createQueryBuilder('u')
              .where('u.createdAt BETWEEN :start AND :end', { start, end })
              .getCount(),
            this.appointmentRepo
              .createQueryBuilder('a')
              .where('a.createdAt BETWEEN :start AND :end', { start, end })
              .getCount(),
            this.postRepo
              .createQueryBuilder('p')
              .where('p.createdAt BETWEEN :start AND :end', { start, end })
              .getCount(),
            this.likeRepo
              .createQueryBuilder('l')
              .where('l.createdAt BETWEEN :start AND :end', { start, end })
              .getCount(),
            this.commentRepo
              .createQueryBuilder('c')
              .where('c.createdAt BETWEEN :start AND :end', { start, end })
              .getCount(),
            this.videoRepo
              .createQueryBuilder('v')
              .where('v.createdAt BETWEEN :start AND :end', { start, end })
              .getCount(),
          ]);
        return { date, users, appointments, posts, likes, comments, videos };
      }),
    );

    return results;
  }

  /** 管理端待处理事项汇总：供左侧栏角标与通知中心使用 */
  async getPendingSummary() {
    const [
      pendingAppointments,
      pendingMemberOrders,
      pendingPosts,
      pendingVideos,
    ] = await Promise.all([
      this.appointmentRepo.count({ where: { status: 'pending' } }),
      this.memberOrderRepo.count({ where: { status: 'pending' } }),
      this.postRepo.count({ where: { status: 'pending' } }),
      this.videoRepo.count({ where: { status: 'pending' } }),
    ]);

    return {
      pendingAppointments,
      pendingMemberOrders,
      pendingPosts,
      pendingVideos,
    };
  }
}
