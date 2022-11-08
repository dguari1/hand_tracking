import React, { Component, createRef, useState, useEffect, useMemo, useCallback } from "react";
import { average} from "./utils";
import  "./VideoLoadScreen.css";

import TimelinePlugin from "wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js";
import CursorPlugin from "wavesurfer.js/dist/plugin/wavesurfer.cursor.min.js";
import RegionsPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions.min.js';
import { wait } from "@testing-library/user-event/dist/utils";
import { toHaveStyle } from "@testing-library/jest-dom/dist/matchers";
import { TbRectangle } from "react-icons/tb";
// import CustomWavesurfer from "./CustomWaveSurfer";


import {Pose} from "@mediapipe/pose"

const WaveSurfer = require("wavesurfer.js");
const pixelmatch = require('pixelmatch');


class VideoLoadScreen extends Component {
    constructor(props) {
        super(props);
        this.state = {
            videoWidth : '50%',
            mouseDown : false,
            rectangle : null,
        }


        this.waveSurferRef = createRef();
        this.waveFormRef = createRef();
        this.timeLineRef = createRef();
        this.videoRef = createRef();
        this.figureRef = createRef();
        this.canvasRef = createRef();
        this.canvasRefA = createRef();
        this.canvasRefB = createRef();

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
        this.previousTime = -1; 
        this.frameCounter = 0; 
        this.arrayFrameRate = [ ]; // array that holds the frame rate estimates
        this.estimatedFrameRate = 0; // variable that holds the estimated frame rate

        //webworker
        this.webWorker = null; // this variable will hold the webWorker
        this.workerModelIsReady = false; // this variable will hold the status of the workerModelIsReady
        this.poseModelReady = false;
        this.handsModelReady = false;
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

          // create a way to remove regions by double click 
          this.waveSurferRef.current.on('region-dblclick', this.handleRegionDoubleClick)   

          // mount the worker that will process the data +
          if (this.webWorker === null) {
            console.log('mounting worker')
            this.handleMountWorker()
          }

    }

    componentWillUnmount(){
        document.removeEventListener('resize', this.handleResize);
        document.removeEventListener('keydown', this.handleKeyPress);
        this.webWorker.terminate();

      }


    handleMountWorker = () => {

        // here we declare a sharedWorker. The worker should have been initialized by the parent component. This will link this
        // code to that worker and allow the code to use it. If the parent didn't initialize the SharedWorker, then it will be initialized here
        // this.webWorker = new window.Worker(new URL("/workers/runningModel_worker.js", import.meta.url), { type: "module" })
        // this.webWorker = new window.Worker(new URL("/workers/runningModel_worker.js", import.meta.url))
        this.webWorker = new window.Worker(new URL("/workers/runningTensorFlowModel_worker.js", import.meta.url))
        this.webWorker.onerror = function(event) {
            console.log('There is an error with your worker!', event);
          }
        // create a connection (port) with the SharedWorker so that we can send work to it
        // this.webWorker.port.start();
        // ask the worker to load the model
        
        this.webWorker.postMessage({msg: 'init'})
        
        this.webWorker.onmessage = (event) => {
 
            if ((event.data.poseModelReady) && (event.data.handsModelReady)){
                this.poseModelReady = true;
                this.handsModelReady = true;
            }


        }
        
    }

    handleLoadedData = () =>{

        this.videoRef.current.play();
        this.videoRef.current.requestVideoFrameCallback(this.findFrameRate)
    }

    handleRegionDoubleClick = (region) => {
        //remove the region when double click on it :->
        region.remove()
    }

    componentWillUnmount = () => {
        window.addEventListener('beforeunload', (event) => {
            event.preventDefault();
            document.removeEventListener('keydown', this.handleKeyPress);
            window.removeEventListener('resize', this.handleResize);
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
                this.handlePause()
                this.handleProcessVideo();
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
        console.log(nFrames)
    }

    handleMoveForward = (nFrames) => {
        // Move video forward
        console.log(nFrames)
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
        this.setState({file_name : file.name})

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

    handleProcessVideo = () =>  {
        // only works if there is a video
        this.handlePause()
        if (this.videoRef.current) {
            var handsOnly = this.checkboxRef.current.checked
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
            this.currentRegion = 0 
            // put video at the begining of current region, triggering the handleSeeked function
            this.videoRef.current.currentTime = this.regions[this.currentRegion].start

        }
    }

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

    // callback that will be activated every time a seeking event ends
    handleSeeked = () => {

        if (this.processVideos) {
            //send data to the worker to be processed 
            var video = this.videoRef.current
            var ctxA = this.getFrameImageData(video, this.canvasRefA.current)
            const imageData = ctxA.getImageData(0,0,this.canvasRefA.current.width, this.canvasRefA.current.height)
            //check if the models are ready 

            if ((this.poseModelReady) && (this.handsModelReady)) {
                this.webWorker.postMessage({
                    "msg" : "frame",
                    "data" : imageData.data.buffer,
                    "width" : this.canvasRefA.current.width, 
                    "height" : this.canvasRefA.current.height,
                }, [imageData.data.buffer])
            }


            



            var desiredVideoTime = video.currentTime + (1/this.estimatedFrameRate)

            if (desiredVideoTime < video.duration){

                if (desiredVideoTime < this.regions[this.currentRegion].end){

                    video.currentTime = desiredVideoTime
                } else {

                    if (this.currentRegion < this.regions.length - 1) {
                        this.currentRegion++
                        video.currentTime = this.regions[this.currentRegion].start
                    }
                }

            }
    }

    }

  

    findFrameRate = (now, metadata) => {

        const video = this.videoRef.current;
        const currentVideoTime = metadata.mediaTime

        if (currentVideoTime !== this.previousTime){
            // console.log(1/(currentVideoTime-this.previousTime))
            this.arrayFrameRate.push(1/(currentVideoTime-this.previousTime))
            this.previousTime = currentVideoTime  
        }

        if (this.frameCounter <=  30)
        {
            this.frameCounter++
            this.videoFrameCallbackRef = this.videoRef.current.requestVideoFrameCallback(this.findFrameRate)
            
        } else {

            this.handlePause()
            this.estimatedFrameRate = average(this.arrayFrameRate.slice(5));
            console.log(this.estimatedFrameRate);
            this.frameCounter = 0;
            video.currentTime = 0;
            video.muted = false;      
        }


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
                                            transform: "translateY(-100%)",
                                            //top: "-50%",
                                        }}/>
                    <div id="wave-timeline" ref={this.timeLineRef} style = {{width: "75%",}}></div>

                </div>

                <div className="process-button">
                    <button style = {{ width:'25%', minWidth:'200px'}}  type="button" value='processVideo' ref={this.processVideoButtonTag} onClick={this.handleClick} disabled={false}>Process</button>
                </div>

                <div className="toggle" style={{display:'inline'}}>
                <label  htmlFor='checkbox' style={{marginTop:'1em'}}>Full Body </label>
                
                <label className="switch" id ="toggle-button">

                    <input type="checkbox" id='checkbox' ref={this.checkboxRef}/>
                    <span className="slider"> </span>
                </label>

                <label htmlFor='checkbox'> Hands Only</label>

                </div>

                </center>

                <canvas
                    ref={this.canvasRefA}
                    style={{width : '50%',
                            backgroundColor : 'rgba(0, 0, 255, 0.1)'}}
                />      
                {/* <canvas
                    ref={this.canvasRefB}
                    style= {{width : '20%'}}
                    // style={{display : 'none'}}
                />  */}
            </div>

        );
    }

}


export default VideoLoadScreen;