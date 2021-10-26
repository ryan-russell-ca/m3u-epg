import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import helmet from 'helmet';
import nocache from "nocache";

import express, { NextFunction, Request, Response } from 'express';
import StatusCodes from 'http-status-codes';
import 'express-async-errors';

import BaseRouter from './routes';
import logger from '@shared/Logger';

const app = express();
const { BAD_REQUEST } = StatusCodes;

app.set("etag", false);

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(nocache());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
}

app.use('/', BaseRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.err(err, true);
    return res.status(BAD_REQUEST).json({
        error: err.message,
    });
});

const staticDir = path.join(__dirname, 'public');
app.use(express.static(staticDir));

export default app;
