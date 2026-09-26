import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1786342307984 implements MigrationInterface {
  name = 'InitialSchema1786342307984';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`activities\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(60) NOT NULL, \`date\` varchar(40) NOT NULL, \`desc\` varchar(200) NOT NULL DEFAULT '', \`tag\` varchar(20) NOT NULL DEFAULT '', \`address\` varchar(255) NOT NULL DEFAULT '', \`lat\` decimal(10,7) NULL, \`lng\` decimal(10,7) NULL, \`price\` decimal(10,2) NOT NULL DEFAULT '0.00', \`memberPrice\` decimal(10,2) NULL, \`bookable\` tinyint NOT NULL DEFAULT 0, \`membersOnly\` tinyint NOT NULL DEFAULT 0, \`enabled\` tinyint NOT NULL DEFAULT 1, \`sort\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`activity_sessions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`activityId\` int NOT NULL, \`date\` varchar(10) NOT NULL, \`startTime\` varchar(5) NOT NULL, \`endTime\` varchar(5) NOT NULL, \`capacity\` int NOT NULL, \`enabled\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`appointments\` (\`id\` int NOT NULL AUTO_INCREMENT, \`type\` enum ('store', 'activity') NOT NULL DEFAULT 'store', \`bookingType\` enum ('hourly', 'package', 'all_day') NOT NULL DEFAULT 'hourly', \`durationHours\` int NULL, \`packageId\` int NULL, \`packageName\` varchar(60) NOT NULL DEFAULT '', \`userId\` int NOT NULL, \`storeId\` int NULL, \`storeName\` varchar(100) NOT NULL, \`tableId\` int NULL, \`tableName\` varchar(50) NOT NULL, \`slotId\` int NULL, \`activityId\` int NULL, \`activitySessionId\` int NULL, \`activityName\` varchar(100) NOT NULL DEFAULT '', \`date\` varchar(10) NOT NULL, \`startTime\` varchar(5) NOT NULL, \`endTime\` varchar(5) NOT NULL, \`peopleCount\` int NOT NULL, \`code\` varchar(10) NOT NULL, \`amount\` decimal(10,2) NOT NULL DEFAULT '0.00', \`originalAmount\` decimal(10,2) NOT NULL DEFAULT '0.00', \`payStatus\` enum ('unpaid', 'paid') NOT NULL DEFAULT 'unpaid', \`payMethod\` varchar(20) NOT NULL DEFAULT '', \`paidAt\` datetime NULL, \`userCouponId\` int NULL, \`couponTitle\` varchar(60) NOT NULL DEFAULT '', \`couponDiscount\` decimal(10,2) NOT NULL DEFAULT '0.00', \`status\` enum ('booked', 'checked_in', 'in_service', 'completed', 'cancelled') NOT NULL DEFAULT 'booked', \`note\` varchar(200) NOT NULL DEFAULT '', \`checkInTime\` datetime NULL, \`serviceStartTime\` datetime NULL, \`serviceEndTime\` datetime NULL, \`checkedInBy\` int NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_db09b0f96fb6e127adde11518e\` (\`storeId\`, \`tableId\`, \`date\`), UNIQUE INDEX \`IDX_d838dde2371446d33c990332cb\` (\`code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`chat_blocks\` (\`id\` int NOT NULL AUTO_INCREMENT, \`blockerId\` int NOT NULL, \`blockedId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_9d7f087b18b2afe5f5820c2f67\` (\`blockedId\`), UNIQUE INDEX \`IDX_0211f39220b655af6270477d14\` (\`blockerId\`, \`blockedId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`conversations\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userAId\` int NOT NULL, \`userBId\` int NOT NULL, \`lastMessageId\` bigint NULL, \`lastMessagePreview\` varchar(255) NULL, \`lastMessageAt\` datetime NULL, \`pinnedAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`idx_conversation_last_at\` (\`lastMessageAt\`), UNIQUE INDEX \`uk_conversation_users\` (\`userAId\`, \`userBId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`group_members\` (\`id\` int NOT NULL AUTO_INCREMENT, \`groupId\` int NOT NULL, \`userId\` int NOT NULL, \`role\` enum ('owner', 'admin', 'member') NOT NULL DEFAULT 'member', \`joinedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_53f644f66a416c1542b743c029\` (\`groupId\`, \`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`group_message_deletions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`groupId\` int NOT NULL, \`messageId\` int NOT NULL, \`userId\` int NOT NULL, \`deletedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`uk_group_msg_deletion\` (\`groupId\`, \`messageId\`, \`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`group_messages\` (\`id\` int NOT NULL AUTO_INCREMENT, \`groupId\` int NOT NULL, \`senderId\` int NOT NULL, \`contentType\` enum ('text', 'image', 'voice', 'video') NOT NULL DEFAULT 'text', \`content\` text NOT NULL, \`replyToId\` int NULL, \`replyPreview\` varchar(255) NULL, \`forwarded\` tinyint NOT NULL DEFAULT 0, \`recalledAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`idx_group_message\` (\`groupId\`, \`id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`group_reads\` (\`id\` int NOT NULL AUTO_INCREMENT, \`groupId\` int NOT NULL, \`userId\` int NOT NULL, \`lastReadMessageId\` bigint NOT NULL DEFAULT '0', \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_2f084f7f2a80d0b621fb1e37ae\` (\`groupId\`, \`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`groups\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(60) NOT NULL, \`ownerId\` int NOT NULL, \`lastMessageId\` bigint NULL, \`lastMessagePreview\` varchar(255) NULL, \`lastMessageAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`idx_group_last_at\` (\`lastMessageAt\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`messages\` (\`id\` int NOT NULL AUTO_INCREMENT, \`conversationId\` int NOT NULL, \`senderId\` int NOT NULL, \`contentType\` enum ('text', 'image', 'voice', 'video') NOT NULL DEFAULT 'text', \`content\` text NOT NULL, \`replyToId\` int NULL, \`replyPreview\` varchar(255) NULL, \`forwarded\` tinyint NOT NULL DEFAULT 0, \`recalledAt\` datetime NULL, \`readAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`idx_message_conversation\` (\`conversationId\`, \`id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`message_status\` (\`id\` int NOT NULL AUTO_INCREMENT, \`messageId\` int NOT NULL, \`userId\` int NOT NULL, \`readAt\` datetime NULL, \`deletedAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`idx_message_status_user\` (\`userId\`, \`readAt\`), UNIQUE INDEX \`uk_message_status_msg_user\` (\`messageId\`, \`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`post_collections\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`postId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_8d9fd5808d6d291748185df233\` (\`userId\`, \`postId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`post_comment_likes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`commentId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_2a4ca6d34d5241239862bdbeae\` (\`userId\`, \`commentId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`post_comments\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`postId\` int NOT NULL, \`parentId\` int NULL, \`replyToId\` int NULL, \`content\` text NOT NULL, \`likeCount\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_57c326e236267a8dc7c990955d\` (\`parentId\`), INDEX \`IDX_ac65d744abc05279aee0b29085\` (\`postId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`post_likes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`postId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_30ee85070afe5b92b5920957b1\` (\`userId\`, \`postId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`posts\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`title\` varchar(200) NOT NULL DEFAULT '', \`content\` text NOT NULL, \`location\` varchar(200) NOT NULL DEFAULT '', \`images\` json NOT NULL, \`medias\` json NULL, \`tags\` json NOT NULL, \`channelTag\` varchar(100) NOT NULL DEFAULT '', \`status\` enum ('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending', \`rejectReason\` varchar(500) NOT NULL DEFAULT '', \`likeCount\` int NOT NULL DEFAULT '0', \`collectCount\` int NOT NULL DEFAULT '0', \`commentCount\` int NOT NULL DEFAULT '0', \`viewCount\` int NOT NULL DEFAULT '0', \`shareCount\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_ae05faaa55c866130abef6e1fe\` (\`userId\`), INDEX \`IDX_a69d9e2ae78ef7d100f8317ae0\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`follows\` (\`id\` int NOT NULL AUTO_INCREMENT, \`followerId\` int NOT NULL, \`followeeId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_666a44940ce8279976767c6b5e\` (\`followeeId\`), UNIQUE INDEX \`IDX_63cae1eb7767feee4555f00c5f\` (\`followerId\`, \`followeeId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`coupons\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(60) NOT NULL, \`amount\` varchar(20) NOT NULL, \`threshold\` varchar(60) NOT NULL DEFAULT '无门槛', \`expireAt\` datetime NOT NULL, \`stock\` int NOT NULL DEFAULT '0', \`membersOnly\` tinyint NOT NULL DEFAULT 1, \`enabled\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`user_coupons\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`couponId\` int NOT NULL, \`status\` enum ('unused', 'used', 'expired') NOT NULL DEFAULT 'unused', \`usedAt\` datetime NULL, \`receivedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_e757a8da7b49836d30a152dc2c\` (\`userId\`, \`couponId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`member_experiences\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(60) NOT NULL, \`desc\` varchar(200) NOT NULL DEFAULT '', \`memberPrice\` decimal(10,2) NOT NULL, \`normalPrice\` decimal(10,2) NOT NULL, \`quota\` int NOT NULL DEFAULT '1', \`sortOrder\` int NOT NULL DEFAULT '0', \`enabled\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`member_plans\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(40) NOT NULL, \`durationDays\` int NOT NULL, \`price\` decimal(10,2) NOT NULL, \`originalPrice\` decimal(10,2) NOT NULL, \`benefits\` json NOT NULL, \`badge\` varchar(20) NOT NULL DEFAULT '', \`recommended\` tinyint NOT NULL DEFAULT 0, \`enabled\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`memberships\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`memberNo\` varchar(24) NOT NULL, \`levelName\` varchar(30) NOT NULL DEFAULT '手作会员', \`expireAt\` datetime NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_187d573e43b2c2aa3960df20b7\` (\`userId\`), UNIQUE INDEX \`IDX_fb42fea5064ae734c1ed798c3a\` (\`memberNo\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`music\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(200) NOT NULL, \`artist\` varchar(100) NOT NULL DEFAULT '', \`cover\` varchar(500) NOT NULL DEFAULT '', \`musicUrl\` varchar(500) NOT NULL DEFAULT '', \`duration\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_284d89776f509cdeb44ecaefba\` (\`title\`, \`artist\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`notification_reads\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`notificationId\` int NOT NULL, \`readAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_368e4a570651c6ea1475099779\` (\`userId\`, \`notificationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`notification_templates\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NOT NULL, \`titleTemplate\` varchar(200) NOT NULL, \`contentTemplate\` text NOT NULL, \`category\` enum ('system', 'booking', 'community', 'activity') NOT NULL DEFAULT 'system', \`enabled\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`notifications\` (\`id\` int NOT NULL AUTO_INCREMENT, \`title\` varchar(200) NOT NULL, \`content\` text NOT NULL, \`targetType\` enum ('all', 'role', 'user') NOT NULL DEFAULT 'all', \`actionType\` varchar(16) NULL, \`actionId\` int NULL, \`targetRole\` enum ('user', 'admin') NULL, \`targetUserIds\` text NULL, \`channels\` varchar(255) NOT NULL DEFAULT 'push', \`sent\` tinyint NOT NULL DEFAULT 0, \`sentAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`store_tables\` (\`id\` int NOT NULL AUTO_INCREMENT, \`storeId\` int NOT NULL, \`name\` varchar(50) NOT NULL, \`capacity\` int NOT NULL, \`enabled\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`time_slots\` (\`id\` int NOT NULL AUTO_INCREMENT, \`storeId\` int NOT NULL, \`startTime\` varchar(5) NOT NULL, \`endTime\` varchar(5) NOT NULL, \`enabled\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`stores\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NOT NULL, \`address\` varchar(255) NOT NULL, \`lat\` decimal(10,7) NULL, \`lng\` decimal(10,7) NULL, \`rating\` decimal(2,1) NOT NULL DEFAULT '5.0', \`images\` json NULL, \`price\` decimal(10,2) NOT NULL DEFAULT '39.90', \`memberPrice\` decimal(10,2) NULL, \`allDayPrice\` decimal(10,2) NULL, \`businessHours\` varchar(50) NOT NULL DEFAULT '09:00-21:00', \`phone\` varchar(20) NOT NULL DEFAULT '', \`enabled\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`store_packages\` (\`id\` int NOT NULL AUTO_INCREMENT, \`storeId\` int NOT NULL, \`name\` varchar(50) NOT NULL, \`hours\` int NOT NULL, \`price\` decimal(10,2) NOT NULL DEFAULT '0.00', \`enabled\` tinyint NOT NULL DEFAULT 1, \`sortOrder\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`browsing_history\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`postId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`email\` varchar(255) NULL, \`username\` varchar(30) NULL, \`usernameUpdatedAt\` datetime NULL, \`nickname\` varchar(255) NOT NULL DEFAULT '', \`avatar\` varchar(255) NOT NULL DEFAULT '', \`bio\` varchar(200) NOT NULL DEFAULT '', \`gender\` enum ('male', 'female', 'secret') NOT NULL DEFAULT 'secret', \`birthday\` date NULL, \`location\` varchar(60) NOT NULL DEFAULT '', \`passwordHash\` varchar(255) NULL, \`isBanned\` tinyint NOT NULL DEFAULT 0, \`role\` enum ('user', 'admin') NOT NULL DEFAULT 'user', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), UNIQUE INDEX \`IDX_fe0bb3f6520ee0469504521e71\` (\`username\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`video_comment_likes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`commentId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_967398233a0662c5217b5a688e\` (\`userId\`, \`commentId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`video_comments\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`videoId\` int NOT NULL, \`parentId\` int NULL, \`replyToId\` int NULL, \`content\` text NOT NULL, \`likeCount\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_bfbb87c5ae1bd5a0554c35016c\` (\`parentId\`), INDEX \`IDX_2ba4e7417c624e7112b5fff002\` (\`videoId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`video_browsing_history\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`videoId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`video_likes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`videoId\` int NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_cb4a4539c335f750754150758b\` (\`userId\`, \`videoId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`videos\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`title\` varchar(200) NOT NULL DEFAULT '', \`content\` text NULL, \`cover\` varchar(500) NOT NULL DEFAULT '', \`videoUrl\` varchar(500) NOT NULL DEFAULT '', \`photos\` json NULL, \`filter\` varchar(50) NOT NULL DEFAULT '', \`trimStart\` float NOT NULL DEFAULT '0', \`trimEnd\` float NOT NULL DEFAULT '0', \`speed\` float NOT NULL DEFAULT '1', \`rotation\` int NOT NULL DEFAULT '0', \`duration\` int NOT NULL DEFAULT '0', \`aspectRatio\` float NOT NULL DEFAULT '0', \`music\` varchar(200) NOT NULL DEFAULT '', \`tags\` json NOT NULL, \`location\` varchar(200) NOT NULL DEFAULT '', \`status\` enum ('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved', \`rejectReason\` varchar(500) NOT NULL DEFAULT '', \`likeCount\` int NOT NULL DEFAULT '0', \`commentCount\` int NOT NULL DEFAULT '0', \`shareCount\` int NOT NULL DEFAULT '0', \`viewCount\` int NOT NULL DEFAULT '0', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_9003d36fcc646f797c42074d82\` (\`userId\`), INDEX \`IDX_ece1558efc6efd53eb530479db\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`activity_sessions\` ADD CONSTRAINT \`FK_05df5458aae5a9c0840a68601a5\` FOREIGN KEY (\`activityId\`) REFERENCES \`activities\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`store_tables\` ADD CONSTRAINT \`FK_24fccd271cfcbff8989f95b71e2\` FOREIGN KEY (\`storeId\`) REFERENCES \`stores\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`time_slots\` ADD CONSTRAINT \`FK_20322218c4a8b0cca5ead576ea8\` FOREIGN KEY (\`storeId\`) REFERENCES \`stores\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`store_packages\` ADD CONSTRAINT \`FK_3f3193bc2344f7257294283fbd1\` FOREIGN KEY (\`storeId\`) REFERENCES \`stores\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`store_packages\` DROP FOREIGN KEY \`FK_3f3193bc2344f7257294283fbd1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`time_slots\` DROP FOREIGN KEY \`FK_20322218c4a8b0cca5ead576ea8\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`store_tables\` DROP FOREIGN KEY \`FK_24fccd271cfcbff8989f95b71e2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`activity_sessions\` DROP FOREIGN KEY \`FK_05df5458aae5a9c0840a68601a5\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_ece1558efc6efd53eb530479db\` ON \`videos\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_9003d36fcc646f797c42074d82\` ON \`videos\``,
    );
    await queryRunner.query(`DROP TABLE \`videos\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_cb4a4539c335f750754150758b\` ON \`video_likes\``,
    );
    await queryRunner.query(`DROP TABLE \`video_likes\``);
    await queryRunner.query(`DROP TABLE \`video_browsing_history\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_2ba4e7417c624e7112b5fff002\` ON \`video_comments\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_bfbb87c5ae1bd5a0554c35016c\` ON \`video_comments\``,
    );
    await queryRunner.query(`DROP TABLE \`video_comments\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_967398233a0662c5217b5a688e\` ON \`video_comment_likes\``,
    );
    await queryRunner.query(`DROP TABLE \`video_comment_likes\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_fe0bb3f6520ee0469504521e71\` ON \`users\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``,
    );
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(`DROP TABLE \`browsing_history\``);
    await queryRunner.query(`DROP TABLE \`store_packages\``);
    await queryRunner.query(`DROP TABLE \`stores\``);
    await queryRunner.query(`DROP TABLE \`time_slots\``);
    await queryRunner.query(`DROP TABLE \`store_tables\``);
    await queryRunner.query(`DROP TABLE \`notifications\``);
    await queryRunner.query(`DROP TABLE \`notification_templates\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_368e4a570651c6ea1475099779\` ON \`notification_reads\``,
    );
    await queryRunner.query(`DROP TABLE \`notification_reads\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_284d89776f509cdeb44ecaefba\` ON \`music\``,
    );
    await queryRunner.query(`DROP TABLE \`music\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_fb42fea5064ae734c1ed798c3a\` ON \`memberships\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_187d573e43b2c2aa3960df20b7\` ON \`memberships\``,
    );
    await queryRunner.query(`DROP TABLE \`memberships\``);
    await queryRunner.query(`DROP TABLE \`member_plans\``);
    await queryRunner.query(`DROP TABLE \`member_experiences\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_e757a8da7b49836d30a152dc2c\` ON \`user_coupons\``,
    );
    await queryRunner.query(`DROP TABLE \`user_coupons\``);
    await queryRunner.query(`DROP TABLE \`coupons\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_63cae1eb7767feee4555f00c5f\` ON \`follows\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_666a44940ce8279976767c6b5e\` ON \`follows\``,
    );
    await queryRunner.query(`DROP TABLE \`follows\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_a69d9e2ae78ef7d100f8317ae0\` ON \`posts\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_ae05faaa55c866130abef6e1fe\` ON \`posts\``,
    );
    await queryRunner.query(`DROP TABLE \`posts\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_30ee85070afe5b92b5920957b1\` ON \`post_likes\``,
    );
    await queryRunner.query(`DROP TABLE \`post_likes\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_ac65d744abc05279aee0b29085\` ON \`post_comments\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_57c326e236267a8dc7c990955d\` ON \`post_comments\``,
    );
    await queryRunner.query(`DROP TABLE \`post_comments\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_2a4ca6d34d5241239862bdbeae\` ON \`post_comment_likes\``,
    );
    await queryRunner.query(`DROP TABLE \`post_comment_likes\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_8d9fd5808d6d291748185df233\` ON \`post_collections\``,
    );
    await queryRunner.query(`DROP TABLE \`post_collections\``);
    await queryRunner.query(
      `DROP INDEX \`uk_message_status_msg_user\` ON \`message_status\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_message_status_user\` ON \`message_status\``,
    );
    await queryRunner.query(`DROP TABLE \`message_status\``);
    await queryRunner.query(
      `DROP INDEX \`idx_message_conversation\` ON \`messages\``,
    );
    await queryRunner.query(`DROP TABLE \`messages\``);
    await queryRunner.query(`DROP INDEX \`idx_group_last_at\` ON \`groups\``);
    await queryRunner.query(`DROP TABLE \`groups\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_2f084f7f2a80d0b621fb1e37ae\` ON \`group_reads\``,
    );
    await queryRunner.query(`DROP TABLE \`group_reads\``);
    await queryRunner.query(
      `DROP INDEX \`idx_group_message\` ON \`group_messages\``,
    );
    await queryRunner.query(`DROP TABLE \`group_messages\``);
    await queryRunner.query(
      `DROP INDEX \`uk_group_msg_deletion\` ON \`group_message_deletions\``,
    );
    await queryRunner.query(`DROP TABLE \`group_message_deletions\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_53f644f66a416c1542b743c029\` ON \`group_members\``,
    );
    await queryRunner.query(`DROP TABLE \`group_members\``);
    await queryRunner.query(
      `DROP INDEX \`uk_conversation_users\` ON \`conversations\``,
    );
    await queryRunner.query(
      `DROP INDEX \`idx_conversation_last_at\` ON \`conversations\``,
    );
    await queryRunner.query(`DROP TABLE \`conversations\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_0211f39220b655af6270477d14\` ON \`chat_blocks\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_9d7f087b18b2afe5f5820c2f67\` ON \`chat_blocks\``,
    );
    await queryRunner.query(`DROP TABLE \`chat_blocks\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_d838dde2371446d33c990332cb\` ON \`appointments\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_db09b0f96fb6e127adde11518e\` ON \`appointments\``,
    );
    await queryRunner.query(`DROP TABLE \`appointments\``);
    await queryRunner.query(`DROP TABLE \`activity_sessions\``);
    await queryRunner.query(`DROP TABLE \`activities\``);
  }
}
