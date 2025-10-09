import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ChatModule],
})
export class AppModule {}
