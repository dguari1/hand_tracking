import { toHaveDescription, toHaveStyle } from "@testing-library/jest-dom/dist/matchers";
import { click } from "@testing-library/user-event/dist/click";
import { Component, createRef, useState } from "react";
import  "./WebCamRecord.css";

class VideoAnalysis extends Component {
    constructor(props) {
        super(props);
        // variables carried by the state and updated via this.setState()
        this.state = {
            buttonDisabled : false,
            timeKeeper : 0,
        }

        this.videoTag = createRef();
        this.canvasTag = createRef();
        this.progressTag = createRef();
        this.drawFromOffscreenCanvasTag = createRef(); // this canvas receives and renders a bitmap from a worker. The bitmap is a rectangle drawn on top of the video feed.
        this.processButtonTag = createRef();
        this.loadButtonTag = createRef();
        this.loadingAnimation = createRef();

        this.videoDevicesRef = createRef(); // this is a reference to the video devices dropdown menu
        this.devicesButtonRef = createRef(); // this is a reference to the devices button

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

        this.inputFile = createRef(); // this is a reference to the input file
    }

    componentDidMount() {
        this.isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
        //window.addEventListener('beforeunload', this.handleCleanUp());

    }

    componentWillUnmount = () => {
        // remove the even listener and clean up the stream (again)
        //window.removeEventListener('beforeunload', this.handleCleanUp());
        console.log('unmounting was succesful');
      }


    tick = () =>  {
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
    loadedData = () =>  {
        // this.tick()
        console.log('loaded data')
    }

    // function that handles the click event
    handleClick = event => {
        const clickedButton = event.target.value;
        switch (clickedButton) {
            case 'load':
                this.inputFile.current.click();
                break;
            case 'process':
                this.processVideo();
                break;
            default:
                break;
        }
    }

    processVideo = () => {
        this.setState({
            buttonDisabled : true,
        })
        this.startTime = performance.now();
        this.duration = this.maxDurationTask;
        this.timeInterval = setInterval(this.processVideoFrame, 1000);
    }

    fileUpload = (event) => {
        const file = event.target.files[0];

        let reader = new FileReader();
        reader.onload = (e) => {
            this.videoTag.current.src = e.target.result;
        }

        reader.onloadstart = (e) => {
            this.videoTag.current.style.display = 'none';
            this.loadingAnimation.current.style.display = 'block';
        }
        // reader.onprogress = function(event) {
        //     if (event.lengthComputable) {
        //         if (LoadingBarVisible)
        //             ShowLoadingBar();
        //         AddProgress();
        //     }
        // };
        reader.onloadend = (e) => {
            this.videoTag.current.style.display = 'block';
            this.loadingAnimation.current.style.display = 'none';
        };

        reader.onerror = function(event) {
            console.log(event.target.error);
        };
        reader.readAsDataURL(file);
    }




    render() {
        return (
            <div className="vslp-webcam">
            <center>
            <figure className="figure" style={{width:'50%'}}>
                  <video 
                    ref = {this.videoTag}
                    autoPlay = {false}
                    controls
                    onLoadedData= {this.loadedData} //what to do once data in avaliable in video
                    style = {{
                        zIndex : 1, //video is shown in layer 1 (layer 0 is a hidden canvas)
                        display :  'block'
                        
                    }}
                />

                <div className="loader" ref={this.loadingAnimation} style={{display:'none', width : '50%', height:'50%'}}></div>
                
                </figure>
                <figcaption>
                    <p> </p>
                </figcaption>
                <input type='file' id='file' ref={this.inputFile} onChange={this.fileUpload} style={{display: 'none'}}/>
                <button type="button" value='load' ref={this.loadButtonTag}  onClick={this.handleClick} buttonDisabled={this.state.buttonDisabled}>Load Video</button>
                <button type="button" value='process' ref={this.processButtonTag}  onClick={this.handleClick} buttonDisabled={this.state.buttonDisabled}>Process Video</button>


                
        
        </center>
            </div>
        );
    }


}

export default VideoAnalysis;