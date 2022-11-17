import React, { Component, createRef, useState, useEffect, useMemo, useCallback } from "react";
import { average, getStandardDeviation} from "./utils";
import { videoProcess } from "./videoProcess";
import  "./VideoLoadScreen.css";

import ShowResults from "./ShowResults.js"

import TimelinePlugin from "wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js";
import CursorPlugin from "wavesurfer.js/dist/plugin/wavesurfer.cursor.min.js";
import RegionsPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions.min.js';
// import { wait } from "@testing-library/user-event/dist/utils";
// import { toHaveStyle } from "@testing-library/jest-dom/dist/matchers";
// import { TbRectangle } from "react-icons/tb";
// import CustomWavesurfer from "./CustomWaveSurfer";
// import '@mediapipe/pose';


// import * as poseDetection from '@tensorflow-models/pose-detection'
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import { toHaveDisplayValue, toHaveStyle } from "@testing-library/jest-dom/dist/matchers";
//import { toHaveStyle } from "@testing-library/jest-dom/dist/matchers";
const WaveSurfer = require("wavesurfer.js");
// const pixelmatch = require('pixelmatch');


class VideoLoadScreen extends Component {
    constructor(props) {
        super(props);
        this.state = {
            videoWidth : '50%',
            mouseDown : false,
            rectangle : null,
            cancelled : false,
            showResults : false,
            fileName : null,
        }


        this.waveSurferRef = createRef();
        this.waveFormRef = createRef();
        this.timeLineRef = createRef();
        this.videoRef = createRef();
        this.figureRef = createRef();
        this.canvasRef = createRef();
        this.canvasRefA = createRef();
        this.canvasRefB = createRef();

        this.secondVideoRef = createRef()

        this.loadButtonTag = createRef();
        this.processVideoButtonTag =  createRef();


        this.inputFile = createRef();

        //buttons
        this.previousFrame = createRef();
        this.previousFrame_5 = createRef();
        this.playVideo = createRef();
        this.nextFrame = createRef();
        this.nextFrame_5 = createRef();
        this.removeButtonTag = createRef()
        this.checkboxRef = createRef();

        //variables 
        this.mouseDown = false;
        this.startX = null;
        this.startY = null;
        this.endWidth = null;
        this.endHeight = null;

        // management of regions
        this.regions = [];
        this.currentRegion = 0;
        this.processVideos = false
        this.coordsVideo = [];

        // finding the frame rate
        this.previousTime = 0; 
        this.previousFrame = 0
        this.frameCounter = 0; 
        this.arrayFrameRate = [ ]; // array that holds the frame rate estimates
        this.estimatedFrameRate = 0; // variable that holds the estimated frame rate

        //webworker
        //this.webWorker = null; // this variable will hold the webWorker
        //this.workerModelIsReady = false; // this variable will hold the status of the workerModelIsReady
        this.poseModelReady = false;
        this.handsModelReady = false;

        //models 
        this.poseDetector = null; //
        this.handsDetector = null; //

        //this variable will store the estimated distnace between thumb and index 
        this.distanceThumbIndex = [{leftDistance : [ ],
                                   leftTimeStamp : [ ],
                                   rightDistance : [ ],
                                   rightTimeStamp : [ ]}, 
                                   {leftDistance : [ ],
                                    leftTimeStamp : [ ],
                                    rightDistance : [ ],
                                    rightTimeStamp : [ ]}, 
                                ]


        //this variable will store the landmarks                            
        this.landmarks  = [{landmarksRight : [],
                           timeStampRight : [],
                           landmarksLeft : [],
                           timeStampLeft : [],}, 
                           {landmarksRight : [],
                           timeStampRight : [],
                           landmarksLeft : [],
                           timeStampLeft : [],}]

    }

