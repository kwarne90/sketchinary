import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { GameManager } from "./game.ts";
import type { Stroke } from "../../shared/types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT || (isProd ? 3000 : 3001));

const app = express();
app.use(cors({ origin: isProd ? false : true }));
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

if (isProd) {
  const dist = path.join(__dirname, "../../client/.output/public");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/socket.io")) return next();
      const spa = ["200.html", "index.html"]
        .map((file) => path.join(dist, file))
        .find((file) => fs.existsSync(file));
      if (spa) res.sendFile(spa);
      else next();
    });
  }
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: isProd
    ? undefined
    : { origin: true, methods: ["GET", "POST"] },
});

const games = new GameManager();

function emitState(code: string) {
  const room = games.getRoom(code);
  if (!room) return;
  for (const [socketId, seat] of games.socketToSeat) {
    if (seat.code !== code) continue;
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) continue;
    socket.emit("state", games.snapshotFor(room, seat.playerId));
  }
}

games.onBroadcast = (code) => emitState(code);
games.onGuess = (code, guess) => {
  io.to(code).emit("guess", guess);
  emitState(code);
};
games.onEmote = (code, emote) => {
  io.to(code).emit("emote", emote);
};

io.on("connection", (socket) => {
  socket.on(
    "create",
    (
      payload: { playerId?: string; name?: string; avatar?: number },
      ack?: (result: { code?: string; error?: string }) => void,
    ) => {
      const playerId = String(payload?.playerId || "");
      const name = String(payload?.name || "").trim();
      if (!playerId || !name) {
        ack?.({ error: "Pick a name" });
        return;
      }
      const room = games.createRoom(playerId, name, payload.avatar);
      games.attachSocket(socket.id, room.code, playerId);
      socket.join(room.code);
      ack?.({ code: room.code });
      socket.emit("state", games.snapshotFor(room, playerId));
    },
  );

  socket.on(
    "join",
    (
      payload: { code?: string; playerId?: string; name?: string; avatar?: number },
      ack?: (result: { error?: string }) => void,
    ) => {
      const code = String(payload?.code || "").toUpperCase();
      const playerId = String(payload?.playerId || "");
      const name = String(payload?.name || "").trim();
      if (!playerId || !name) {
        ack?.({ error: "Pick a name" });
        return;
      }
      const { room, error } = games.joinRoom(code, playerId, name, payload.avatar);
      if (error || !room) {
        ack?.({ error: error || "Game not found" });
        return;
      }
      games.attachSocket(socket.id, room.code, playerId);
      socket.join(room.code);
      ack?.({});
      games.broadcast(room);
    },
  );

  socket.on("updateSettings", (payload: { roundSeconds?: number; totalRounds?: number }) => {
    const seat = games.socketToSeat.get(socket.id);
    if (!seat) return;
    const room = games.getRoom(seat.code);
    if (!room) return;
    const error = games.updateSettings(room, seat.playerId, payload || {});
    if (error) socket.emit("errorMessage", error);
  });

  socket.on("setAvatar", (payload: { avatar?: number }) => {
    const seat = games.socketToSeat.get(socket.id);
    if (!seat || !Number.isFinite(payload?.avatar)) return;
    const room = games.getRoom(seat.code);
    if (!room) return;
    games.setAvatar(room, seat.playerId, Number(payload.avatar));
  });

  socket.on(
    "setName",
    (
      payload: { name?: string },
      ack?: (result: { error?: string }) => void,
    ) => {
      const seat = games.socketToSeat.get(socket.id);
      if (!seat) {
        ack?.({ error: "Not in a game" });
        return;
      }
      const room = games.getRoom(seat.code);
      if (!room) {
        ack?.({ error: "Game not found" });
        return;
      }
      const error = games.setName(room, seat.playerId, String(payload?.name || ""));
      if (error) {
        ack?.({ error });
        return;
      }
      ack?.({});
    },
  );

  socket.on("poke", (payload: { toId?: string }) => {
    const seat = games.socketToSeat.get(socket.id);
    if (!seat) return;
    const room = games.getRoom(seat.code);
    if (!room) return;
    games.poke(room, seat.playerId, String(payload?.toId || ""));
  });

  socket.on("start", () => {
    const seat = games.socketToSeat.get(socket.id);
    if (!seat) return;
    const room = games.getRoom(seat.code);
    if (!room) return;
    const error = games.start(room);
    if (error) socket.emit("errorMessage", error);
  });

  socket.on("playAgain", () => {
    const seat = games.socketToSeat.get(socket.id);
    if (!seat) return;
    const room = games.getRoom(seat.code);
    if (!room) return;
    games.playAgain(room);
  });

  socket.on("strokeStart", (payload: Stroke) => {
    const seat = games.socketToSeat.get(socket.id);
    if (!seat || !payload) return;
    const room = games.getRoom(seat.code);
    if (!room) return;
    const stroke = games.startStroke(room, seat.playerId, payload);
    if (stroke && typeof stroke !== "string") {
      socket.to(room.code).emit("stroke", { type: "start", stroke });
    }
  });

  socket.on(
    "strokeAdd",
    (payload: { id?: string; points?: Stroke["points"] }) => {
      const seat = games.socketToSeat.get(socket.id);
      if (!seat || !payload?.id || !payload.points) return;
      const room = games.getRoom(seat.code);
      if (!room) return;
      const points = games.addStrokePoints(
        room,
        seat.playerId,
        payload.id,
        payload.points,
      );
      if (points && typeof points !== "string") {
        socket.to(room.code).emit("stroke", {
          type: "add",
          id: payload.id,
          points,
        });
      }
    },
  );

  socket.on("undo", () => {
    const seat = games.socketToSeat.get(socket.id);
    if (!seat) return;
    const room = games.getRoom(seat.code);
    if (!room) return;
    games.undo(room, seat.playerId);
  });

  socket.on("clear", () => {
    const seat = games.socketToSeat.get(socket.id);
    if (!seat) return;
    const room = games.getRoom(seat.code);
    if (!room) return;
    games.clearCanvas(room, seat.playerId);
  });

  socket.on("guess", (payload: { text?: string }) => {
    const seat = games.socketToSeat.get(socket.id);
    if (!seat) return;
    const room = games.getRoom(seat.code);
    if (!room) return;
    const error = games.guess(room, seat.playerId, String(payload?.text || ""));
    if (error) socket.emit("errorMessage", error);
  });

  socket.on("disconnect", () => {
    const seat = games.socketToSeat.get(socket.id);
    games.disconnect(socket.id);
    if (seat) emitState(seat.code);
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Sketchinary server on :${PORT}`);
});
