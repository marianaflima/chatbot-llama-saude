import { Controller, Post, Body } from '@nestjs/common';
import { SendMessageDTO } from './dto/send-message.dto';
import { ChatService } from './chat.service';
import { ChatMessage } from './chat.types';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  sendMessage(
    @Body() dto: SendMessageDTO,
  ): Promise<{ reply: string; history: ChatMessage[] }> {
    return this.chatService.handleMessage(dto);
  }
}
