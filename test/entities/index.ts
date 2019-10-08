import { User } from 'test/entities/user'
import { Post } from 'test/entities/post'
import { UserLikesPost } from 'test/entities/user-likes-post'
import { Email } from 'test/entities/email'
import { UserProfile } from 'test/entities/user-profile'
import { UserFollows } from 'test/entities/user-follows'

export const entities = [User, UserProfile, Post, UserLikesPost, Email, UserFollows]
