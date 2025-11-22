import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { GroqService } from 'src/groq/groq.service';
import { MachineService } from 'src/machine/machine.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, GroqService, MachineService],
})
export class ChatModule {}
