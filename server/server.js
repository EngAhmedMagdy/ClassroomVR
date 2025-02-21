const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins (for testing)
        methods: ["GET", "POST"]
    }
});

let players = {};

io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Send current players to the new player
    socket.emit("currentPlayers", players);

    // Add new player
    players[socket.id] = { position: { x: 0, y: 0, z: 0 }, rotation: 0 };

    // Broadcast new player to others
    socket.broadcast.emit("newPlayer", { id: socket.id, ...players[socket.id] });

    // Update player movement
    socket.on("playerMove", (data) => {
        if (players[socket.id]) {
            players[socket.id].position = data.position;
            players[socket.id].rotation = data.rotation;
            socket.broadcast.emit("playerMoved", { id: socket.id, ...data });
        }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit("removePlayer", socket.id);
    });
});

server.listen(3001, () => {
    console.log("WebSocket Server running on port 3001");
});
