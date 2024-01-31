const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  })
);
const rooms = {};
const lobby = [];
// const gameRooms = {};

io.on("connection", (socket) => {
  console.log("user connected on socket ID:  ", socket.id);
  socket.on("createRoom", ({ roomName, password }) => {
    console.log("hello from create room");
    if (rooms[roomName]) {
      socket.emit("invalidRoom", { message: "Room already exists" });
    } else {
      rooms[roomName] = { password, players: [] };
      rooms[roomName].players.push({
        id: socket.id,
        color:  "red",
      });
      socket.join(roomName);
      socket.emit("roomJoined", { rooms, roomName, playerColor: "red", playerCount:1 });
    }
  });
  socket.on("joinRoom", ({ roomName, password }) => {
    const room = rooms[roomName];
    console.log("hello from join room", room);
    if (room && room.password === password && room.players.length < 2) {
      const playerColor = room.players.length === 0 ? 'red' : (room.players[0].color === 'red' ? 'blue' : 'red');
      rooms[roomName].players.push({
        id: socket.id,
        color: playerColor,
      });
      socket.join(roomName);
      socket.emit("roomJoined", {
        playerCount: rooms[roomName].players.length, rooms, roomName, playerColor,
      });
      io.to(roomName).emit("playerJoined", {
        playerCount: rooms[roomName].players.length,
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
  socket.on("restart Game", ()=>{
    // socket
  });
  io.engine.on("connection_error", (err) => {
    console.log(err.req); // the request object
    console.log(err.code); // the error code, for example 1
    console.log(err.message); // the error message, for example "Session ID unknown"
    console.log(err.context); // some additional error context
  });
  socket.on('enterLobby', () => {
    lobby.push(socket);
    tryMatchPlayers();
  });
  socket.on('leaveLobby', () => {
    const index = lobby.indexOf(socket.id);
    if (index !== -1) {
      lobby.splice(index, 1);
    }
  });
  function tryMatchPlayers() {
    if (lobby.length >= 2) {
      const player1 = lobby.shift();
      const player2 = lobby.shift();
      const roomName = `${player1.id}-${player2.id}`;
      console.log("roomName from match player", roomName);
      rooms[roomName] = {
        players: [],
      };
      rooms[roomName].players.push({
        id: player1.id,
        color:  "red",
      });
      rooms[roomName].players.push({
        id: player2.id,
        color:  "blue",
      });
      player1.join(roomName);
      player2.join(roomName);
      io.to(player1.id).emit('roomJoined', { rooms, roomName , playerColor:'red', playerCount:2});
      io.to(player2.id).emit('roomJoined', { rooms, roomName , playerColor:'blue', playerCount:2});
      io.to(roomName).emit('startGame');
    }
  }

  // socket.on('disconnect', () => {
  //   const index = lobby.indexOf(socket.id);
  //   if (index !== -1) {
  //     lobby.splice(index, 1);
  //   }

  //   for (const roomName in rooms) {
  //     const players = rooms[roomName].players;
  //     const playerIndex = players.indexOf(socket.id);
  //     if (playerIndex !== -1) {
  //       const opponent = players[1 - playerIndex];
  //       io.to(opponent).emit('opponentLeft');
  //       delete gameRooms[roomName];
  //       break;
  //     }
  //   }
  // });

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
