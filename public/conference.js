const roomSelectionContainer = document.getElementById(
  "room-selection-container"
);
const roomInput = document.getElementById("room-input");
const joinRoomButton = document.getElementById("join-room-button");
const videoChatContainer = document.getElementById("video-chat-container");
const localVideoComponent = document.getElementById("local-video");
// const remoteVideoComponent = document.getElementById("remote-video");
const createRoomButton = document.getElementById("create-room-button");
const userName = location.href.split("?")[1].split("=")[1];
console.log(userName);

const mediaConstraints = {
  audio: true,
  video: true,
};

let localStream;
let remoteStream;
let isRoomCreator;
let rtcPeerConnection;
let roomId;

const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

// join button listener
joinRoomButton.addEventListener("click", () => {
  console.log(
    "step 1\n" +
      "connect button is clicked, joinRoom function is to be executed, passing room input as room id to joinRoom function"
  );

  joinRoom(roomInput.value);
});

WebSocket.prototype.emit = function (event, data) {
  this.send(JSON.stringify({ event, data }));
};

WebSocket.prototype.listen = function (eventName, callback) {
  console.log(this);
  this._socketListeners = this._socketListeners || {};
  this._socketListeners[eventName] = callback;
};

const socketClient = new WebSocket("ws://localhost:9876/server");
console.log(socketClient);

socketClient.onopen = (para) => {
  console.log(`websocket is live`);
  console.log(para);
};

socketClient.onmessage = function (e) {
  try {
    const { event, data } = JSON.parse(e.data);
    console.log(event);
    console.log(data);
    socketClient._socketListeners[event](data);
  } catch (error) {
    // not for our app
  }
};

socketClient.listen("room_created", async (data) => {
  console.log("room_created");
  console.log(data);
  roomInput.value = data.roomId;
  roomId = data.roomId;
  await setLocalStream(mediaConstraints);
  isRoomCreator = true;
  console.log("is room creator");
  console.log(isRoomCreator);
});

socketClient.listen("room_joined", async (e) => {
  console.log(e);
  console.log("Socket event callback: room_joined");

  //   uncomment this
  await setLocalStream(mediaConstraints);
  socketClient.emit("start_call", { roomId: roomId });
});

socketClient.listen("start_call", async (data) => {
  console.log(data);
  console.log("inside start call listen ");
  //   isRoomCreator = data.isRoomCreator;
  console.log(isRoomCreator);
  if (isRoomCreator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    console.log(rtcPeerConnection);
    addLocalTracks(rtcPeerConnection);
    rtcPeerConnection.ontrack = setRemoteStream;
    console.log(rtcPeerConnection);
    rtcPeerConnection.onicecandidate = sendIceCandidate;
    await createOffer(rtcPeerConnection);
  }
});

socketClient.listen("webrtc_offer", async (event) => {
  console.log("Socket event callback: webrtc_offer");

  if (!isRoomCreator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    addLocalTracks(rtcPeerConnection);
    rtcPeerConnection.ontrack = setRemoteStream;
    rtcPeerConnection.onicecandidate = sendIceCandidate;
    rtcPeerConnection.setRemoteDescription(
      new RTCSessionDescription(event.sdp)
    );
    await createAnswer(rtcPeerConnection);
  }
});

socketClient.listen("webrtc_answer", (event) => {
  console.log("Socket event callback: webrtc_answer");

  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event.sdp));
});

socketClient.listen("webrtc_ice_candidate", (event) => {
  console.log("Socket event callback: webrtc_ice_candidate");
  console.log(event.data.label);
  console.log(event.data.candidate);
  // ICE candidate configuration.
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: event.data.label,
    candidate: event.data.candidate,
  });
  console.log(candidate);

  rtcPeerConnection.addIceCandidate(candidate);
  console.log(rtcPeerConnection);
});

//   ===================================
// FUNCTIONS

function joinRoom(rId) {
  console.log("step 2\n" + "inside join room now");
  if (rId === "") {
    alert("Please type a room ID");
  } else {
    roomId = rId;
    socketClient.emit("join", { username: userName, roomId: rId });
    // showVideoConference();
  }
}

function setRemoteStream(event) {
  console.log(event);
//   console.log(event.streams);
//   console.log(event.streams.length);

//   console.log("remote video component");
//   console.log(remoteVideoComponent);
//   remoteVideoComponent.srcObject = event.streams[0];
//   remoteStream = event.stream;
  const vid = document.createElement("video");
  vid.setAttribute("autoplay",true);
  vid.srcObject = event.streams[0];
  document.getElementById("video-grid").append(vid);
 
}
async function setLocalStream(mediaConstraints) {
  console.log("set localstream function executing");
  //   let localStream;
  try {
    localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    console.log(localStream);
  } catch (e) {
    console.log(e);
  }

  localVideoComponent.srcObject = localStream;
}

function addLocalTracks(rtcPeerConnection) {
  console.log("add local tracks function");
  console.log(localStream);
  console.log(localStream.getAudioTracks());
  console.log(localStream.getVideoTracks());
  localStream.getTracks().forEach((track) => {
    console.log(track);
    rtcPeerConnection.addTrack(track, localStream);
  });
  console.log("adding should be done");
  console.log(rtcPeerConnection);
}

function sendIceCandidate(event) {
  console.log("send ice candidate function");
  console.log(event);

  if (event.candidate) {
    socketClient.emit("webrtc_ice_candidate", {
      roomId,
      label: event.candidate.sdpMLineIndex,
      candidate: event.candidate.candidate,
    });
  }
}

async function createOffer(rtcPeerConnection) {
  let sessionDescription;
  try {
    sessionDescription = await rtcPeerConnection.createOffer();
    console.log(sessionDescription);
    rtcPeerConnection.setLocalDescription(sessionDescription);
  } catch (e) {
    console.log(e);
  }

  socketClient.emit("webrtc_offer", {
    type: "webrtc_offer",
    sdp: sessionDescription,
    roomId,
  });
}

async function createAnswer(rtcPeerConnection) {
  let sessionDescription;
  try {
    sessionDescription = await rtcPeerConnection.createAnswer();
    rtcPeerConnection.setLocalDescription(sessionDescription);
  } catch (error) {
    console.error(error);
  }

  socketClient.emit("webrtc_answer", {
    type: "webrtc_answer",
    sdp: sessionDescription,
    roomId,
  });
}

//   ===================================
// prev prev
// createRoomButton.addEventListener("click", (e) => {
//   e.preventDefault();
//   if (roomId === "") {
//     alert("Please type a room ID");
//   } else {
//     socketClient.emit("create_room", { username: userName });
//     // showVideoConference();
//   }
// });

