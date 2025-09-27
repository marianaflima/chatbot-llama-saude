import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { GroqService } from 'src/groq/groq.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, GroqService],
})
export class ChatModule {}
