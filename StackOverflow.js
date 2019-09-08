/*
Remote video is black screen or blank in WebRTC
Ask Question
I have signaling server in java and websocket. 
It works well with local video. but Remote video is black screen or 
blank But it is not always a blank. If you turn off the server and 
turn it on again, the remote video will show up on your remote.
Why does not it always come out sometimes, and sometimes it does not come out?

this is my code...
****
You're not checking for errors on setRemoteDescription, and 
you have a typo where you're calling new RTCSessionDescription(new RTCSessionDescription(offer)), 
but other than that I don't see anything wrong. Fix the urls to see if it helps, 
and check if you're getting ICE candidates. – jib Mar 10 '17 at 20:16 

***
add oniceconnectionstatechange to your prepeareCall Function and 
see if there is any ICE failure because of NAT issues

function prepareCall() {
    peerConn = new RTCPeerConnection(peerConnCfg);
    // send any ice candidates to the other peer
    peerConn.onicecandidate = onIceCandidateHandler;
    // once remote stream arrives, show it in the remote video element
    peerConn.onaddstream = onAddStreamHandler;
    peerConn.oniceconnectionstatechange = function(){
       console.log('ICE state: ',peerConn.iceConnectionState);
    }
};
**/



 navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition
        || window.msSpeechRecognition || window.oSpeechRecognition;

    var localVideoStream = null;
var peerConn = null,
        wsc = new WebSocket("ws://localhost:8080/signaling"),
        peerConnCfg = {
            'iceServers': [{
                'url': 'stun:stun.l.google.com:19302'
            }]
        };


var videoCallButton = document.getElementById("caller");
var       endCallButton = document.getElementById("callee");
var     localVideo = document.getElementById('localVideo');
var     remoteVideo = document.getElementById('remoteVideo');
videoCallButton.addEventListener("click", initiateCall);

endCallButton.addEventListener("click", function (evt) {
            wsc.send(JSON.stringify({"closeConnection": true }));
        });
var sdpConstraints = {
    'mandatory': {
        'OfferToReceiveAudio': true,
        'OfferToReceiveVideo': true
    }
};
function prepareCall() {
    peerConn = new RTCPeerConnection(peerConnCfg);
    // send any ice candidates to the other peer
    peerConn.onicecandidate = onIceCandidateHandler;
    // once remote stream arrives, show it in the remote video element
    peerConn.onaddstream = onAddStreamHandler;
};

// run start(true) to initiate a call
function initiateCall() {
    prepareCall();
    // get the local stream, show it in the local video element and send it
    navigator.getUserMedia({ "audio": true, "video": true }, function (stream) {
        localVideoStream = stream;
        localVideo.src = URL.createObjectURL(localVideoStream);
        peerConn.addStream(localVideoStream);
        createAndSendOffer();

    }, function(error) { console.log(error);});
};

function answerCall() {
    prepareCall();
    // get the local stream, show it in the local video element and send it
    navigator.getUserMedia({ "audio": true, "video": true }, function (stream) {
        localVideoStream = stream;
        localVideo.src = URL.createObjectURL(localVideoStream);
        peerConn.addStream(localVideoStream);
        createAndSendAnswer();

    }, function(error) { console.log(error);});
};

wsc.onmessage = function (evt) {
    var signal = null;
    if (!peerConn) answerCall();
    signal = JSON.parse(evt.data);

    if (signal.sdp) {
        console.log("Received SDP from remote peer.");
        console.log("signal"+ signal);
        peerConn.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    }
    else if (signal.candidate) {
        console.log("signal"+ signal.candidate);
        console.log("Received ICECandidate from remote peer.");
        peerConn.addIceCandidate(new RTCIceCandidate(signal.candidate));
    } else if ( signal.closeConnection){
        console.log("Received 'close call' signal from remote peer.");
        endCall();
    }else{
        console.log("signal"+ signal.candidate);
    }
};

function createAndSendOffer() {
    peerConn.createOffer(
            function (offer) {
                var off = new RTCSessionDescription(offer);
                peerConn.setLocalDescription(new RTCSessionDescription(off),
                        function() {
                            wsc.send(JSON.stringify({"sdp": off }));
                        },
                        function(error) { console.log(error);}
                );
            },
            function (error) { console.log(error);}
    );
};

function createAndSendAnswer() {
    peerConn.createAnswer(
            function (answer) {
                var ans = new RTCSessionDescription(answer);
                peerConn.setLocalDescription(ans, function() {
                            wsc.send(JSON.stringify({"sdp": ans }));
                        },
                        function (error) { console.log(error);}
                );
            },
            function (error) {console.log(error);}
    );
};

function onIceCandidateHandler(evt) {
    if (!evt || !evt.candidate) return;
    wsc.send(JSON.stringify({"candidate": evt.candidate }));
};

function onAddStreamHandler(evt) {
    videoCallButton.setAttribute("disabled", true);
    endCallButton.removeAttribute("disabled");
    // set remote video stream as source for remote video HTML5 element

    remoteVideo.src = window.URL.createObjectURL(evt.stream);
    remoteVideo.play();
    console.log("remote src : "+ remoteVideo.src);
};

function endCall() {
    peerConn.close();
    peerConn = null;
    videoCallButton.removeAttribute("disabled");
    endCallButton.setAttribute("disabled", true);
    if (localVideoStream) {
        localVideoStream.getTracks().forEach(function (track) {
            track.stop();
        });
        localVideo.src = "";
    }
    if (remoteVideo){
        remoteVideo.src = "";
        window.URL.revokeObjectURL(remoteVideo);
    }
};