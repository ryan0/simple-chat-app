let loginForm = document.getElementById('login-form');
let authToken = "";

loginForm.addEventListener('submit', e => {
    e.preventDefault();
    let usernameInput = document.getElementById('username').value;
    let passwordInput = document.getElementById('password').value;

    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: usernameInput,
            password: passwordInput
        }),
    };
    fetch('/login', options).then(response => {
        if(response.ok) {
            response.text().then(text => {
                authToken = text;
                userAuthenticated();
            });
        } else {
            console.log("HTTP status code: " + response.status);
        }
    });
});


function userAuthenticated() {
    document.getElementById('login').classList.add('hide');
    document.getElementById('chat-app').classList.remove('hide');

    const connectionQuery = { token: authToken };
    let socket = io({ query: connectionQuery });
    let form = document.getElementById('form');
    let input = document.getElementById('input');
    
    form.addEventListener('submit', e => {
        e.preventDefault();
        if (input.value) {
            socket.emit('chat message', input.value);
            input.value = '';
        }
    });
    socket.on('chat log', log => {
        for(let l of log) {
            let item = document.createElement('li');
            item.textContent = l;
            messages.appendChild(item);
            window.scrollTo(0, document.body.scrollHeight);
        }
    })
    socket.on('chat message', msg => {
        let item = document.createElement('li');
        item.textContent = msg;
        messages.appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
    });


    document.getElementById('test-offer').addEventListener('click', () => {
        makeCall();
    });
    socket.on('offer', offer => handleOffer(offer));
    socket.on('answer', answer => handleAnswer(answer));
    socket.on('candidate', candidate => handleCandidate(candidate));

    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');

    const peerConnection = new RTCPeerConnection();
    let localStream;
    navigator.mediaDevices.getUserMedia({audio: true, video: true}).then( function(stream) {
        localStream = stream;
        localVideo.srcObject = stream;
        peerConnection.ontrack = e => remoteVideo.srcObject = e.streams[0];
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    });
    peerConnection.addEventListener('icecandidate', e => {
        if(e.candidate) {
            socket.emit('candidate', e.candidate);
        }
    });
    peerConnection.addEventListener('connectionstatechange', e => {
        if(peerConnection.connectionState === 'connected') {
            console.log('Peers Connected');
        }
    })

    async function makeCall() {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer);
    }
    async function handleOffer(offer) {
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer);
    }
    async function handleAnswer(answer) {
        await peerConnection.setRemoteDescription(answer);
    }
    async function handleCandidate(candidate) {
        if (!candidate.candidate) {
            await peerConnection.addIceCandidate(null);
        } else {
            await peerConnection.addIceCandidate(candidate);
        }
    }

    document.getElementById('toggle-video').addEventListener('click', () => {
        const videoTrack = localStream.getTracks().find(track => track.kind === 'video');
        if (videoTrack.enabled) {
            videoTrack.enabled = false;
        } else {
            videoTrack.enabled = true;
        }
    });
    document.getElementById('toggle-audio').addEventListener('click', () => {
        const audioTrack = localStream.getTracks().find(track => track.kind === 'audio');
        if (audioTrack.enabled) {
            audioTrack.enabled = false;
        } else {
            audioTrack.enabled = true;
        }
    });
}
