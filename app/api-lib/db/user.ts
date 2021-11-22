import bcrypt from 'bcryptjs';
import normalizeEmail from 'validator/lib/normalizeEmail';
import { UserModel } from '@/api-lib/db/userSchema';

export const findUserWithEmailAndPassword = async (email, password) => {
  email = normalizeEmail(email);
  const user = await UserModel.findOne({ email });
  if (user && (await bcrypt.compare(password, user.password))) {
    return { ...user, password: undefined }; // filtered out password
  }
  return null;
};

export const findUserForAuth = async (id) => {
  return UserModel.findOne({ id }, { projection: { password: 0 } }).then(
    (user) => user || null
  );
};

export const findUserById = async (id) => {
  return UserModel.findOne({ id }, { projection: dbProjectionUsers() }).then(
    (user) => user || null
  );
};

export const findUserByUsername = async (username) => {
  return UserModel.findOne(
    { username },
    { projection: dbProjectionUsers() }
  ).then((user) => user || null);
};

export const findUserByEmail = async (email) => {
  email = normalizeEmail(email);
  return UserModel.findOne({ email }, { projection: dbProjectionUsers() }).then(
    (user) => user || null
  );
};

export const updateUserById = async (id, data) => {
  return UserModel.findOneAndUpdate(
    { id },
    { $set: data },
    { returnDocument: 'after', projection: { password: 0 } }
  ).then(({ value }) => value);
};

export const insertUser = async ({
  email,
  originalPassword,
  name,
  profilePicture,
}) => {
  const user = {
    emailVerified: false,
    profilePicture,
    email,
    name,
  };
  const password = await bcrypt.hash(originalPassword, 10);
  const inserted = await UserModel.insertMany({ ...user, password });

  if (inserted) {
    user.id = inserted.id;
  }
  return user;
};

export const updateUserPasswordByOldPassword = async (
  id,
  oldPassword,
  newPassword
) => {
  const user = await UserModel.findOne({ id });
  if (!user) return false;
  const matched = await bcrypt.compare(oldPassword, user.password);
  if (!matched) return false;
  const password = await bcrypt.hash(newPassword, 10);
  await UserModel.updateOne({ id }, { $set: { password } });
  return true;
};

export const UNSAFE_updateUserPassword = async (id, newPassword) => {
  const password = await bcrypt.hash(newPassword, 10);
  await UserModel.updateOne({ id }, { $set: { password } });
};

export function dbProjectionUsers(prefix = '') {
  return {
    [`${prefix}password`]: 0,
    [`${prefix}email`]: 0,
    [`${prefix}emailVerified`]: 0,
  };
}
