import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateUserDto, UpdateProfileDto } from './dto';
import { CreateAdminDto } from './dto/create-admin.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  async createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  async getCurrentUser(@CurrentUser() user: any) {
    return this.usersService.findById(user.uid);
  }

  @Get('me/profile')
  @UseGuards(FirebaseAuthGuard)
  async getMyProfile(@CurrentUser() user: any) {
    return this.usersService.getUserProfile(user.uid);
  }

  @Get('me/export')
  @UseGuards(FirebaseAuthGuard)
  async exportMyData(@CurrentUser() user: any) {
    return this.usersService.exportUserData(user.uid);
  }

  @Put('me/profile')
  @UseGuards(FirebaseAuthGuard)
  async updateMyProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.uid, dto);
  }

  @Delete('me')
  @UseGuards(FirebaseAuthGuard)
  async deleteMyAccount(@CurrentUser() user: any) {
    return this.usersService.deleteUser(user.uid);
  }

  @Post('seed/admin')
  @HttpCode(HttpStatus.CREATED)
  async seedAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.usersService.createAdmin(
      createAdminDto.email,
      createAdminDto.password,
    );
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body('idToken') idToken: string) {
    return this.usersService.adminLogin(idToken);
  }
}