    componentDidMount = () => {
        document.addEventListener('resize', this.handleResize);
        document.addEventListener('keydown', this.handleKeyPress);

        this.waveSurferRef.current =  WaveSurfer.create({
            barWidth: 1,
            cursorWidth: 1,
            container: this.waveFormRef.current,
            backend: "MediaElement",
            height: 100,
            progressColor: "#4a74a5",//'transparent',//"#4a74a5", //initially transparent to hide the fps estimation
            responsive: true,
            mergeTracks: true,
            //splitChannels: true,
            waveColor:  "#ccc",
            cursorColor: "#4a74a5",//'transparent',//"#4a74a5", //initially transparent to hide the fps estimation
            normalize: true,
            scrollParent: true,
            zoom : true,
            plugins: [
              RegionsPlugin.create({
                regions: this.state.rows, //this.regions,
                dragSelection: {
                  slop: 5
                },
                color: "rgba(197, 180, 227, .25)",
                loop: false,
              }),
                TimelinePlugin.create({
                    wavesurfer: this.waveSurferRef.current,
                    container: this.timeLineRef.current,
                    height: 20,
                    notchWidth: 1,
                    notchMargin: 0.5,
                    notchOffset: 0.5,   
                    timeInterval: 2,
                }),
                CursorPlugin.create({
                    showTime: true,
                    showTimePosition: true,
                    showCursor: true,
                    opacity: 1,
                }),
            ]
          });
        

          // define canvas context 
          this.ctx = this.canvasRef.current.getContext('2d');
          this.ctx.strokeStyle = "red";
          this.ctx.lineWidth = 2;

          // create a way to remove regions by double click and prevent more than two regions
          this.waveSurferRef.current.on('region-dblclick', this.handleRegionDoubleClick)   
          this.waveSurferRef.current.on('region-created', this.handleRegionCreated)

        //   // mount the worker that will process the data +
        //   if (this.webWorker === null) {
        //     console.log('mounting worker')
        //     this.handleMountWorker()
        //   }

        this.handleLoadHandsModels()


    }

    handleLoadHandsModels = async() =>{
        //hand model is always loaded
        this.loadButtonTag.current.disabled = true
        this.canvasRefA.current.height = 240;
        this.canvasRefA.current.width = 240;
        var ctx = this.canvasRefA.current.getContext('2d',{willReadFrequently:true});
        const imageData = ctx.getImageData(0,0,this.canvasRefA.current.width, this.canvasRefA.current.height)

        const detectorConfig = {
            runtime: 'tfjs',
            //runtime: 'mediapipe',
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
            modelType: 'full'
            }
        this.handsDetector = await handPoseDetection.createDetector(handPoseDetection.SupportedModels.MediaPipeHands, detectorConfig);
        //warm up the model
        const hands = await this.handsDetector.estimateHands(imageData)

        console.log('Hands Model Ready')
        this.loadButtonTag.current.disabled = false

    }

    handleLoadPoseModel = async(poseDetection) => {
        //pose model is loaded on demand
        this.loadButtonTag.current.disabled = true
        this.poseDetector = await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, {runtime: 'tfjs', modelType:'lite'})
 
        // //run the model on an empty image to warm it 
        this.canvasRefA.current.height = 240;
        this.canvasRefA.current.width = 240;
        var ctx = this.canvasRefA.current.getContext('2d',{willReadFrequently:true});
        const imageData = ctx.getImageData(0,0,this.canvasRefA.current.width, this.canvasRefA.current.height)
        //warm up the model
        const poses = await this.poseDetector.estimatePoses(imageData)
    
