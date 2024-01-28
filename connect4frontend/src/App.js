import React, { useState, useMemo, useEffect } from 'react';
import {io} from 'socket.io-client';
import "./App.css";
const App = () => {
  const socket = useMemo(
    () =>
      io("http://localhost:3001", {
        withCredentials: true,
      }),
    []
  );
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [playerColor, setPlayerColor] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [grid, setGrid] = useState(Array.from({ length: 6 }, () => Array(7).fill(null)));
  const [turn, setTurn] = useState('red');
  const [winner, setWinner] = useState(null);
  useEffect(() => {
    socket.on('connect', ()=> {
      console.log("user conected" , socket.id);
    });
    socket.on('roomJoined', ({ rooms, roomName , playerColor}) => {
      console.log(`Joined room ${roomName }`, rooms, roomName, playerColor); 
      setShowForm(false);
      setPlayerColor(playerColor);
    });
    socket.on('invalidRoom', () => {
      console.log('Invalid room or password');
    });
    socket.on('playerJoined', ({ playerCount, playerColor }) => {
      console.log('Player joined');
    });
    socket.on('playerLeft', () => {
      console.log('Player left');
    });
    socket.on('gameState', ({ newGrid, newTurn, newWinner }) => {
      setGrid(newGrid);
      setTurn(newTurn);
      setWinner(newWinner);
    });
    return () => {
      socket.disconnect();
    };
  }, [socket]); 

  const joinRoom = () => {
    socket.emit('joinRoom', { roomName, password });
    console.log("hello after joinroom click and emit", socket.id, {roomName, password});
  };
  const createRoom = () => {
    socket.emit('createRoom', { roomName, password });
    console.log("hello after createroom click and emit", socket.id, {roomName, password});
    console.log(showForm);
  };
  const handleClick = (col) => {
    if (winner || grid[0][col] !== null || turn !== playerColor) return;
    const newGrid = [...grid];
    for (let row = 5; row >= 0; row--) {
      if (newGrid[row][col] === null) {
        newGrid[row][col] = playerColor;
        socket.emit('updateGame', { roomName, newGrid, currentTurn: playerColor, col });
        break;
      }
    }
  };
  return (
    <div className="App">
      <h1>Connect Four Multiplayer</h1>
      <form >
        {showForm ? (
           <>
           <label>
             Room Name:
             <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
           </label>
           <label>
             Password:
             <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
           </label>
           <button type="button" onClick={createRoom}>Create Room</button>
           <button type="button" onClick={joinRoom}>Join Room</button>
         </>
        ) : (
          <>
            <p>Your color: {playerColor}</p>
            {winner ? <p>{`${winner} player wins!`}</p> : <p>{`Current turn: ${turn}`}</p>}
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
      </form>
    </div>
  );
};

export default App;