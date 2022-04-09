console.log(window);
const roomSelectionContainer = document.getElementById(
  "room-selection-container"
);
const roomInput = document.getElementById("room-input");
const connectButton = document.getElementById("connect-button");
const videoChatContainer = document.getElementById("video-chat-container");
const localVideoComponent = document.getElementById("local-video");
const remoteVideoComponent = document.getElementById("remote-video");

// vars
const socket = io();
console.log("DA sockket");
console.log(socket);

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

// connect listener
connectButton.addEventListener("click", () => {
  console.log(
    "step 1\n" +
      "connect button is clicked, joinRoom function is to be executed, passing room input as room id to joinRoom function"
  );

  joinRoom(roomInput.value);
});

// when the room is created
socket.on("room_created", async () => {
  console.log("soscket event callback: room_created");

  await setLocalStream(mediaConstraints);
  isRoomCreator = true;
});

// when user joins room
socket.on("room_joined", async () => {
  console.log("socket event callback: room_joined");

  await setLocalStream(mediaConstraints);
  socket.emit("start_call", roomId);
});

// when room is occupied
socket.on("full_room", () => {
  console.log("socket event callback: full_room");

  alert("The room is full, please try at a later time");
});

socket.on("start_call", async () => {
  console.log("socket event callback : start_Call");

  if (isRoomCreator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    addLocalTracks(rtcPeerConnection);
    rtcPeerConnection.ontrack = setRemoteStream;
    rtcPeerConnection.onicecandidate = sendIceCandidate;
    await createOffer(rtcPeerConnection);
  }
});

socket.on("webrtc_answer", (event) => {
  console.log("Socket event callback: webrtc_answer");
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
});

socket.on("webrtc_ice_candidate", (event) => {
  console.log("Socket event callback: webrtc_ice_candidate");
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  });
  rtcPeerConnection.addIceCandidate(candidate);
});

// util functions

function joinRoom(room) {
  if (room === "") {
    alert("Please type a room ID");
  } else {
    roomId = room;
    socket.emit("join", room);
    showVideoConference();
  }
}

function showVideoConference() {
  console.log("show video conference function executing");

  roomSelectionContainer.style = "display:none";
  videoChatContainer.style = "display:block";
}

async function setLocalStream(mediaConstraints) {
  console.log("set localstream function executing");
  let localStream;
  try {
    localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    console.log(localStream);
  } catch (e) {
    console.log(e);
  }

  localVideoComponent.srcObject = localStream;
}

// add local tracks to the rtc peerconnection
function addLocalTracks(rtcPeerConnection) {
  localStream.getTracks().forEach((track) => {
    rtcPeerConnection.addTrack(track, localStream);
  });
}

async function createOffer(rtcPeerConnection) {
  let sessionDescription;
  try {
    sessionDescription = await rtcPeerConnection.createOffer();
    rtcPeerConnection.setLocalDescripttion(sessionDescription);
  } catch (e) {
    console.log(e);
  }

  socket.emit("webrtc_offer", {
    type: "webrtc_offer",
    sdp: sessionDescription,
    roomId,
  });
}

async function createAnswer(rtcPeerConnection) {
  let sessionDescription;
  try {
    sessionDescription = await rtcPeerConnection.createAnswer();
    rtcPeerConnection.setLOcalDescripttion(sessionDescription);
  } catch (e) {
    console.log(e);
  }

  socket.emit("webrtc_answer", {
    type: "webrtc_answer",
    sdp: sessionDescription,
    roomId,
  });
}

function setRemoteStream(event) {
  remoteVideoComponent.srcObject = event.streams[0];
  remoteStreamm = event.stream;
}

function sendIceCandidate(event) {
  if (event.candidate) {
    socket.emit("webrtc_ice_candidate", {
      roomId,
      label: event.candidate.sdpMLineIndex,
      candidate: event.candidate.candidate,
    });
  }
}
