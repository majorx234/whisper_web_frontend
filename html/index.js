const webSocketConnect = document.getElementById('webSocketConnect');
const webSocketDisconnect = document.getElementById('webSocketDisconnect');
const startRecord = document.getElementById('startRecord');
const stopRecord = document.getElementById('stopRecord');
const recordedAudio = document.getElementById('recordedAudio');
const audioDownload = document.getElementById('audioDownload');
const audioSource = document.getElementById('audioSource');

const audioInputSelect = document.querySelector('select#audioSource');
const selectors = [audioInputSelect];
document.getElementById('websocketUrl').value = 'ws://localhost:4000/ws'
var websocket = null;
var pingInterval = null;
var counter = 0;

function gotDevices(deviceInfos) {
    // Handles being called several times to update labels. Preserve values.
    const values = selectors.map(select => select.value);
    selectors.forEach(select => {
        while (select.firstChild) {
            select.removeChild(select.firstChild);
        }
    });
    for (let i = 0; i !== deviceInfos.length; ++i) {
        const deviceInfo = deviceInfos[i];
        const option = document.createElement('option');
        option.value = deviceInfo.deviceId;
        if (deviceInfo.kind === 'audioinput') {
            option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
            audioInputSelect.appendChild(option);
        }
    }
    selectors.forEach((select, selectorIndex) => {
        if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
            select.value = values[selectorIndex];
        }
    });
}

function gotStream(stream) {
    window.stream = stream; // make stream available to console

    rec = new MediaRecorder(stream);
    rec.ondataavailable = e => {
        audioChunks.push(e.data);
        if(websocket.readyState){
            websocket.send(e.data);
        }/*
        if (rec.state == "inactive"){
            let blob = new Blob(audioChunks,{type:'audio/x-mpeg-3'});
            recordedAudio.src = URL.createObjectURL(blob);
            recordedAudio.controls=true;
            recordedAudio.autoplay=true;
            audioDownload.href = recordedAudio.src;
            audioDownload.download = 'mp3';
            audioDownload.innerHTML = 'download';
        }*/
    }
}

function handleError(error) {
    console.log('navigator.MediaDevices.getUserMedia error: ', error.message, error.name);
}

function start() {
    // Second call to getUserMedia() with changed device may cause error, so we need to release stream before changing device
    if (window.stream) {
        stream.getAudioTracks()[0].stop();
    }

    const audioSource = audioInputSelect.value;

    const constraints = {
        audio: {deviceId: audioSource ? {exact: audioSource} : undefined}
    };

    navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(handleError);
}

audioInputSelect.onchange = start;

startRecord.onclick = e => {
    startRecord.disabled = true;
    stopRecord.disabled = false;
    audioChunks = [];
    rec.start(200);
}

stopRecord.onclick = e => {
    startRecord.disabled = false;
    stopRecord.disabled = true;
    rec.stop();
}

webSocketConnect.onclick = e => {
    webSocketConnect.disabled = true;
    webSocketDisconnect.disabled = false;
    // connect to websocket
    websocket = new WebSocket(document.getElementById('websocketUrl').value);
    websocket.addEventListener("open", () => {
        console.log("CONNECTED");
        pingInterval = setInterval(() => {
            console.log(`SENT: ping: ${counter}`);
            websocket.send("ping");
        }, 1000);
    });
}
webSocketDisconnect.onclick = e => {
    webSocketConnect.disabled = false;
    webSocketDisconnect.disabled = true;
    if (websocket) {
        console.log("CLOSING");
        websocket.close();
        websocket = null;
        if(pingInterval){
            window.clearInterval(pingInterval);
        }
    }
    // TODO disconnect to websocket server
}

navigator.mediaDevices.enumerateDevices()
    .then(gotDevices)
    .then(start)
    .catch(handleError);


document.addEventListener('DOMContentLoaded', (event) => {
    // init();
});
