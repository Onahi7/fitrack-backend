import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { UserId } from '../common/decorators/user-id.decorator';

@Controller('posts')
@UseGuards(FirebaseAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  create(@UserId() userId: string, @Body() createPostDto: CreatePostDto) {
    return this.postsService.create(userId, createPostDto);
  }

  @Get()
  findAll(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.postsService.findAll(
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get('user/:userId')
  findByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.postsService.findByUser(
      userId,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(+id);
  }

  @Post(':id/like')
  like(@Param('id') id: string, @UserId() userId: string) {
    return this.postsService.like(+id, userId);
  }

  @Post(':id/comment')
  addComment(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body('content') content: string,
  ) {
    return this.postsService.addComment(+id, userId, content);
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.postsService.getComments(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @UserId() userId: string) {
    return this.postsService.delete(+id, userId);
  }
}
