import bcrypt from 'bcryptjs';
import normalizeEmail from 'validator/lib/normalizeEmail';
import { UserModel } from '@/api-lib/db/userSchema';
import { UserModel as UserModelType } from '@/types/user';

export const findUserWithEmailAndPassword = async (email: string, password: string) => {
  email = normalizeEmail(email);
  const user = await UserModel.findOne({ email });
  if (user && (await bcrypt.compare(password, user.password))) {
    return { ...user, password: undefined }; // filtered out password
  }
  return null;
};

export const findUserForAuth = async (id: string) => {
  return UserModel.findOne({ id }, { projection: { password: 0 } }).then(
    (user) => user || null
  );
};

export const findUserByUsername = async (username: string) => {
  return UserModel.findOne(
    { username },
    { projection: dbProjectionUsers() }
  ).then((user) => user || null);
};

export const updateUserById = async (id: string, data: Partial<UserModelType>) => {
  const updatedUser = await UserModel.findOneAndUpdate(
    { id },
    { $set: data },
    { returnDocument: 'after', projection: { password: 0 } }
  );
  
  return updatedUser;
};

export function dbProjectionUsers(prefix = '') {
  return {
    [`${prefix}password`]: 0,
    [`${prefix}email`]: 0,
    [`${prefix}emailVerified`]: 0,
  };
}
