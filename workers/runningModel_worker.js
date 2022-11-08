
// importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs/dist/tf.min.js");
// importScripts("https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface");

importScripts("https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/pose.js")
//importScripts("https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/hands.js")
// importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs/dist/tf.min.js")
// importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl")


//import { Pose } from "@mediapipe/pose";
//import {Pose} from "@mediapipe/pose"

var modelPose = null
var modelHands = null
let port = null;
let canvas = null;
let ctx = null;
var is_valid = false

function onResultsPose(results) {
    if (results) {
        console.log('model worked')
    } else {
        console.log('model failed to find a person')
    }
}

function onResultsHands(results) {
    if (results) {
        console.log(results.poseLandmarks)
    } else {
        console.log('model failed to find a person')
    }
}

const setup = async () => {

    console.log(VERSION)
    try {
        // modelPose = await blazeface.load({maxFaces:1});
        modelPose = await new Pose({locateFile: (file) => {

            if(file.endsWith(".data") || file.endsWith(".tflite")){
                console.log(file)
                return file;
            }else{
                console.log(file)
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1635988162/${file}`;
            }
        //   console.log('Model', file)
        //   return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1635988162/${file}`;
        }});
        modelPose.setOptions({
            modelComplexity: 0,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
            })
        modelPose.onResults(onResultsPose);
        await modelPose.initialize()
        

        console.log('From Worker -- Pose Model Ready')

        // modelHands = await new Hands({locateFile: (file) => {
        //     return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`;
        //   }});
        // modelHands.setOptions({
        //     maxNumHands: 1,
        //     modelComplexity: 1,
        //     minDetectionConfidence: 0.5,
        //     minTrackingConfidence: 0.5
        //   });
        //   modelHands.onResults(onResultsHands);
        //   await modelHands.initialize()
        //   console.log('From Worker -- Hands Model Ready')


          postMessage({poseModelReady : true, 
                       handsModelReady : true,})


    } catch (err) {
        console.error("Can't load model: ", err)
    }

}

    
onmessage = async(event) => {

        if (event.data.msg == 'init'){
            if (canvas == null) {

                canvas = new OffscreenCanvas(100, 100); // create a new offScreenCanvas directly in the worker. 
                // the worker will emit the imageBitmap to the main thread.
                // In the main thread there is a canvas that receives the imageBitmap. That canvas has a conxtext that can draw the imageBitmap.
                // the context is 'bitmaprenderer'
                ctx = canvas.getContext('2d');
                setup()
            } else {
                //canvas already initialized -- verify that the model is loaded and send message to main thread

                if (model != null) {
                    postMessage({ modelIsReady: true});
                } else {   //model not loaded yet
                    setup()
                }
            }

        }
    
        if ((modelPose !== null)  && (modelHands !== null)) {
    
            // console.log("from worker =" + event.data.number)
            // const img = new ImageData(event.data.data, event.data.width, event.data.height)
            if (event.data.width > 0 && event.data.height> 0) {
                const img = new ImageData(
                    new Uint8ClampedArray(event.data.data),
                    event.data.width, 
                    event.data.height)

                await modelPose.send({image: img})

                console.log( event.data.width, event.data.height)
        
                // predict(img, event.data.width, event.data.height);
            }
        }
    };
//     port.start();
// }
    




