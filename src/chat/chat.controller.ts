import { Controller, Post, Body, Get } from '@nestjs/common';
import { SendMessageDTO } from './dto/send-message.dto';
import { ChatService } from './chat.service';
import { ChatMessage } from './chat.types';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  getChat(): string {
    return 'Tudo ok!';
  }

  @Post()
  async sendMessage(
    @Body() dto: SendMessageDTO,
  ): Promise<{ reply: string; history: ChatMessage[] }> {
    return await this.chatService.handleMessage(dto);
  }
}
