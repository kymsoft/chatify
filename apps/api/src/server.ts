import "~/config/dotenv";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import http from "http";
import { connectToDb } from "~/utils/connectToDb";
import { Server } from "socket.io";
import routes from "~/routes";
import { configurePassport } from "~/config/passport";
import passport from "passport";
import { socketWrapper } from "./utils/socketWrapper";
import { handleSocketEvents } from "./socket";
import {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
  SocketServer,
} from "interfaces";

const app = express();
const port = process.env.PORT || 3001;
const server = http.createServer(app);

configurePassport(app);

const allowedOrigins = [
  'https://chatify-orpin-theta.vercel.app',
  'https://b0e7-105-113-34-35.ngrok-free.app'
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true // If using cookies/auth tokens
}));
app.options("*", cors());
app.use(bodyParser.json());
app.use(cookieParser());

// Routes
app.use("/api/v1", routes); //Call api in e.g. http://localhost:3001/api/example
//use passport middleware for authentication in socket.io

//Here we connect to our mongo database
connectToDb().then(() => {
  console.log("Database connected");

  //Start the server
  server.listen(port, () => {
    console.log(`[server]: Server is running at https://localhost:${port}`);
  });
});

/**
 * Socket.io server setup
 */

const io = new Server<
  SocketData,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents
>(server, {
  cookie: true,
  cors: {
    origin: ["https://chatify-orpin-theta.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"],
});

io.use(socketWrapper(passport.initialize()));

//Where here we protect our socket.io routes, we add a JWT middleware
//Actually, we could use our own socketAuthMiddleware, it is the same
io.use(socketWrapper(passport.authenticate("jwt", { session: false })));

// //Where here we protect our socket.io routes
// io.use(socketAuthMiddleware);

io.on("connection", (socket) => handleSocketEvents(socket, io));

export default server;
