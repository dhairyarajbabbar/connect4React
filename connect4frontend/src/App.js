import React, { useState, useMemo, useEffect } from "react";
import { io } from "socket.io-client";
import "./App.css";
const App = () => {
  const socket = useMemo(
    () =>
      io("http://localhost:3001", {
        withCredentials: true,
      }),
    []
  );
  const [roomName, setRoomName] = useState("");
  const [password, setPassword] = useState("");
  const [playerColor, setPlayerColor] = useState("");
  const [showForm, setShowForm] = useState(true);
  const [inLobby, setInLobby] = useState(false);
  const [nickName, setNickName] = useState("");
  const [oppositePlayer, setOppositePlayer] = useState("");
  const [grid, setGrid] = useState(
    Array.from({ length: 6 }, () => Array(7).fill(null))
  );
  const [turn, setTurn] = useState("red");
  const [winner, setWinner] = useState(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    socket.on("connect", () => {
      // console.log("user conected", socket.id);
    });
    socket.on("roomJoined",({ rooms, roomName, playerColor, playerCount, oppositePlayer }) => {
        // console.log(`Joined room ${roomName}`, rooms, roomName, playerColor);
        setShowForm(false);
        setPlayerColor(playerColor);
        setRoomName(roomName);
      }
    );
    socket.on("invalidRoom", () => {
      // console.log("Invalid room or password");
      alert("Invalid Roomname or Password");
      alert("Again ask your friend about it");
    });
    socket.on("playerJoined", ({ oppositePlayer }) => {
      // console.log("Player joined", oppositePlayer);
      setOppositePlayer(oppositePlayer);
    });
    socket.on("playerLeft", () => {
      // console.log("Player left");
      setStarted(false);
    });
    socket.on("startGame", () => {
      // console.log("hello from game started");
      setStarted(true);
    });
    socket.on("gameState", ({ newGrid, newTurn, newWinner }) => {
      // console.log("hello from gamestate");
      setGrid(newGrid);
      setTurn(newTurn);
      setWinner(newWinner);
    });
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  const joinRoom = () => {
    socket.emit("joinRoom", { roomName, password, nickName });
    // console.log("hello after joinroom click and emit", socket.id, {roomName,password,});
  };
  const createRoom = () => {
    socket.emit("createRoom", { roomName, password, nickName });
    // console.log("hello after createroom click and emit", socket.id, {roomName,password,});
    // console.log(showForm);
  };
  const handleClick = (col) => {
    // console.log("hello from handle click function",roomName, playerColor, started);
    if (winner || grid[0][col] !== null || turn !== playerColor || !started)
      return;
    const newGrid = [...grid];
    for (let row = 5; row >= 0; row--) {
      if (newGrid[row][col] === null) {
        newGrid[row][col] = playerColor;
        socket.emit("updateGame", {
          roomName,
          newGrid,
          currentTurn: playerColor,
          col,
        });
        break;
      }
    }
  };
  const enterLobby = () => {
    setInLobby(true);
    socket.emit("enterLobby", { nickName });
  };
  const leaveLobby = () => {
    setInLobby(false);
    socket.emit("leaveLobby");
  };
  const restartGame = () => {
    // console.log("restart game clicked");
    const newGrid = [...grid];
    for (let col=0;col<=6;col++){
      for (let row = 5; row >= 0; row--) {
        if (newGrid[row][col] !== null) {
          newGrid[row][col] = null;
        }
      }
    }
    socket.emit("restartGame", {
      roomName,
      newGrid,
    });
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-200 ">
      <div className="bg-teal-100 p-8 rounded-lg shadow-md ">
        <h1 className="text-3xl font-bold mb-4">Connect Four</h1>
        {showForm ? (
          <>
            {inLobby ? (
              <div>
                <p className="mb-4">Waiting for a match...</p>
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  onClick={leaveLobby}
                >
                  Leave Lobby
                </button>
              </div>
            ) : (
              <>
                <form className="mb-4">
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2">
                      Your Nick Name:
                    </label>
                    <input
                      type="text"
                      className="w-full border p-2 rounded-md"
                      value={nickName}
                      onChange={(e) => setNickName(e.target.value)}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2">
                      Room Name:
                    </label>
                    <input
                      type="text"
                      className="w-full border p-2 rounded-md"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2">
                      Password:
                    </label>
                    <input
                      type="password"
                      className="w-full border p-2 rounded-md"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="bg-blue-500 text-white px-4 py-2 rounded mr-2 hover:bg-blue-600"
                    onClick={createRoom}
                  >
                    Create Room
                  </button>
                  <button
                    type="button"
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    onClick={joinRoom}
                  >
                    Join Room
                  </button>
                </form>
                <h3 className="mb-2">Or Play with Online Players</h3>
                <button
                  className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                  onClick={enterLobby}
                >
                  Play Online
                </button>
              </>
            )}
          </>
        ) : (
          <>
            {winner ? (
              <>
                {winner === playerColor ? (
                  <>
                    <p className="mb-4">Yay, you win!</p>
                  </>
                ) : (
                  <>
                    <p className="mb-2">Oops, better luck next time 😅</p>
                  </>
                )}
                <button
                  className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 m-3"
                  onClick={restartGame}
                >
                  Restart Game
                </button>
              </>
            ) : (
              <>
                {turn === playerColor ? (
                  <p className="mb-3">Make a move</p>
                ) : (
                  <p className="mb-3">Wait for your turn</p>
                )}
                <p className="mb-3">{`${nickName} vs ${oppositePlayer}`}</p>
              </>
            )}
            <div className="grid">
              {grid.map((row, rowIndex) => (
                <div key={rowIndex} className="row">
                  {row.map((cell, colIndex) => (
                    <div
                      key={colIndex}
                      className={`cell ${cell}`}
                      onClick={() => handleClick(colIndex)}
                    ></div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default App;
