
// importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs/dist/tf.min.js");
// importScripts("https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface");
importScripts("https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/pose.js")


// import { Pose } from "@mediapipe/pose/pose";
//import {Pose} from "@mediapipe/pose"

var modelPose = null
let port = null;
let canvas = null;
let ctx = null;
var is_valid = false

function onResults(results) {
    if (results) {
        console.log(results.poseLandmarks)
    } else {
        console.log('model failed to find a person')
    }
}

const setup = async () => {

    try {
        // modelPose = await blazeface.load({maxFaces:1});
        modelPose = await new Pose({locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`;
        }});
        modelPose.setOptions({
        modelComplexity: 0,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    modelPose.onResults(onResults);
    console.log('model ready')

    } catch (err) {
        console.error("Can't load model: ", err)
    }

}



// onconnect = function (ev) {
//     console.log('calling the worker first time 0' )
//     port = ev.ports[0];
//     port.
    
onmessage = (event) => {
        console.log('calling the worker first time 1' )
        if (event.data.msg == 'init'){
            console.log('calling the worker first time 2')
            if (canvas == null) {

                canvas = new OffscreenCanvas(100, 100); // create a new offScreenCanvas directly in the worker. 
                // the worker will emit the imageBitmap to the main thread.
                // In the main thread there is a canvas that receives the imageBitmap. That canvas has a conxtext that can draw the imageBitmap.
                // the context is 'bitmaprenderer'
                ctx = canvas.getContext('2d');
                console.log('calling the worker first time 3')
                setup()
                console.log('calling the worker first time 4')
            } else {
                //canvas already initialized -- verify that the model is loaded and send message to main thread

                if (model != null) {
                    port.postMessage({ modelIsReady: true});
                } else {   //model not loaded yet
                    setup()
                }
            }

        }
    
        if (modelPose !== null) {
    
            // console.log("from worker =" + event.data.number)
            // const img = new ImageData(event.data.data, event.data.width, event.data.height)
            if (event.data.width > 0 && event.data.height> 0) {
                const img = new ImageData(
                    new Uint8ClampedArray(event.data.data),
                    event.data.width, 
                    event.data.height)
        
                // predict(img, event.data.width, event.data.height);
            }
        }
    };
//     port.start();
// }
    




