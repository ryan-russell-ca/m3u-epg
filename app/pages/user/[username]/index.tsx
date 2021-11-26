import { findUserByUsername } from '@/api-lib/db';
import { User } from '@/page-components/User';
import { UserModel } from '@/types/user';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

const UserPage = ({ user }: { user: UserModel }) => {
  return (
    <>
      <Head>
        <title>
          {user.name}
        </title>
      </Head>
      <User user={user} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = await findUserByUsername(
    context.params?.username as string
  );

  if (!user) {
    return {
      notFound: true,
    };
  }

  user._id = String(user._id);
  return { props: { user } };
}

export default UserPage;
