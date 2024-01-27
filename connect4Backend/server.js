const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Adjust this based on your frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.use(
  cors({
    origin: "http://localhost:3000", // Adjust this based on your frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  })
);
const rooms = {};
io.on("connection", (socket) => {
  console.log("user connected on socket ID:  ", socket.id);
  socket.on("createRoom", ({ roomName, password }) => {
    console.log("hello from create room");
    if (rooms[roomName]) {
      socket.emit("invalidRoom", { message: "Room already exists" });
    } else {
      rooms[roomName] = { password, players: [] };
      socket.join(roomName);
      socket.emit("roomJoined", { rooms, roomName, playerColor: "red" });
    }
  });
  socket.on("joinRoom", ({ roomName, password }) => {
    const room = rooms[roomName];
    console.log("hello from join room", room);
    if (room && room.password === password && room.players.length < 2) {
      room.players.push({
        id: socket.id,
        color: room.players.length === 0 ? "red" : "blue",
      });
      socket.join(roomName);
      io.to(roomName).emit("playerJoined", {
        playerCount: room.players.length,
        // playerColor: room.players.find((player) => player.id === socket.id)
        //   .color,
        playerColor: 'blue',
      });
      socket.emit("roomJoined", {
        rooms, roomName,
        // playerColor: room.players.find((player) => player.id === socket.id)
        // .color,
        playerColor: 'blue',
      });
      if (room.players.length === 2) {
        io.to(roomName).emit("startGame");
      }
    } else {
      socket.emit("invalidRoom");
    }
  });
  socket.on("disconnect", () => {
    for (const roomName in rooms) {
      console.log(roomName);
      const index = rooms[roomName].players.findIndex(
        (player) => player.id === socket.id
      );
      if (index !== -1) {
        rooms[roomName].players.splice(index, 1);
        io.to(roomName).emit("playerLeft", {
          playerCount: rooms[roomName].players.length,
        });
        break;
      }
    }
  });
  socket.on("updateGame", ({ roomName, newGrid, currentTurn }) => {
    console.log("hello from updateGame", roomName, currentTurn, newGrid);
    const newTurn = currentTurn === "red" ? "blue" : "red";
    io.to(roomName).emit("gameState", {
      newGrid,
      newTurn,
      newWinner: checkWinner(newGrid),
    });
  });
  io.engine.on("connection_error", (err) => {
    console.log(err.req); // the request object
    console.log(err.code); // the error code, for example 1
    console.log(err.message); // the error message, for example "Session ID unknown"
    console.log(err.context); // some additional error context
  });
});
function checkWinner(grid) {
  // Implement your checkWinner logic here
  // Return 'red' or 'blue' if a player wins, otherwise return null
}
app.get("./", (req, res) => {
  res.send("hello everyone");
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
