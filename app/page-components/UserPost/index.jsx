import { Spacer } from '@/components/Layout';
import { Post as PostItem } from '@/components/Post';
import Commenter from './Commenter';
import CommentList from './CommentList';
import styles from './UserPost.module.css';

export const UserPost = ({ post }) => {
  return (
    <>
      <Spacer size={2} axis="vertical" />
      <PostItem post={post} />
      <h3 className={styles.subtitle}>Comments</h3>
      <Commenter post={post} />
      <CommentList post={post} />
    </>
  );
};
