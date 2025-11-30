import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PhotosService } from './photos.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePhotoDto } from './dto';

@Controller('photos')
export class PhotosController {
  constructor(private photosService: PhotosService) {}

  @Post()
  @UseGuards(FirebaseAuthGuard)
  async createPhoto(
    @CurrentUser() user: any,
    @Body() dto: CreatePhotoDto,
  ) {
    return this.photosService.createPhoto(user.uid, dto);
  }

  @Get()
  @UseGuards(FirebaseAuthGuard)
  async getUserPhotos(@CurrentUser() user: any) {
    return this.photosService.getUserPhotos(user.uid);
  }

  @Get(':id')
  @UseGuards(FirebaseAuthGuard)
  async getPhotoById(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.photosService.getPhotoById(user.uid, id);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  async deletePhoto(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.photosService.deletePhoto(user.uid, id);
  }
}