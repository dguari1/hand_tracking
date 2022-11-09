var _regeneratorRuntime=require("/Users/diegoguarinlopez/Github/hand_tracking/node_modules/@babel/runtime/helpers/regeneratorRuntime.js").default,_asyncToGenerator=require("/Users/diegoguarinlopez/Github/hand_tracking/node_modules/@babel/runtime/helpers/asyncToGenerator.js").default;importScripts("https://unpkg.com/regenerator-runtime@0.13.1/runtime.js"),importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs"),importScripts("https://cdn.jsdelivr.net/npm/@tensorflow-models/hand-pose-detection"),importScripts("https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection");var poseDetector=null,handDetector=null,canvas=null,ctx=null,setup=function(){var e=_asyncToGenerator(_regeneratorRuntime().mark((function e(){var t;return _regeneratorRuntime().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return t={runtime:"tfjs",solutionPath:"https://cdn.jsdelivr.net/npm/@mediapipe/hands",modelType:"full"},e.next=3,handPoseDetection.createDetector(handPoseDetection.SupportedModels.MediaPipeHands,t);case 3:return handDetector=e.sent,e.next=6,poseDetection.createDetector(poseDetection.SupportedModels.BlazePose,{runtime:"tfjs",modelType:"lite"});case 6:poseDetector=e.sent,postMessage({poseModelReady:!0,handsModelReady:!0});case 8:case"end":return e.stop()}}),e)})));return function(){return e.apply(this,arguments)}}();onmessage=function(){var e=_asyncToGenerator(_regeneratorRuntime().mark((function e(t){var n,r;return _regeneratorRuntime().wrap((function(e){for(;;)switch(e.prev=e.next){case 0:if("init"==t.data.msg&&(null==canvas?(canvas=new OffscreenCanvas(100,100),ctx=canvas.getContext("2d"),setup()):null!=model?postMessage({modelIsReady:!0}):setup()),"frame"!=t.data.msg){e.next=12;break}if(console.log(handDetector,poseDetector),null===handDetector||null===poseDetector){e.next=12;break}if(!(t.data.width>0&&t.data.height>0)){e.next=12;break}return n=new ImageData(new Uint8ClampedArray(t.data.data),t.data.width,t.data.height),console.log("img",n),e.next=9,poseDetector.estimatePoses(n);case 9:r=e.sent,console.log("poses",r),console.log(t.data.width,t.data.height);case 12:case"end":return e.stop()}}),e)})));return function(t){return e.apply(this,arguments)}}();