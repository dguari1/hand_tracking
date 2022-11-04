import { toHaveDescription, toHaveStyle } from "@testing-library/jest-dom/dist/matchers";
import { Component, createRef, useState } from "react";
//import { average} from "./utils";
//import { generateAudioBlob } from "./audiobuffertowav";
import  "./WebCamRecord.css";
import fixWebmDuration from "fix-webm-duration";

const FRAMES_TO_SKIP = 5; // this variable set the number of frames skipped during video processing. Five (5) frames seems to be a good compromise between performance and smoothness 
const DEFAULT_MAX_DURATION_TASK = 15; // this variable set the maximum duration of the task.

class WebCamRecord extends Component {
    constructor(props) {
        super(props);
        // variables carried by the state and updated via this.setState()
        this.state = {
            buttonDisabled : true,
            timeKeeper : 0,
        }

        this.videoTag = createRef();
        this.canvasTag = createRef();
        this.progressTag = createRef();
        this.drawFromOffscreenCanvasTag = createRef(); // this canvas receives and renders a bitmap from a worker. The bitmap is a rectangle drawn on top of the video feed.
        this.recordButtonTag = createRef();
        this.saveButtonTag = createRef();

        this.videoDevicesRef = createRef(); // this is a reference to the video devices dropdown menu
        this.devicesButtonRef = createRef(); // this is a reference to the devices button


        this.tick = this.tick.bind(this); // binding this to tick. 
        this.handleClick = this.handleClick.bind(this); // binding this to handleClick. 
        this.loadedData = this.loadedData.bind(this); // binding this to loadedData
        this.stopRecording = this.stopRecording.bind(this); // binding this to stopRecording
        this.handleDataAvailable = this.handleDataAvailable.bind(this); // binding this to handleDataAvailable
        this.saveRecording = this.saveRecording.bind(this); // binding this to saveRecording
        this.drawCounter = this.drawCounter.bind(this); // binding this to drawCounter

        // this.webWorker = null; // this variable will hold the webWorker
        this.currentStream = null; // variable that holds the current stream
        this.currentAudioStream = null; // variable that holds the current audio stream
        this.currentVideoStream = null; // variable that holds the current video stream
        this.timeInterval = null; // variable that holds the time interval
        this.fpsAccumulator = []; // variable that holds the fps values
        this.isValidAccumulator = [] // variable that holds the valid for each analyzed frame values
        this.frameSkip = 0; // variable that holds the number of frames skipped
        this.isFrameValid = null; // variable that holds the status of the current frame

        this.mediaChunks = []; // variable that holds the media chunks

        this.startTime = null; // variable that holds the start time of the recording
        this.duration = null; // variable that holds the end time of the recording
        this.maxDurationTask = 0 // variable that holds the max duration of the task

        this.isSafari = false; // variable that holds the status of the current device
    }

    componentDidMount() {

        // getting access to the webcam
        // navigator.mediaDevices.getUserMedia(CAPTURE_CONSTRAINTS)
        // .then(stream =>  {
        //     const video = this.videoTag.current;
        //     video.srcObject = stream;
        //     this.currentStream = stream;
        //     this.currentAudioStream = new MediaStream(stream.getAudioTracks())
        //     this.currentVideoStream = new MediaStream(stream.getVideoTracks())
        // } ).catch(err => console.log('error with stream', err))
        this.isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
        this.updateDevicesList();
        this.createMediaStream();

        // add a listener that will watch for page close event
        window.addEventListener('beforeunload', this.handleCleanUp());

    }

    updateDevicesList = () => {
        //list the avalible devices 
        navigator.mediaDevices.enumerateDevices("input")
        .then(devices => {
            devices.forEach(device => {
                if (device.kind === "videoinput") {
                    this.videoDevicesRef.current.append(new Option(device.label, device.deviceId));
                }
           }
            )
        }
        )
    }

