import { useEffect, useRef } from "react";
import { Hands } from "@mediapipe/hands";


function WebCamAnalysis() {
  const inputVideoRef = useRef();
  const canvasRef = useRef();
  const contextRef = useRef();

  useEffect(() => {
    contextRef.current = canvasRef.current.getContext("2d");
    const constraints = {
      video: { width: { min: 1280 }, height: { min: 720 } },
    };
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      inputVideoRef.current.srcObject = stream;
      sendToMediaPipe();
    });

const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});
    
hands.setOptions({
    maxNumHands: 1
    
    ,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
    });
hands.initialize()
hands.onResults(onResults);

const sendToMediaPipe = async () => {
      if (!inputVideoRef.current.videoWidth) {
        console.log('not ready', inputVideoRef.current.videoWidth);
        requestAnimationFrame(sendToMediaPipe);
      } else {
        console.log('ready', inputVideoRef.current.videoWidth);
        await hands.send({ image: inputVideoRef.current });
        requestAnimationFrame(sendToMediaPipe);
      }
    };
  }, []);

  const onResults = (results) => {
    contextRef.current.save();
    contextRef.current.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
    contextRef.current.drawImage(
      results.image,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
    // Only overwrite existing pixels.
    contextRef.current.globalCompositeOperation = "source-out";
    contextRef.current.fillStyle = "#00FF00";
    contextRef.current.fillRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    // Only overwrite missing pixels.
    contextRef.current.globalCompositeOperation = "destination-atop";
    contextRef.current.drawImage(
      results.image,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    contextRef.current.restore();

    if (results.multiHandLandmarks) {
        console.log(results.multiHandedness[0]);
        for (const landmarks of results.multiHandLandmarks) {
            console.log(landmarks);
        //   drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS,
        //                  {color: '#00FF00', lineWidth: 5});
        //   drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 2});
        }
    };
    }

  return (
    <div className="App">
      <video autoPlay ref={inputVideoRef} />
      <canvas ref={canvasRef} width={1280} height={720} />
    </div>
  );
}

export default WebCamAnalysis;