import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { UserId } from '../common/decorators/user-id.decorator';

@Controller('groups')
@UseGuards(FirebaseAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@UserId() userId: string, @Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.create(userId, createGroupDto);
  }

  @Get()
  findAll(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.groupsService.findAll(
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get('my-groups')
  getUserGroups(@UserId() userId: string) {
    return this.groupsService.getUserGroups(userId);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string) {
    return this.groupsService.getMembers(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(+id);
  }

  @Post(':id/join')
  join(@Param('id') id: string, @UserId() userId: string) {
    return this.groupsService.join(+id, userId);
  }

  @Delete(':id/leave')
  leave(@Param('id') id: string, @UserId() userId: string) {
    return this.groupsService.leave(+id, userId);
  }
}
