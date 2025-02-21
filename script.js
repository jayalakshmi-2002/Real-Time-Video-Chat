// Get DOM elements
const startButton = document.getElementById('startButton');
const endButton = document.getElementById('endButton');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// Set up WebRTC
let localStream;
let peerConnection;
let socket = io();

// STUN server to get the public IP address
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
    ],
};

const constraints = {
    video: true,
    audio: true,
};

// Start video chat
startButton.addEventListener('click', startVideoChat);

// End video chat
endButton.addEventListener('click', endVideoChat);

// Get local video and audio stream
async function startVideoChat() {
    try {
        // Get the local media stream (video + audio)
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        localVideo.srcObject = localStream;

        // Enable buttons
        startButton.disabled = true;
        endButton.disabled = false;

        // Create a new peer connection
        peerConnection = new RTCPeerConnection(iceServers);

        // Add local stream to the peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // When remote track is added, display it in remote video element
        peerConnection.ontrack = event => {
            remoteVideo.srcObject = event.streams[0];
        };

        // Handle ICE candidate events
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('ice-candidate', event.candidate);
            }
        };

        // Create an offer and send it to the other peer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer);

    } catch (err) {
        console.error('Error accessing media devices.', err);
    }
}

// End video chat
function endVideoChat() {
    peerConnection.close();
    localStream.getTracks().forEach(track => track.stop());
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    startButton.disabled = false;
    endButton.disabled = true;
}

// Socket.io event listeners
socket.on('offer', async (offer) => {
    // Set the remote description (received offer)
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // Create an answer and send it back to the other peer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);
});

socket.on('answer', (answer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', (candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});
