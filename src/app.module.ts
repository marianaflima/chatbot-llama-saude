import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
// import { ChatbotService } from './chatbot/chatbot.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ChatModule],
  // providers: [ChatbotService],
})
export class AppModule {}
