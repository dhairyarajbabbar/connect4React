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
io.on("connection", (socket) => {
  // console.log("user connected on socket ID:  ", socket.id);
  socket.on("createRoom", ({ roomName, password, nickName }) => {
    // console.log("hello from create room");
    if (rooms[roomName]) {
      socket.emit("invalidRoom", { message: "Room already exists" });
    } else {
      rooms[roomName] = { password, players: [] };
      rooms[roomName].players.push({
        id: socket.id,
        color:  "red",
        nickName: nickName,
      });
      socket.join(roomName);
      socket.emit("roomJoined", { rooms, roomName, playerColor: "red", playerCount:1 });
    }
  });
  socket.on("joinRoom", ({ roomName, password, nickName }) => {
    const room = rooms[roomName];
    // console.log("hello from join room", room);
    if (room && room.password === password && room.players.length < 2) {
      const playerColor = room.players.length === 0 ? 'red' : (room.players[0].color === 'red' ? 'blue' : 'red');
      oppositePlayer=room.players[0];
      rooms[roomName].players.push({
        id: socket.id,
        color: playerColor,
        nickName: nickName,
      });
      socket.join(roomName);
      socket.emit("roomJoined", {
        playerCount: rooms[roomName].players.length, rooms, roomName, playerColor,
      });
      socket.emit("playerJoined", {
        oppositePlayer:oppositePlayer.nickName,
      });
      io.to(oppositePlayer.id).emit("playerJoined", {
        oppositePlayer:nickName,
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
      // console.log(roomName);
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
    // console.log("hello from updateGame", roomName, currentTurn, newGrid);
    const newTurn = currentTurn === "red" ? "blue" : "red";
    // console.log(checkWinner(newGrid, col));
    io.to(roomName).emit("gameState", {
      newGrid,
      newTurn,
      newWinner: checkWinner(newGrid, col),
    });
  });
  socket.on("restartGame", ({roomName, newGrid})=>{
    // console.log("hello from restartGame");
    io.to(roomName).emit("gameState", {newGrid, newTurn:"red", newWinner:null});
  });
  io.engine.on("connection_error", (err) => {
    console.log(err.req); 
    console.log(err.code);
    console.log(err.message);
    console.log(err.context);
  });
  socket.on('enterLobby', ({nickName}) => {
    lobby.push({socket, nickName});
    // console.log("hello from enterlobby ", nickName)
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
      const roomName = `${player1.socket.id}-${player2.socket.id}`;
      // console.log("roomName from match player", roomName);
      rooms[roomName] = {
        players: [],
      };
      rooms[roomName].players.push({
        id: player1.socket.id,
        color:  "red",
      });
      rooms[roomName].players.push({
        id: player2.socket.id,
        color:  "blue",
      });
      player1.socket.join(roomName);
      player2.socket.join(roomName);
      io.to(player1.socket.id).emit('roomJoined', { rooms, roomName , playerColor:'red', playerCount:2});
      io.to(player2.socket.id).emit('roomJoined', { rooms, roomName , playerColor:'blue', playerCount:2});
      io.to(player1.socket.id).emit('playerJoined', {oppositePlayer:player2.nickName})
      io.to(player2.socket.id).emit('playerJoined', {oppositePlayer:player1.nickName})
      io.to(roomName).emit('startGame');
    }
  }
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

app.get("/", (req, res) => {
  res.send("hello everyone");
});
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