    // function to setup the stream and start the recording
    createMediaStream = () => {

        
        // get the selected video device
        this.videoDevice = this.videoDevicesRef.current.value;

        // variable that defines video constraints 
        const videoConstraints =  { frameRate: { ideal: 30, max: 60 },
                                    width: 1280, //{ min: 640, ideal: 1280, max: 1280 },
                                    height: 720, // { min: 480, ideal: 720, max: 720 },
                                    facingMode: "user" ,
                                    deviceId: this.videoDevice} ;

        // variable that defines audio constraints
        const audioConstraints = {  "sampleSize": 16,
                                    "channelCount": 1,
                                    "sampleRate": 44100,
                                    "echoCancellation": true,
                                    "noiseSuppression": true,
                                    "autoGainControl": false,
                                    "deviceId": this.audioDevice,
                                    };

        const CAPTURE_CONSTRAINTS = { 
                                    video: videoConstraints,
                                    audio : audioConstraints
          };
        // create the stream
        navigator.mediaDevices.getUserMedia(CAPTURE_CONSTRAINTS)
        .then(stream =>  {
            const video = this.videoTag.current;
            video.srcObject = stream;
            this.currentStream = stream;
            // video.setAttribute("playsinlne", true);
        } ).catch(err => console.log(err))
        
        navigator.mediaDevices.ondevicechange = () => {
            this.updateDevicesList();
        }
    }

    componentWillUnmount(){
        this.handleCleanUp();
        // remove the even listener and clean up the stream (again)
        window.removeEventListener('beforeunload', this.handleCleanUp());
        console.log('unmounting was succesful');
      }

    handleCleanUp = () => {
        if (this.currentStream !== null) {
            this.currentStream.getTracks().forEach(track => track.stop());
        }
    }

    tick () {


        this.frameSkip += 1;

        const video = this.videoTag.current;
        const canvas = this.canvasTag.current;

        
        // verify that the image is already loaded into the canvas 
        if (video != null && canvas != null) {
            if (video.videoHeight>0 && video.videoWidth>0) {

                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;   
                const ctx = canvas.getContext("2d")
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(video,0,0,canvas.width, canvas.height);
  

                this.time_end = performance.now();
                let fps = Math.round(this.time_end - this.time_start);
                this.time_start = performance.now();
                
                if (this.mediaRecorder && this.mediaRecorder.state === 'recording'){
                    this.fpsAccumulator.push(fps)
                    this.isValidAccumulator.push(this.isFrameValid)
                }
            }
         }

        requestAnimationFrame(this.tick)

    }

    // run the tick function once data is avaliable
    loadedData () {
        this.tick()
    }
    handleDeviceChange = () => {
        if (this.currentStream !== null) {
            console.log("change")

            window.cancelAnimationFrame(this.animationFrame);
            this.setState({isPlaying: false});
            this.handleCleanUp();
            this.createMediaStream();
            //this.loadWorker()
            this.setState({isPlaying: true});
            this.tick();
    
        }
    }

    // function that handles the click event
    handleClick= event => {
        // clean everything
        this.fpsAccumulator = [];
        this.isValidAccumulator = [];

        if (event.target.value === 'record') {
        var button_record = this.recordButtonTag.current;

        if( button_record.textContent === "Record") {
            if (this.props.parentToChild_taskDuration) {
                this.maxDurationTask = this.props.parentToChild_taskDuration
            } 
            
            if (this.maxDurationTask === 0) {
                this.maxDurationTask = DEFAULT_MAX_DURATION_TASK
            }
            // start recording       
            this.startRecording();

            //reset the time count
            this.setState({
                timeKeeper : 0,
            })
            this.timeInterval = setInterval(this.drawCounter, 1000);
        } else if (button_record.textContent === "Stop") {
            // stop recording 
            this.stopRecording();
            //reset the time count
            this.setState({
                timeKeeper : 0,
            })
            // reset progress bar
            const progress = this.progressTag.current 
            progress.value = 0;
            // delete the Time Interval
            if (this.timeInterval !== null) {
                clearInterval(this.timeInterval);
                this.timeInterval = null;
            }
        }

        } else if (event.target.value === 'save') {
            // save recording 
            this.saveRecording();
        }
    }

    // function to draw the counter
    drawCounter = () => {
        console.log(this.mediaRecorder.state)
        if (this.state.timeKeeper < this.maxDurationTask) {

            const progress = this.progressTag.current 
            progress.value = Math.round(((this.state.timeKeeper+1)/(this.maxDurationTask))*100);


            this.setState((state, props) => ({
                timeKeeper : state.timeKeeper+1,
            }));
        } else  {
            // stop recording 
            this.stopRecording();
            // reset the time counter
            this.setState({
                timeKeeper : 0,
            })
            clearInterval(this.timeInterval);
            this.timeInterval = null;
            // reset progress bar
            const progress = this.progressTag.current 
            progress.value = 0;
        }
    }


