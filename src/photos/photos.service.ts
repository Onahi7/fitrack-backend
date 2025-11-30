import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { progressPhotos } from '../database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { CreatePhotoDto } from './dto';

@Injectable()
export class PhotosService {
  constructor(private drizzle: DrizzleService) {}

  async createPhoto(userId: string, dto: CreatePhotoDto) {
    const [photo] = await this.drizzle.db
      .insert(progressPhotos)
      .values({
        userId,
        url: dto.url,
        cloudinaryPublicId: dto.cloudinaryPublicId,
        date: new Date(dto.date),
        visibility: dto.visibility || 'private',
        notes: dto.notes,
        weight: dto.weight ? String(dto.weight) : null,
        bodyFat: dto.bodyFat ? String(dto.bodyFat) : null,
      })
      .returning();

    return photo;
  }

  async getUserPhotos(userId: string) {
    const photos = await this.drizzle.db
      .select()
      .from(progressPhotos)
      .where(eq(progressPhotos.userId, userId))
      .orderBy(desc(progressPhotos.date));

    return photos.map(photo => ({
      ...photo,
      weight: photo.weight ? Number(photo.weight) : null,
      bodyFat: photo.bodyFat ? Number(photo.bodyFat) : null,
    }));
  }

  async getPhotoById(userId: string, photoId: number) {
    const [photo] = await this.drizzle.db
      .select()
      .from(progressPhotos)
      .where(and(
        eq(progressPhotos.id, photoId),
        eq(progressPhotos.userId, userId)
      ))
      .limit(1);

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    return {
      ...photo,
      weight: photo.weight ? Number(photo.weight) : null,
      bodyFat: photo.bodyFat ? Number(photo.bodyFat) : null,
    };
  }

  async deletePhoto(userId: string, photoId: number) {
    // First check if photo exists and belongs to user
    const [photo] = await this.drizzle.db
      .select()
      .from(progressPhotos)
      .where(and(
        eq(progressPhotos.id, photoId),
        eq(progressPhotos.userId, userId)
      ))
      .limit(1);

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    // Delete the photo
    await this.drizzle.db
      .delete(progressPhotos)
      .where(eq(progressPhotos.id, photoId));

    return { success: true, message: 'Photo deleted successfully' };
  }
}