const path = require("path");
const express = require("express");
const app = express();
const { v4: uuidv4 } = require("uuid");
const WebSocket = require("ws");

// CLASS ROOM
class Room {
  roomId = "";
  maxSize = 50;
  currentSize = 0;
  roomCreator = {};
  users = [];
  creatorId = "";
  constructor(roomId, maxSize, users, roomCreator, creatorId) {
    this.roomId = roomId;
    this.maxSize = maxSize;
    this.roomCreator = roomCreator;
    this.creatorId = creatorId;
    if (Array.isArray(users)) {
      this.users = this.users.concat(users);
      this.currentSize = this.currentSize + users.length;
    } else if (typeof users == "object") {
      this.users.push(users);
      this.currentSize += 1;
    }
  }
  addUser(user) {
    this.users.push(user);
  }
  removeUser(user) {
    this.users.forEach((user, index) => {
      if (user.username) {
        this.users.splice(index, 1);
        return 1;
      } else {
        return 0;
      }
    });
  }
}
// CLASS ROOM

// ROOMS>ROOM>USER
ROOMS = new Map();
// default room
const room1 = new Room("1234", 50);
ROOMS.set(room1.roomId, room1);
trace(ROOMS);

app.use("/", express.static("public"));

const wss = new WebSocket.Server({
  noServer: true,
});

const port = process.env.PORT || 9876;

const server = app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
// CONNECTION EVENT ON THE SERVER
wss.on("connection", function (ws) {
  // trace(ws);
  ws.isRoomCreator = false;
  ws.userId = getUserId();
  //   trace(ws.userId);
  // BROADCAST FUNCTION
  function broadcast(roomId, ev, data) {
    console.log("server.js 77");
    console.log(roomId + "\n" + ev + "\n" + JSON.stringify(data));
    const room = ROOMS.get(roomId);
    // trace(room.users);
    room.users.forEach((user) => {
      //   trace(user.userId);
      //   trace(ws.userId);

      if (user.userId != ws.userId) {
        //   trace("found");
        user.send(JSON.stringify({ event: ev, data: data }));
      } else {
        //   trace("?????????????");
      }
    });
  }
  // BROADCAST FUNCTION
  ws.on("message", function (message) {
    try {
      const { event, data } = JSON.parse(message);
      // console.log(event);
      // console.log(data);
      switch (event) {
        case "join": {
        //   trace("join room case");
          // check if that room is present
          const isRoomPresent = ROOMS.has(data.roomId);

          if (isRoomPresent) {
            const theRoom = ROOMS.get(data.roomId);
            const numberOfUsers = theRoom.users.length;
            if (numberOfUsers == 0) {
            //   trace("else part, creating new room");
              // create the room
              ws.isRoomCreator = true;
              const newRoom = new Room(getRoomId(), 20, [ws], ws, ws.userId);
              ROOMS.set(newRoom.roomId, newRoom);
            //   trace(ROOMS);
              ws.send(
                JSON.stringify({
                  event: "room_created",
                  data: { roomId: newRoom.roomId },
                })
              );
            } else if (numberOfUsers >= 1) {
            //   trace("This room is present");
              ws.isRoomCreator = false;
              ROOMS.get(data.roomId).addUser(ws);
              ws.send(
                JSON.stringify({
                  event: "room_joined",
                  data: { roomId: data.roomId },
                })
              );
            } else {
            //   trace("full rooom");
              ws.emit("full_room", data.roomId);
            }
          } else {
            // trace("else part, creating new room");
            // create the room
            ws.isRoomCreator = true;
            const newRoom = new Room(getRoomId(), 20, [ws], ws, ws.userId);
            ROOMS.set(newRoom.roomId, newRoom);
            // trace(ROOMS);
            ws.send(
              JSON.stringify({
                event: "room_created",
                data: { roomId: newRoom.roomId },
              })
            );
          }
          break;
        }
        case "start_call": {
          trace("start call case");
        //   trace(event);
        //   trace(data);
        //   trace(ROOMS);
          broadcast(data.roomId, "start_call", { roomId: data.roomId });
          break;
        }
        case "webrtc_offer": {
        //   trace("webrtc-offer case");
        //   trace(event);
        //   trace(data);
          broadcast(data.roomId, "webrtc_offer", { sdp: data.sdp });

          break;
        }
        case "webrtc_answer": {
        //   trace("webrtc answer case");
        //   trace(event);
        //   trace(data);
          broadcast(data.roomId, "webrtc_answer", { sdp: data.sdp });
          break;
        }
        case "webrtc_ice_candidate": {
        //   trace("webrtc ice candidate case");
        //   trace(event);
        //   trace(data);
          // trace(data);
          broadcast(data.roomId, "webrtc_ice_candidate", { data: data });
          break;
        }
      }
    } catch (e) {}
  });
});
/* 
parameter 1 is of type http.incomingMessage
parameter 2 is net.Stream of type internal.Duplex, an actual tcp socket(representation of the connected client)
parameter 3 is a buffer
*/
server.on("upgrade", async function upgrade(request, socket, head) {
  // Do what you normally do in `verifyClient()` here and then use
  // `WebSocketServer.prototype.handleUpgrade()`.
  // console.log(request);
  // console.log("========================");
  // console.log(socket);
  // console.log("========================");
  // console.log(head);
  wss.handleUpgrade(request, socket, head, function done(ws) {
    wss.emit("connection", ws, request);
  });
});

// utilities
function trace(s) {
  const orig = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const err = new Error();
  Error.captureStackTrace(err, global);
  const callee = err.stack[1];
  Error.prepareStackTrace = orig;

  const callerFile = path.relative(process.cwd(), callee.getFileName());
  const callerLine = callee.getLineNumber();
  console.log(callerFile + " " + callerLine);
  console.log(s);
}
// unique room id generator
function getRoomId() {
  return uuidv4();
}
function getUserId() {
  return uuidv4();
}
// logging function
function log(data) {
  console.log(data);
}

// mongoose.connect(
//   "mongodb+srv://sudip:" +
//     "SyGHFdpVHQXq2eFe" +
//     "@cluster0.2vfbp.mongodb.net/chatDB?retryWrites=true&w=majority",
//   {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   }
// );

// // schemas and stuff

// const roomSchema = {
//   roomId: String,
//   users: Array,
// };

// const Room = mongoose.model("Room", roomSchema);

// // default rooms
// const room1 = new Room({
//   roomId: getRoomId(),
//   users: [],
// });
// const room2 = new Room({
//   roomId: getRoomId(),
//   users: [],
// });

// const defaultItems = [room1, room2];
