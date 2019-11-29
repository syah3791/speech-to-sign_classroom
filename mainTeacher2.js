$(document).ready(function(){
'use strict';

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc = {};
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
var sdpConstraints = {
  offerToReceiveAudio: false,
  offerToReceiveVideo: false
};

/////////////////////////////////////////////

var room = window.localStorage.room;
var idTeacher = uniqueToken();

function uniqueToken() {
  var s4 = function() {
    return Math.floor(Math.random() * 0x10000).toString(16);
  };
  return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
}

//////////////////////////////////////////

var socket = io.connect("https://54.210.209.126:443");

if (room !== '') {
  socket.emit('create or join', room, idTeacher);
  console.log('Attempted to create or  join room', room);
}

socket.on('created', function(room) {
  console.log('Created room ' + room);
  isInitiator = true;
});

socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});

socket.on('joined', function(idUser) {
  console.log('joined: ' + room);
  isChannelReady = true;
  pc[idUser] = null;
  maybeStart(idUser);
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message, idUser) {
  console.log('Client sending message: ', message);
  socket.emit('message', message, room, {from: idTeacher, to: idUser});
}
function sendIce(message) {
  console.log('Client sending message: ', message);
  socket.emit('ice', message, room);
}

///////////////////////////////////////////////

// This client receives a message
socket.on('message', function(message, idUser) {
  if (idUser.to == idTeacher) {
    console.log('From message:', idUser.from);
    console.log('To message:', idUser.to);
    console.log('Client received message:', message);
    if (message === 'got user media') {
      //maybeStart(idUser.from);
    } else if (message.type === 'answer' && isStarted) {
      pc[idUser.from].setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'candidate' && isStarted) {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
      pc[idUser.from].addIceCandidate(candidate);
    } else if (message === 'bye' && isStarted) {
      handleRemoteHangup(idUser.from);
    }    
  }  
});



////////////////////////////////////////////////////

/*var audioStream;
navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    })
.then(gotStream)
.catch(function(e) {
  alert('getUserMedia() error: ' + e.name);
});

function gotStream(stream) {
  console.log('Adding local stream.');
  audioStream = stream;
}*/
//const canv = document.getElementById('pdfViewer');

var cvs = document.getElementById('pdfViewer');
var localStream = cvs.captureStream(25);
navigator.getUserMedia({ "audio": true, "video": false }, function (stream) 
{
localStream.addTrack( stream.getTracks().filter(function(track) {return track.kind === 'audio'})[0]);
}, function(error) { console.log(error);});

/*
var cvs = document.getElementById('pdfViewer');
var localStream = cvs.captureStream(25); // parameter is optional
localStream.addTrack( audioTracks );*/
    // get first audio track
    // var audioTrack = audioStream.getAudioTracks()[0];
//var audioTrack = audioStream.getTracks().filter(function(track) {return track.kind === 'audio'})[0];

    // append audio track into Canvas2D stream
//localStream.addTrack( audioTrack );

    // now canvas2D stream has both audio and video tracks
    // peerConnection.addStream( canvasStream );

console.log('Getting user media with constraints audio');
////////////////////////////////////////////////////////
function maybeStart(idUser) {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection', pc[idUser]);
    createPeerConnection(idUser);
	 
    localStream.getTracks().forEach(function(track) {
       pc[idUser].addTrack(  track , localStream);
    });
    //pc[idUser].addStream(localStream);
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      doCall(idUser);
    }
  }
}

window.onbeforeunload = function() {
  sendMessage('bye', "0000");
};

/////////////////////////////////////////////////////////

function createPeerConnection(idUser) {
  try {
    pc[idUser] = new RTCPeerConnection(pcConfig);
    pc[idUser].onicecandidate = handleIceCandidate;
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
    sendIce({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    },0);
  } else {
    console.log('End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall(idUser) {
  console.log('Sending offer to peer');
  pc[idUser].createOffer(sdpConstraints).then(function(sessionDescription) {
    pc[idUser].setLocalDescription(sessionDescription);
    sendMessage(sessionDescription, idUser);
  }, handleCreateOfferError);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function hangup() {
  console.log('Hanging up.');
  ///buat loop untuk tutup port
  sendMessage('bye', "0000");
}

function handleRemoteHangup(idUser) {
  console.log('Session terminated.');
  stop(idUser);
}

function stop(idUser) {
  pc[idUser].close();
  pc[idUser] = null;
}

});
