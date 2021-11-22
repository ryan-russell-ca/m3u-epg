import { nanoid } from 'nanoid';
import { TokenModel } from "@/api-lib/db/userSchema";

export function findTokenByIdAndType(id, type) {
  return TokenModel.findOne({
    _id: id,
    type,
  });
}

export function findAndDeleteTokenByIdAndType(id, type) {
  return TokenModel.findOneAndDelete({ _id: id, type })
    .then(({ value }) => value);
}

export async function createToken({ creatorId, type, expireAt }) {
  const securedTokenId = nanoid(32);
  const token = {
    _id: securedTokenId,
    creatorId,
    type,
    expireAt,
  };
  await TokenModel.insert(token);
  return token;
}
