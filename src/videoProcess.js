import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';

export async function videoProcess (video, start, end, poseModel) {

    // var poseDetector = await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, {runtime: 'tfjs', modelType:'lite'})
    // var canvas = document.createElement("CANVAS");
    // canvas.height = 240;
    // canvas.width = 240;
    // var ctx = canvas.getContext('2d',{willReadFrequently:true});
    // const imageData = ctx.getImageData(0,0,canvas.width, canvas.height)
    // const poses = await poseDetector.estimatePoses(imageData)
    // console.log('Pose Model Ready -- ')
    console.log(video)

    return

}