    // function that starts the recording
    startRecording = () => {

        try {
            if (this.isSafari) {
                this.mediaRecorder = new MediaRecorder(this.currentStream, {mimeType: "video/mp4; codecs:avc1, mp4a"});
            } else {
                this.mediaRecorder = new MediaRecorder(this.currentStream, {mimeType: "video/webm; codecs:vp09, opus"});
            }
            console.log(this.mediaRecorder.mimeType)
            
          } catch (e) {
            console.error('Exception while creating MediaRecorder:', e);
            return;
          }
          this.mediaRecorder.onstart = (event) => {
                this.startTime = performance.now();
                this.recordButtonTag.current.textContent = "Stop";
          }
          this.mediaRecorder.onstop = (event) => {
              if (this.startTime !== null) {
                    this.duration = performance.now()-this.startTime;
                }
                this.recordButtonTag.current.textContent = "Record";
                console.log('Recorder stopped: ', event);
                console.log('Recorded Blobs: ', this.mediaChunks);
                // save the recording when stopped
                this.saveRecording();
          };
          this.mediaRecorder.ondataavailable = this.handleDataAvailable;
          this.mediaRecorder.start();
          console.log('MediaRecorder started', this.mediaRecorder);

    }
    // function that stops the recording
    stopRecording () {
        // stop the recorder
        this.mediaRecorder.stop();
        // save the recording
        // change the state of the save button 
        this.setState({buttonDisabled: false});
        
    }

    handleDataAvailable(event) {
        if (event.data && event.data.size > 0) {
            this.mediaChunks.push(event.data);
        }
    }

    saveRecording () {
        console.log('Saving', this.mediaChunks)
        var blob = null
        if (this.isSafari) {
            blob = new Blob(this.mediaChunks, {type: "video/mp4; codecs:avc1, mp4a"}); 
        } else {
            blob = new Blob(this.mediaChunks, {type: "video/webm; codecs:vp09, opus"}); 
        }
        this.mediaChunks = [];
        fixWebmDuration(blob, this.duration, (fixedBlob) => {  // fix the duration of the video
            // send data to the parent component
            console.log('fixedBlob', fixedBlob)
            const url = URL.createObjectURL(fixedBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            if (this.isSafari) {
                a.download = 'recording.mp4';
            } else {
                a.download = 'recording.webm';
            }
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
        }
        );
        // reset the storage for the next recording
        this.mediaChunks = [];
    }


    render() {
        return (
            <div className="vslp-webcam">
            <center>
            <div className="form" style={{margin: "auto", marginTop: "10px", marginBottom: "10px"}}>
            <label>Video Devices: </label>
            <select id="video-devices" className="custom-select" ref = {this.videoDevicesRef} onChange={this.handleDeviceChange}></select>
            </div>
            
             <figure className="figure">
             <div style={{position:"relative"}}> 
                  <video 
                    ref = {this.videoTag}
                    autoPlay
                    muted
                    onLoadedData= {this.loadedData} //what to do once data in avaliable in video
                    style = {{
                        zIndex : 1 //video is shown in layer 1 (layer 0 is a hidden canvas)
                    }}
                />
                <canvas 
                    ref={this.canvasTag}
                    style={{
                        zIndex : 0 // This canvas is under everything else 
                    }}
                />
                <canvas 
                    ref={this.drawFromOffscreenCanvasTag}
                    style ={{
                        zIndex : 2 // this canvas is in layer 2
                    }}
                />     
                <button id='buttonFigure' type="button" value='record' ref={this.recordButtonTag} onClick={this.handleClick} >Record</button>
                </div>
                <figcaption>
                    <p> </p>

                <progress ref = {this.progressTag} max="100" value="0">Progress</progress>
                </figcaption>
                </figure>
                <button type="button" value='save' ref={this.saveButtonTag}  onClick={this.handleClick} disabled={this.state.buttonDisabled}>Save</button>

                
        
        </center>
            </div>
        );
    }


}

export default WebCamRecord;