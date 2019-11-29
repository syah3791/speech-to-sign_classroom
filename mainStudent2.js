$(document).ready(function(){
'use strict';

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;
 
var pcConfig = {
  'iceServers': [
    {
      'urls': 'stun:stun.l.google.com:19302'
    },
    {
      'urls': 'stun:stun1.l.google.com:19302'
    },
    {
      'urls': 'stun:stun2.l.google.com:19302'
    },
    {
      'urls': 'stun:stun3.l.google.com:19302'
    },
    {
      'urls': 'stun:stun4.l.google.com:19302'
    },
    {
      'urls': 'stun:stun.stunprotocol.org:3478'
    },
    {
      'urls': 'stun:stun.12connect.com:3478'
    },
    {
      'urls': 'stun:stun1.voiceeclipse.net:3478'
    },
    {
      'urls': 'turn:192.158.29.39:3478?transport=udp',
      'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      'username': '28224511:1379330808'
    },
    {
      'urls': 'turn:192.158.29.39:3478?transport=tcp',
      'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      'username': '28224511:1379330808'
    },
    {
        'url': 'turn:numb.viagenie.ca',
        'credential': 'muazkh',
        'username': 'webrtc@live.com'
    },
    {
        'url': 'turn:192.158.29.39:3478?transport=udp',
        'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        'username': '28224511:1379330808'
    },
    {
        'url': 'turn:192.158.29.39:3478?transport=tcp',
        'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        'username': '28224511:1379330808'
    },
    {
        'url': 'turn:turn.bistri.com:80',
        'credential': 'homeo',
        'username': 'homeo'
     },
     {
        'url': 'turn:turn.anyfirewall.com:443?transport=tcp',
        'credential': 'webrtc',
        'username': 'webrtc'
    }
  ]
};

// Set up audio and video regardless of what devices are present.


/////////////////////////////////////////////

var room = window.localStorage.room;
var idTeacher = null;
var idUser = uniqueToken();

function uniqueToken() {
  var s4 = function() {
    return Math.floor(Math.random() * 0x10000).toString(16);
  };
  return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
}

//////////////////////////////////////////
// Could prompt for room name:
// room = prompt('Enter room name:');

var socket = io.connect("https://54.210.209.126:443");

if (room !== '') {
  socket.emit('create or join', room, idUser);
  console.log('Attempted to create or  join room', room);
}

socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});


socket.on('log', function(array) {
  console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message, room, {from: idUser, to: idTeacher});
}

///////////////////////////////////////////////

// This client receives a message
socket.on('message', function(message, idser) {
  if (idser.to == idUser) {
    idTeacher = idser.from;
    console.log('From message:', idser.from);
    console.log('To message:', idser.to);
    console.log('Client received message:', message);
    if (message.type === 'offer') {
      if (!isInitiator && !isStarted) {
          isChannelReady = true;
          maybeStart(message);
       }
    }
  }
  if (message === 'bye' && isStarted) {
      handleRemoteHangup();}
});

socket.on('ice', function(message) {
  console.log('Client received message:', message);
  if (message.type === 'candidate' && isStarted) {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
      pc.addIceCandidate(candidate);
    }
});

////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');



function maybeStart(message) {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    isStarted = true;
      pc.setRemoteDescription(new RTCSessionDescription(message));
      doAnswer();
    console.log('isInitiator', isInitiator);
  }
}

/*window.onbeforeunload = function() {
  sendMessage('bye');
};*/

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(pcConfig);
    pc.onicecandidate = handleIceCandidate;
    pc.ontrack = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteStream = event.streams[0];
  localVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  /*sendMessage('bye');*/
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  isStarted = false;
  pc.close();
  pc = null;
  window.localStorage.room = 0;      
  window.location.href = "index.html";
}

});
