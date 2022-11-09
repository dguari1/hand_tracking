// importScripts("https://unpkg.com/regenerator-runtime@0.13.1/runtime.js")
importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs")
// importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core")
// importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs/dist/tf.min.js");
// importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter")
// importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl")

//importScripts("https://cdn.jsdelivr.net/npm/@tensorflow-models/posenet")
importScripts("https://cdn.jsdelivr.net/npm/@tensorflow-models/hand-pose-detection")

//importScripts("https://cdn.jsdelivr.net/npm/@mediapipe/hands")
//importScripts("https://cdn.jsdelivr.net/npm/@mediapipe/pose")

importScripts("https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection")

var poseDetector = null
var handDetector = null
let canvas = null;
let ctx = null;

const setup = async () => {

    const detectorConfig = {
    runtime: 'tfjs',
    solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
    modelType: 'full'
    }
    handDetector = await handPoseDetection.createDetector(handPoseDetection.SupportedModels.MediaPipeHands, detectorConfig);

    poseDetector = await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, {runtime: 'tfjs', modelType:'lite'})

    postMessage({poseModelReady : true, 
                 handsModelReady : true,})

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

    if (event.data.msg == 'frame') {

        console.log(handDetector, poseDetector)
    
        if ((handDetector !== null) && (poseDetector !== null) ) {

            // console.log("from worker =" + event.data.number)
            // const img = new ImageData(event.data.data, event.data.width, event.data.height)
            if (event.data.width > 0 && event.data.height> 0) {
                const img = new ImageData(
                    new Uint8ClampedArray(event.data.data),
                    event.data.width, 
                    event.data.height)


                console.log('img', img)
                const poses = await poseDetector.estimatePoses(img)
                console.log('poses', poses)
                
                console.log( event.data.width, event.data.height)

        
                // predict(img, event.data.width, event.data.height);
            }
        }
    }
};
