// server/socket.js
import { Server as IOServer } from "socket.io";

let io = null;

/**
 * Initialize socket.io with an http server.
 * Call this from server.js after creating http server: initSocket(server, { corsOrigin })
 */
export function initSocket(server, { corsOrigin = "*" } = {}) {
  if (io) return io;

  io = new IOServer(server, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"],
    },
    path: "/socket.io/",
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    // expect client to send auth info in handshake auth or query
    const userId =
      socket.handshake?.auth?.userId || socket.handshake?.query?.userId;
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`📡 Socket ${socket.id} joined room user:${userId}`);
    }

    socket.on("join_account", ({ accountId }) => {
      if (accountId) {
        socket.join(`account:${accountId}`);
        console.log(`📡 Socket ${socket.id} joined room account:${accountId}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", socket.id, reason);
    });
  });

  return io;
}

export function getIO() {
  if (!io)
    throw new Error(
      "Socket.io not initialized. Call initSocket(server) first."
    );
  return io;
}

// default export for compatibility with existing imports
export default { initSocket, getIO };

// // src/socket.js
// import { Server } from "socket.io";

// let io;

// export function initSocket(httpServer, clientOrigin) {
//   io = new Server(httpServer, {
//     cors: { origin: clientOrigin, credentials: true }
//   });

//   io.on("connection", (socket) => {
//     // Expect client to join a user room after auth
//     const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
//     if (userId) socket.join(`user:${userId}`);

//     socket.on("disconnect", () => {});
//   });

//   return io;
// }

// export { io };
