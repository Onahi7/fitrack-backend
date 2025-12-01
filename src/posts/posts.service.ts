import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { posts, postLikes, postComments, users } from '../database/schema';
import { CreatePostDto } from './dto/create-post.dto';
import { eq, desc, and, sql } from 'drizzle-orm';

@Injectable()
export class PostsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(userId: string, createPostDto: CreatePostDto) {
    const [post] = await this.drizzle.db
      .insert(posts)
      .values({
        userId,
        content: createPostDto.content,
        imageUrl: createPostDto.imageUrl,
      })
      .returning();

    return this.getPostWithDetails(post.id);
  }

  async findAll(limit = 50, offset = 0) {
    const allPosts = await this.drizzle.db
      .select({
        id: posts.id,
        userId: posts.userId,
        content: posts.content,
        imageUrl: posts.imageUrl,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        createdAt: posts.createdAt,
        user: {
          displayName: users.displayName,
          photoURL: users.photoURL,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    return allPosts;
  }

  async findOne(id: number) {
    return this.getPostWithDetails(id);
  }

  async findByUser(userId: string, limit = 50, offset = 0) {
    return this.drizzle.db
      .select({
        id: posts.id,
        userId: posts.userId,
        content: posts.content,
        imageUrl: posts.imageUrl,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        createdAt: posts.createdAt,
        user: {
          displayName: users.displayName,
          photoURL: users.photoURL,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async like(postId: number, userId: string) {
    // Check if already liked
    const existingLike = await this.drizzle.db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);

    if (existingLike.length > 0) {
      // Unlike
      await this.drizzle.db
        .delete(postLikes)
        .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));

      await this.drizzle.db
        .update(posts)
        .set({ likesCount: sql`${posts.likesCount} - 1` })
        .where(eq(posts.id, postId));

      return { liked: false };
    } else {
      // Like
      await this.drizzle.db.insert(postLikes).values({ postId, userId });

      await this.drizzle.db
        .update(posts)
        .set({ likesCount: sql`${posts.likesCount} + 1` })
        .where(eq(posts.id, postId));

      return { liked: true };
    }
  }

  async addComment(postId: number, userId: string, content: string) {
    await this.drizzle.db.insert(postComments).values({
      postId,
      userId,
      content,
    });

    await this.drizzle.db
      .update(posts)
      .set({ commentsCount: sql`${posts.commentsCount} + 1` })
      .where(eq(posts.id, postId));

    return this.getPostWithDetails(postId);
  }

  async getComments(postId: number) {
    return this.drizzle.db
      .select()
      .from(postComments)
      .where(eq(postComments.postId, postId))
      .orderBy(desc(postComments.createdAt));
  }

  async delete(id: number, userId: string) {
    const post = await this.drizzle.db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    if (post.length === 0) {
      throw new NotFoundException('Post not found');
    }

    if (post[0].userId !== userId) {
      throw new NotFoundException('Unauthorized');
    }

    // Delete associated likes and comments first
    await this.drizzle.db.delete(postLikes).where(eq(postLikes.postId, id));
    await this.drizzle.db.delete(postComments).where(eq(postComments.postId, id));

    await this.drizzle.db.delete(posts).where(eq(posts.id, id));

    return { success: true };
  }

  private async getPostWithDetails(id: number) {
    const [post] = await this.drizzle.db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }
}
