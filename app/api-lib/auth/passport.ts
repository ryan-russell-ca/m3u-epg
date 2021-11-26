import { findUserForAuth, findUserWithEmailAndPassword } from '@/api-lib/db';
import { IncomingMessage } from 'http';
import { Request } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

passport.serializeUser<Express.User>((user, done) => done(null, user));

passport.deserializeUser<Express.User, IncomingMessage>((_req, user, done) => {
  findUserForAuth(user as string).then(
    (user) => done(null, user),
    (err) => done(err)
  );
});

passport.use(
  new LocalStrategy(
    { usernameField: 'email', passReqToCallback: true },
    async (_req: Request, email: string, password, done) => {
      const user = await findUserWithEmailAndPassword(email, password);

      if (user) {
        done(null, user);
      } else {
        done(null, false, { message: 'Email or password is incorrect' });
      }
    }
  )
);

export default passport;