        console.log('Pose Model Ready')
        this.loadButtonTag.current.disabled = false

    }

    // handleMountWorker = () => {

    //     // here we declare a sharedWorker. The worker should have been initialized by the parent component. This will link this
    //     // code to that worker and allow the code to use it. If the parent didn't initialize the SharedWorker, then it will be initialized here
    //     // this.webWorker = new window.Worker(new URL("/workers/runningModel_worker.js", import.meta.url), { type: "module" })
    //     // this.webWorker = new window.Worker(new URL("/workers/runningModel_worker.js", import.meta.url))
    //     this.webWorker = new window.Worker(new URL("/public/runningTensorFlowModel_worker.js", import.meta.url))
    //     this.webWorker.onerror = function(event) {
    //         console.log('There is an error with your worker!', event);
    //       }
    //     // create a connection (port) with the SharedWorker so that we can send work to it
    //     // this.webWorker.port.start();
    //     // ask the worker to load the model
        
    //     this.webWorker.postMessage({msg: 'init'})
        
    //     this.webWorker.onmessage = (event) => {
 
    //         if ((event.data.poseModelReady) && (event.data.handsModelReady)){
    //             this.poseModelReady = true;
    //             this.handsModelReady = true;
    //         }


    //     }
        
    // }

    handleLoadedData = () =>{

        this.videoRef.current.play();
        this.videoRef.current.requestVideoFrameCallback(this.findFrameRate)
        // 
    }

    handleRegionDoubleClick = (region) => {
        //remove the region when double click on it :->
        this.waveSurferRef.current.regions.list[region.id].remove()

    }

    handleRegionCreated = (region) => {
        // if there are more than two regions, then prevent more regions from being added
        let regions = this.waveSurferRef.current.regions.list;
        let keys = Object.keys(regions)
        if (keys.length >= 2) {
            regions[keys[0]].remove()
            alert("You can only create two regions")
        }

    }

    componentWillUnmount = () => {
        window.addEventListener('beforeunload', (event) => {
            event.preventDefault();
            document.removeEventListener('keydown', this.handleKeyPress);
            window.removeEventListener('resize', this.handleResize);
            this.webWorker.terminate();
            console.log('unmounting')
       })
    }

    handleResize = () => {
        // Handle resize of waveform when window is changed 
        this.waveSurferRef.current.drawer.containerWidth = this.waveSurferRef.current.container.clientWidth;
        this.waveSurferRef.current.drawBuffer();
    }

    handleKeyPress = (event) => {
        // Handle key press
        switch (event.key) {
            case 'ArrowLeft':
                if (event.shiftKey) {
                    // Shift + ArrowLeft
                    this.handleMoveBackward(5)
                } else {
                    // ArrowLeft
                    this.handleMoveBackward(1)
                }
                break;
            case 'ArrowRight':
                if (event.shiftKey) {
                    // Shift + ArrowLeft
                    this.handleMoveForward(5)
                } else {
                    // ArrowLeft
                    this.handleMoveForward(1)
                }
                break;
            default:
                break;
        }

    }

    handleClick = (event) => {
        switch (event.target.value) {
            case 'previousFrame':
                this.handleMoveBackward(1)  
                break;
            case 'previousFrame_5':
                this.handleMoveBackward(5);
                break;
            case 'nextFrame':                 
                this.handleMoveForward(1);
                break;
            case 'nextFrame_5':
                this.handleMoveForward(5);
                break;
            case 'Play':
                if(this.playVideo.current.textContent === 'Play')  {
                    this.handlePlay()
                } else {
                    this.handlePause()
                }
                break;
            case 'load':
                this.inputFile.current.click();
                break;
            case 'processVideo':
                if (this.processVideoButtonTag.current.innerHTML === 'Process'){

                    this.processVideoButtonTag.current.innerHTML = 'Cancel'
                    this.handlePause()
                    this.handleProcessVideo();

                } else {
                    // cancel
                    
                    this.setState({cancelled: true},
                        () => {
                        this.processVideoButtonTag.current.innerHTML = 'Process'
                    })
                }
                

                break;
            case 'remove':
                this.mouseDown = false;
                this.startX = null;
                this.startY = null;
                this.endWidth = null;
                this.endHeight = null;
                this.setState({rectangle:null})
                this.ctx.clearRect(0,0,this.canvasRef.current.width, this.canvasRef.current.height)
                this.removeButtonTag.current.style.visibility = 'hidden';
                break;
            default:
                break;
        }
    }

    handleMoveBackward = (nFrames) => {
        // Move video backward
        if(this.videoRef.current !== null) {
            if ( this.estimatedFrameRate > 0) {
                const proposedTime = this.videoRef.current.currentTime - nFrames/this.estimatedFrameRate;
                if (proposedTime >= 0) {
                    this.handlePause();
                    this.videoRef.current.currentTime = proposedTime;
                } else {
                    this.handlePause();
                    this.videoRef.current.currentTime = 0;
                }
            }
        }
    }

    handleMoveForward = (nFrames) => {
        // Move video forward
        if(this.videoRef.current !== null) {
            if ( this.estimatedFrameRate > 0) {
                const proposedTime = this.videoRef.current.currentTime + nFrames/this.estimatedFrameRate;
                if (proposedTime <= this.videoRef.current.duration) {
                    this.handlePause();
                    this.videoRef.current.currentTime = proposedTime;
                } else {
                    this.handlePause();
                    this.videoRef.current.currentTime = this.duration;
                }
            }
        }
    }

    handlePause = () => {
        this.videoRef.current.pause();
        this.playVideo.current.textContent = 'Play';
    }

    handlePlay = () => {
        this.videoRef.current.play();
        this.playVideo.current.textContent = 'Pause';     
    }

    handleZoomChange = (event) => {
        this.setState({
            videoWidth: event.target.value
        })
    }

    fileUpload = (event) => {
        const file = event.target.files[0];

        let reader = new FileReader();
        reader.onload = (e) => {
            this.videoRef.current.src = e.target.result;
        }

        reader.onloadstart = (e) => {
            //this.videoRef.current.poster = 'loading-gif2.gif'
            this.loadButtonTag.current.disabled = true;
            this.processVideoButtonTag.current.disabled = true;
            this.playVideo.current.disabled = true;
            
        }
        // reader.onprogress = function(event) {
        //     if (event.lengthComputable) {
        //         if (LoadingBarVisible)
        //             ShowLoadingBar();
        //         AddProgress();
        //     }
        // };
        reader.onloadend = (e) => {  
           this.waveSurferRef.current.load(this.videoRef.current);
           // this.videoRef.current.setAttribute('controls', 'true')

            this.loadButtonTag.current.disabled = false;
            this.processVideoButtonTag.current.disabled = false;
            this.playVideo.current.disabled = false;
            
        };

        reader.onerror = function(event) {
            alert("Loading Failed\nThis App only supports .webm and .mp4 files.");
            console.log(event.target.error);
        };
        reader.readAsDataURL(file);
        this.setState({fileName : file.name})

    }

    getMousePosition = (event,canvas) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width/rect.width
        const scaleY = canvas.height/rect.height

        return {
            x: (event.clientX - rect.left)*scaleX,
            y: (event.clientY - rect.top)*scaleY
        }
    }

    handleMouseDown = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (this.state.rectangle == null) {
            this.mouseDown = true
            var pos = this.getMousePosition(event, this.canvasRef.current)
            this.startX = parseInt(pos.x)
            this.startY = parseInt(pos.y)
        }
    }

    handleMouseUp = (event) =>{
        event.preventDefault();
        event.stopPropagation();

        if (this.mouseDown) {
            this.mouseDown = false
            this.ctx.clearRect(0,0,this.canvasRef.current.width, this.canvasRef.current.height)
            //check that the user moved left to right
            var pos = this.getMousePosition(event, this.canvasRef.current)
            if (pos.x > this.startX) {                      
                this.ctx.strokeRect(this.startX, this.startY, this.endWidth,this.endHeight)
                this.setState({rectangle : {x1:this.startX,
                                            y1:this.startY,
                                            x2:this.startX+this.endWidth, 
                                            y2:this.startY+this.endHeight, 
                                            }
                            })

                this.removeButtonTag.current.style.visibility = 'visible'
                this.removeButtonTag.current.style.top = (this.startY/this.canvasRef.current.height)*100 + '%'
                this.removeButtonTag.current.style.left = (this.startX/this.canvasRef.current.width)*100 + '%'
            }
        }       
    }

    handleMouseMove = (event) => {
        event.preventDefault();
        event.stopPropagation();

       if (this.mouseDown){
            var pos = this.getMousePosition(event, this.canvasRef.current)
            const widthRect = parseInt(pos.x) - this.startX
            const heightRect = parseInt(pos.y) - this.startY

            this.ctx.clearRect(0,0,this.canvasRef.current.width, this.canvasRef.current.height)

            this.ctx.strokeRect(this.startX, this.startY, widthRect,heightRect)
            // console.log(parseInt(event.clientX - this.offsetX), parseInt(event.clientY - this.offsetY))
            
            this.endWidth = widthRect;
            this.endHeight = heightRect;
        }

    }

    handleProcessVideo = async () =>  {

        this.setState({showResults:false})
        //load pose mode if needed
        if (this.checkboxRef.current.checked) {
            if (this.poseDetector === null) { // no pose model, load it 
                import ("@tensorflow-models/pose-detection").then(poseDetection =>{
                    this.handleLoadPoseModel(poseDetection)
                });
            }
        }

        //reset variables 
        //this variable will store the estimated distnace between thumb and index 
        this.distanceThumbIndex = [{leftDistance : [ ],
                                    leftTimeStamp : [ ],
                                    rightDistance : [ ],
                                    rightTimeStamp : [ ]}, 
                                    {leftDistance : [ ],
                                    leftTimeStamp : [ ],
                                    rightDistance : [ ],
                                    rightTimeStamp : [ ]}, ]


        //this variable will store the landmarks                            
        this.landmarks  = [{landmarksRight : [],
                            timeStampRight : [],
                            landmarksLeft : [],
                            timeStampLeft : [],}, 
                            {landmarksRight : [],
                            timeStampRight : [],
                            landmarksLeft : [],
                            timeStampLeft : [],}]

        // only works if there is a video
        this.handlePause()
        if (this.videoRef.current) {
            if (this.state.rectangle !== null) {            
                var x1 = parseInt((this.state.rectangle.x1 / this.canvasRef.current.width) * this.videoRef.current.videoWidth);
                var y1 = parseInt((this.state.rectangle.y1 / this.canvasRef.current.height) * this.videoRef.current.videoHeight);
                var x2 = parseInt((this.state.rectangle.x2 / this.canvasRef.current.width) * this.videoRef.current.videoWidth);
                var y2 = parseInt((this.state.rectangle.y2 / this.canvasRef.current.height) * this.videoRef.current.videoHeight);
            } else {
                var x1 = parseInt(0);
                var y1 = parseInt(0);
                var x2 = parseInt(this.videoRef.current.videoWidth);
                var y2 = parseInt(this.videoRef.current.videoHeight);
            }

            this.coordsVideo = [x1,x2,y1,y2]

            this.regions = []
            this.currentRegion = 0 
            Object.keys(this.waveSurferRef.current.regions.list).forEach((id) => {

                this.regions.push({'start': this.waveSurferRef.current.regions.list[id].start,
                              'end' : this.waveSurferRef.current.regions.list[id].end,
                            })
                        })

            if (this.regions.length === 0) {

                this.regions.push({'start': 0,
                              'end' : this.videoRef.current.duration,
                            })

            }

            this.processVideos = true
            // no cancel
            this.setState({cancelled: false})
            this.currentRegion = 0 

            this.videoRef.current.currentTime = this.regions[this.currentRegion].start;

        }
    }

    // videoFrames = async(now, metadata) => {

    //     var video = this.videoRef.current
    //     var ctxA = this.getFrameImageData(video, this.canvasRefA.current)
    //     const imageData = ctxA.getImageData(0,0,this.canvasRefA.current.width, this.canvasRefA.current.height)
    //     const poses = await this.poseDetector.estimatePoses(imageData)
    //     console.log(poses)
    //     console.log(metadata.mediaTime)
    //     await this.videoRef.current.requestVideoFrameCallback(this.videoFrames)

    // }

    getFrameImageData = (video,canvas) =>{

        
        var heightCanvas = this.coordsVideo[3] - this.coordsVideo[2];
        var widthCanvas = this.coordsVideo[1] - this.coordsVideo[0]
        canvas.height = heightCanvas ;
        canvas.width = widthCanvas;
        var ctx = canvas.getContext('2d',{willReadFrequently:true});
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, this.coordsVideo[0], this.coordsVideo[2] , widthCanvas, heightCanvas, 0, 0, widthCanvas , heightCanvas);
        return ctx
    }

    getHandLandmarks = async(handCenter, shoulder, ctx) =>{

        const distanceHandShoulderX = Math.abs(handCenter[0] - shoulder[0])
        const handImageData = ctx.getImageData(Math.round(handCenter[0] - distanceHandShoulderX),
                                         Math.round(handCenter[1] - distanceHandShoulderX),
                                         Math.round(2*distanceHandShoulderX),                   
                                         Math.round(2*distanceHandShoulderX)) 
        
        const estimationConfig = {flipHorizontal: true};
        const handLandmarks = await this.handsDetector.estimateHands(handImageData, estimationConfig)

        return handLandmarks
    }

    getDistanceThumbIndex = (landmakrs) => {

        function distanceBetweenPoints (pointA, pointB) {
            let x = pointA.x - pointB.x;
            let y = pointA.y - pointB.y;
            let z = pointA.z - pointB.z
            return Math.sqrt(x*x + y*y + z*z)
        }

        return 0.7*distanceBetweenPoints(landmakrs[8], landmakrs[4]) + 0.2*distanceBetweenPoints(landmakrs[7], landmakrs[3])+ 0.1*distanceBetweenPoints(landmakrs[6], landmakrs[2])

    }
    // callback that will be activated every time a seeking event ends
    handleSeeked = async(event) => {

        if ((this.processVideos) && !(this.state.cancelled)) {
            //send data to the worker to be processed 
            var video = this.videoRef.current
            var ctxA = this.getFrameImageData(video, this.canvasRefA.current)
            const imageData = ctxA.getImageData(0,0,this.canvasRefA.current.width, this.canvasRefA.current.height)
            //check if the models are ready 


            if (this.handsDetector !== null) {
                if ((this.checkboxRef.current.checked) && (this.poseDetector !== null))  // user selected to process the full body and there is a pose detection model 
                { //
                    const pose = await this.poseDetector.estimatePoses(imageData)
                    if (pose.length === 1) // the model detected one person in the scene
                    {
                        var handCenterLeft = [(pose[0].keypoints[15].x + pose[0].keypoints[17].x + pose[0].keypoints[19].x + pose[0].keypoints[21].x)/4 , (pose[0].keypoints[15].y + pose[0].keypoints[17].y + pose[0].keypoints[19].y + pose[0].keypoints[21].y)/4 ]
                        var handCenterRight = [(pose[0].keypoints[16].x + pose[0].keypoints[18].x + pose[0].keypoints[20].x + pose[0].keypoints[22].x)/4 , (pose[0].keypoints[16].y + pose[0].keypoints[18].y + pose[0].keypoints[20].y + pose[0].keypoints[22].y)/4 ]

                        var shoulderLeft =  [pose[0].keypoints[11].x, pose[0].keypoints[11].y]
                        var shoulderRight =  [pose[0].keypoints[12].x, pose[0].keypoints[12].y]

                        // landmarks left hand -- store everything for later use
                        var handLandmarksLeft = await this.getHandLandmarks(handCenterLeft, shoulderRight, ctxA)
                        if (handLandmarksLeft.length === 1) {
                            this.distanceThumbIndex[this.currentRegion].leftDistance.push(this.getDistanceThumbIndex(handLandmarksLeft[0].keypoints3D))
                            this.distanceThumbIndex[this.currentRegion].leftTimeStamp.push(video.currentTime)
                            this.landmarks[this.currentRegion].landmarksLeft.push(handLandmarksLeft)
                            this.landmarks[this.currentRegion].timeStampLeft.push(video.currentTime)
                        }
                        // landmarks right hand -- store everything for later use
                        var handLandmarksRight = await this.getHandLandmarks(handCenterRight, shoulderLeft, ctxA)
                        if (handLandmarksRight.length === 1) {
                            this.distanceThumbIndex[this.currentRegion].rightDistance.push(this.getDistanceThumbIndex(handLandmarksRight[0].keypoints3D))
                            this.distanceThumbIndex[this.currentRegion].rightTimeStamp.push(video.currentTime)
                            this.landmarks[this.currentRegion].landmarksRight.push(handLandmarksRight)
                            this.landmarks[this.currentRegion].timeStampRight.push(video.currentTime)
                        }
                    
                    } else
                    // if 0 or more than 1 person are detected then stop and alert the user
                     {if (pose.length === 0) {
                        alert('No person found')
                        this.setState({cancelled: true},
                            () => {
                            this.processVideoButtonTag.current.innerHTML = 'Process'
                        })
                     } else if (pose.lenght > 1){
                        alert('More than one person found')
                        this.setState({cancelled: true},
                            () => {
                            this.processVideoButtonTag.current.innerHTML = 'Process'
                        })
                       }}

                }  else // user selected to process only the hands
                {   
                    const estimationConfig = {flipHorizontal: true };
                    const handLandmarks = await this.handsDetector.estimateHands(imageData, estimationConfig)
                    if (handLandmarks) {
                        handLandmarks.forEach(item => {
                            if (item.handedness === 'Right') {
                                this.distanceThumbIndex[this.currentRegion].rightDistance.push(this.getDistanceThumbIndex(item.keypoints3D))
                                this.distanceThumbIndex[this.currentRegion].rightTimeStamp.push(video.currentTime)
                                this.landmarks[this.currentRegion].landmarksRight.push(item)
                                this.landmarks[this.currentRegion].timeStampRight.push(video.currentTime)
                            } else {
                                this.distanceThumbIndex[this.currentRegion].leftDistance.push(this.getDistanceThumbIndex(item.keypoints3D))
                                this.distanceThumbIndex[this.currentRegion].leftTimeStamp.push(video.currentTime)
                                this.landmarks[this.currentRegion].landmarksLeft.push(item)
                                this.landmarks[this.currentRegion].timeStampLeft.push(video.currentTime)
                            }
                        })
                    } else {
                        alert('No hands detected')
                        this.setState({cancelled: true},
                            () => {
                            this.processVideoButtonTag.current.innerHTML = 'Process'
                        })
                    }

                }          

            }

            var desiredVideoTime = video.currentTime + (1/this.estimatedFrameRate)

            if (desiredVideoTime < video.duration){

                if (desiredVideoTime < this.regions[this.currentRegion].end){

                    video.currentTime = desiredVideoTime
                } else {

                    if (this.currentRegion < this.regions.length - 1) {
                        this.currentRegion++
                        video.currentTime = this.regions[this.currentRegion].start
                    } else {
                        // the process is finished 
                        this.setState({cancelled: true},
                            () => {
                            this.processVideoButtonTag.current.innerHTML = 'Process'
                            this.handleFinishProcessingVideo()
                        })
                    }
                }

            }
    }

    }

    handleFinishProcessingVideo = () => {

        console.log('landmarks', this.landmarks)
        console.log('distance', this.distanceThumbIndex)
        this.setState({showResults:true})

    }

    findFrameRate = (now, metadata) => {

        if (metadata.presentedFrames <= 5) {
            this.previousFrame = metadata.presentedFrames
            this.previousTime = metadata.mediaTime
            this.videoFrameCallbackRef = this.videoRef.current.requestVideoFrameCallback(this.findFrameRate)

        } else {

        const video = this.videoRef.current;
        const currentVideoTime = metadata.mediaTime
        const currentVideoFrame = metadata.presentedFrames



        if (currentVideoTime !== this.previousTime){
            // console.log(1/(currentVideoTime-this.previousTime))
            this.arrayFrameRate.push(Math.abs(currentVideoFrame-this.previousFrame)/Math.abs(currentVideoTime-this.previousTime))
            this.previousTime = currentVideoTime  
            this.previousFrame = currentVideoFrame
        }
        // console.log(metadata.mediaTime, metadata.presentedFrames)
        if ((video.currentTime < video.duration) && (video.currentTime <=  1))
        {
            this.frameCounter++
            this.videoFrameCallbackRef = this.videoRef.current.requestVideoFrameCallback(this.findFrameRate)
            
        } else {

            this.handlePause()
            this.estimatedFrameRate = average(this.arrayFrameRate);
            console.log(this.estimatedFrameRate);
            this.frameCounter = 0;
            video.currentTime = 0;
            video.muted = false;      
        }
        }


    }

    handleMouseDown2 = (event) => {
        //get mouse position in canvas when click
        event.preventDefault();
        event.stopPropagation();
        var pos = this.getMousePosition(event, this.canvasRefA.current)
        console.log(pos)
    }

    render () {
        return(

            <div className="container">

                <center>

                <div className="figureheader">
                    <input type='file' id='file' ref={this.inputFile} onChange={this.fileUpload} style={{display: 'none'}}/>
                    <button style = {{ width:'25%', minWidth:'200px'}} type="button" value='load' ref={this.loadButtonTag}  onClick={this.handleClick} disabled={false}>Load Video</button>
                </div>

                <div className="zoom-selector">
                    <label htmlFor="zoomselect" style={{marginLeft : '10px'}}>Video Size</label>
                    <select id="zoomselect" defaultValue={'50%'} ref={this.zoomSelect} onChange={this.handleZoomChange}>
                        <option value="100%">100%</option>
                        <option value="90%">90%</option>
                        <option value="80%">80%</option>
                        <option value="70%">70%</option>
                        <option value="60%">60%</option>
                        <option value="50%">50%</option>
                        <option value="40%">40%</option>
                        <option value="30%">30%</option>
                        <option value="20%">20%</option>
                        <option value="10%">10%</option>
                    </select>
                </div>

            

            {/* <div className="video-container"> */}
            <figure className="figure" ref={this.figureRef} style = {{
                            width : this.state.videoWidth,
                        }}>
                <video  preload="auto"
                        //src = {this.props.src}
                        ref = {this.videoRef}
                        autoPlay = {false}
                        loop = {false}
                        onLoadedMetadata = {this.handleLoadedData}
                        // onCanPlay = {this.loadedData}
                        // onLoadedData= {this.loadedData} //what to do once data in avaliable in video
                        onPause = {this.handlePause}
                        onPlay = {this.handlePlay}
                        onSeeked = {this.handleSeeked}
                        // onTimeUpdate = {this.handleTimeUpdate}
                /> 
                <canvas
                    ref={this.canvasRef}
                    onMouseDown = {this.handleMouseDown}
                    onMouseUp = {this.handleMouseUp}
                    onMouseMove = {this.handleMouseMove}
                />

                

            <button id='buttonFigure' type="button" value='remove' ref={this.removeButtonTag} onClick={this.handleClick} >x</button>


            </figure>
            {/* </div> */}
            
                
                <div className="btn-toolbar text-center well" style = {{ width:'100%'}}>
                    <button style = {{ width:'15%', minWidth:'75px', maxWidth:'75px'}} type="button " value='previousFrame_5' ref={this.previousFrame_5} onClick={this.handleClick} disabled={false}>-5</button>
                    <button style = {{ width:'15%', minWidth:'75px', maxWidth:'75px'}} type="button" value='previousFrame' ref={this.previousFrame} onClick={this.handleClick} disabled={false}>-1</button>
                    <button style = {{ width:'40%', minWidth:'150px', maxWidth:'150px'}} type="button" value='Play' ref={this.playVideo} onClick={this.handleClick} disabled={false}>Play</button>
                    <button style = {{ width:'15%', minWidth:'75px', maxWidth:'75px'}} type="button" value='nextFrame' ref={this.nextFrame} onClick={this.handleClick} disabled={false}>+1</button>
                    <button style = {{ width:'15%', minWidth:'75px', maxWidth:'75px'}} type="button" value='nextFrame_5' ref={this.nextFrame_5} onClick={this.handleClick} disabled={false}>+5</button>
                </div>
                <div className = "container-waveform" style ={{// position: 'absolute',
                                                    overflow: 'hidden', 
                                                    width: "100%",
                                                    // height: 100,  
                                                    }}>
                    <div  id="waveform" ref={this.waveFormRef} 
                                            style={{ 
                                            position: 'relative', 
                                            //border: "1px solid grey", 
                                            width: "75%", 
                                            height: 100,
                                            margin: "auto", 
                                            marginTop: "10px", 
                                            marginBottom: "10px",
                                            // transform: "translateY(-100%)",
                                            //top: "-50%",
                                        }}/>
                    <div id="wave-timeline" ref={this.timeLineRef} style = {{width: "75%",}}></div>

                </div>

                <div className="process-button">
                    <button style = {{ width:'25%', minWidth:'200px'}}  type="button" value='processVideo' ref={this.processVideoButtonTag} onClick={this.handleClick} disabled={false}>Process</button>
                </div>

                <div className="toggle" style={{display:'inline'}}>
                <label  htmlFor='checkbox' style={{marginTop:'1em'}}>Hands Only </label>
                
                <label className="switch" id ="toggle-button">
                    <input type="checkbox" id='checkbox' ref={this.checkboxRef}/>
                    <span className="slider"> </span>
                </label>

                <label htmlFor='checkbox'> Full Body</label>

                </div>

                

                {this.state.showResults? <ShowResults landmarks = {this.landmarks}
                                                      distanceThumbIndex = {this.distanceThumbIndex}
                                                      coordsRectangleinVideo = {this.coordsVideo}
                                                      frameRate = {this.estimatedFrameRate}
                                                      fileName = {this.state.fileName}
                /> :null}
                </center>
                <canvas
                    ref={this.canvasRefA}
                    onMouseDown = {this.handleMouseDown2}
                    style={{width : '50%',
                            backgroundColor : 'rgba(0, 0, 255, 0.1)',
                            display : 'none'}}
                />    
                <video ref={this.secondVideoRef}/>  
                <canvas
                    ref={this.canvasRefB}
                    style={{width : '50%',
                            backgroundColor : 'rgba(0, 0, 255, 0.1)',
                            display : 'none'}}
                /> 
            </div>

        );
    }

}


export default VideoLoadScreen;