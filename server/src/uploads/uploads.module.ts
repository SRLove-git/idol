import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCdnRefresher, CDN_REFRESHER } from './cdn-refresh';
import { MediaCleanupService } from './media-cleanup.service';
import { UploadsController } from './uploads.controller';
import { createUploadProvider, UPLOAD_PROVIDER } from './uploads.provider';

@Module({
  controllers: [UploadsController],
  providers: [
    {
      provide: UPLOAD_PROVIDER,
      inject: [ConfigService],
      useFactory: createUploadProvider,
    },
    {
      provide: CDN_REFRESHER,
      inject: [ConfigService],
      useFactory: createCdnRefresher,
    },
    MediaCleanupService,
  ],
  exports: [UPLOAD_PROVIDER, CDN_REFRESHER, MediaCleanupService],
})
export class UploadsModule {}
