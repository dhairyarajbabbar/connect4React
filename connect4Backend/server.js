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
  socket.on("updateGame", ({ roomName, newGrid, currentTurn, col }) => {
    console.log("hello from updateGame", roomName, currentTurn, newGrid);
    const newTurn = currentTurn === "red" ? "blue" : "red";
    console.log(checkWinner(newGrid, col));
    io.to(roomName).emit("gameState", {
      newGrid,
      newTurn,
      newWinner: checkWinner(newGrid, col),
    });
  });
  io.engine.on("connection_error", (err) => {
    console.log(err.req); // the request object
    console.log(err.code); // the error code, for example 1
    console.log(err.message); // the error message, for example "Session ID unknown"
    console.log(err.context); // some additional error context
  });
});
function checkWinner(grid, lastMoveCol) {
  // Find the uppermost filled row in the specified column
  let lastMoveRow;
  for (let row = 0; row < 6; row++) {
    if (grid[row][lastMoveCol]) {
      lastMoveRow = row;
      break;
    }
  }

  // Check for a winner in horizontal direction
  for (let col = Math.max(0, lastMoveCol - 3); col <= Math.min(3, lastMoveCol); col++) {
    if (
      grid[lastMoveRow][col] &&
      grid[lastMoveRow][col] === grid[lastMoveRow][col + 1] &&
      grid[lastMoveRow][col] === grid[lastMoveRow][col + 2] &&
      grid[lastMoveRow][col] === grid[lastMoveRow][col + 3]
    ) {
      return grid[lastMoveRow][col]; // Winner found
    }
  }

  // Check for a winner in vertical direction
  for (let row = Math.max(0, lastMoveRow - 3); row <= Math.min(2, lastMoveRow); row++) {
    if (
      grid[row][lastMoveCol] &&
      grid[row][lastMoveCol] === grid[row + 1][lastMoveCol] &&
      grid[row][lastMoveCol] === grid[row + 2][lastMoveCol] &&
      grid[row][lastMoveCol] === grid[row + 3][lastMoveCol]
    ) {
      return grid[row][lastMoveCol]; // Winner found
    }
  }

  // Check for a winner in diagonal direction (top-left to bottom-right)
  for (let offset = -3; offset <= 0; offset++) {
    const row = lastMoveRow + offset;
    const col = lastMoveCol + offset;
    if (
      row >= 0 && row + 3 < 6 &&
      col >= 0 && col + 3 < 7 &&
      grid[row][col] &&
      grid[row][col] === grid[row + 1][col + 1] &&
      grid[row][col] === grid[row + 2][col + 2] &&
      grid[row][col] === grid[row + 3][col + 3]
    ) {
      return grid[row][col]; // Winner found
    }
  }

  // Check for a winner in diagonal direction (top-right to bottom-left)
  for (let offset = -3; offset <= 0; offset++) {
    const row = lastMoveRow + offset;
    const col = lastMoveCol - offset;
    if (
      row >= 0 && row + 3 < 6 &&
      col - 3 >= 0 && col < 7 &&
      grid[row][col] &&
      grid[row][col] === grid[row + 1][col - 1] &&
      grid[row][col] === grid[row + 2][col - 2] &&
      grid[row][col] === grid[row + 3][col - 3]
    ) {
      return grid[row][col]; // Winner found
    }
  }

  return null; // No winner yet
}

app.get("./", (req, res) => {
  res.send("hello everyone");
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
