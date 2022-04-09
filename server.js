const express = require("express");
const app = express();
const { v4: uuidv4 } = require("uuid");
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const mongoose = require("mongoose");
const _ = require("lodash");
app.use("/", express.static("public"));

// utilities
// unique room id generator
function getRoomId() {
  return uuidv4();
}
// logging function
function log(data) {
  console.log(data);
}
//

mongoose.connect(
  "mongodb+srv://sudip:" +
    "SyGHFdpVHQXq2eFe" +
    "@cluster0.2vfbp.mongodb.net/chatDB?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// schemas and stuff

const roomSchema = {
  roomId: String,
  users: Array,
};

const Room = mongoose.model("Room", roomSchema);

// default rooms
const room1 = new Room({
  roomId: getRoomId(),
  users: [],
});
const room2 = new Room({
  roomId: getRoomId(),
  users: [],
});

const defaultItems = [room1, room2];

// START THE SERVER ==========================================================
const port = process.env.PORT || 3000;

io.on("connection", (socket) => {
  //   log the io and socket object
  log(io);
  log(socket);
  //   ============================
  //   insert the default room values into the database
  Room.insertMany(defaultItems, function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log("successfully saved data in the database");
    }
  });
  //   ===========================

  socket.on("join", (roomId) => {
    const roomClients = io.sockets.adapter.rooms[roomId] || { length: 0 };
    const numberOfClients = roomClients.length;

    if (numberOfClients == 0) {
      console.log(
        `creating room ${roomId} and emitting room_created socket event`
      );
      socket.join(roomId);
      socket.emit("room_created", roomId);
    } else if (numberOfClients == 1) {
      socket.join(roomId);
      socket.emit("room_joined", roomId);
    } else {
      console.log(`joining room ${roomId}, emitting full_room socket event`);
      socket.emit("full_room", roomId);
    }
  });

  socket.on("start_call", (roomId) => {
    const room = new Room({
      roomId: getRoomId(),
      users: [],
    });
    console.log(`Broadcasting start_call event to peers in room ${roomId}`);
    Room.insertOne(room);
    socket.broadcast.to(roomId).emit("start_call");
  });

  socket.on("webrtc_offer", (event) => {
    console.log(event);
    console.log(
      `Broadcasting webrtc_offer event to peers in room ${event.roomId}`
    );
    socket.broadcast.to(event.roomId).emit("webrtc_offer", event.sdp);
  });

  socket.on("webrtc_answer", (event) => {
    console.log(event);
    console.log(
      `Broadcasting webrtc_answer event to peers in room ${event.roomId}`
    );
    socket.broadcast.to(event.roomId).emit("webrtc_answer", event.sdp);
  });

  socket.on("webrtc_ice_candidate", (event) => {
    console.log(event);
    console.log(
      `Broadcasting webrtc_ice_candidate event to peers in room ${event.roomId}`
    );
    socket.broadcast.to(event.roomId).emit("webrtc_ice_candidate", event);
  });
});

server.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
