import { useEffect, useRef, useState } from "react";
import {
    GestureRecognizer,
    FilesetResolver,
    DrawingUtils,
} from "@mediapipe/tasks-vision";

const GestureRecognizerApp = () => {
    const [gestureRecognizer, setGestureRecognizer] = useState(null);
    const [webcamRunning, setWebcamRunning] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const gestureOutputRef = useRef(null);

    const videoHeight = 360;
    const videoWidth = 480;

    useEffect(() => {
        const createGestureRecognizer = async () => {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );
            const recognizer = await GestureRecognizer.createFromOptions(
                vision,
                {
                    baseOptions: {
                        modelAssetPath:
                            "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                }
            );
            setGestureRecognizer(recognizer);
        };
        createGestureRecognizer();
    }, []);

    const hasGetUserMedia = () =>
        !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    const enableCam = async () => {
        if (!gestureRecognizer) {
            alert("Please wait for gestureRecognizer to load");
            return;
        }

        if (webcamRunning) {
            // Stop webcam and reset button text
            setWebcamRunning(false);
            videoRef.current.srcObject
                .getTracks()
                .forEach((track) => track.stop());
        } else {
            // Start the webcam
            setWebcamRunning(true);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
            });
            videoRef.current.srcObject = stream;
            videoRef.current.play();

            // Start predicting once the video is playing
            videoRef.current.onloadeddata = () => {
                predictWebcam();
            };
        }
    };

    const predictWebcam = async () => {
        const canvasCtx = canvasRef.current.getContext("2d");
        const drawingUtils = new DrawingUtils(canvasCtx);

        // Continuous prediction loop
        const predictLoop = async () => {
            const nowInMs = Date.now();
            const results = await gestureRecognizer.recognizeForVideo(
                videoRef.current,
                nowInMs
            );

            console.log(results);

            // Clear previous drawing
            canvasCtx.clearRect(
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height
            );

            if (results.landmarks) {
                for (const landmarks of results.landmarks) {
                    drawingUtils.drawConnectors(
                        landmarks,
                        GestureRecognizer.HAND_CONNECTIONS,
                        { color: "#00FF00", lineWidth: 5 }
                    );
                    drawingUtils.drawLandmarks(landmarks, {
                        color: "#FF0000",
                        lineWidth: 2,
                    });
                }
            }

            if (results.gestures.length > 0) {
                gestureOutputRef.current.style.display = "block";
                const categoryName = results.gestures[0][0].categoryName;
                const categoryScore = (
                    results.gestures[0][0].score * 100
                ).toFixed(2);
                const handedness = results.handednesses[0][0].displayName;
                gestureOutputRef.current.innerText = `GestureRecognizer: ${categoryName}\n Confidence: ${categoryScore}%\n Handedness: ${handedness}`;
            } else {
                gestureOutputRef.current.style.display = "none";
            }

            requestAnimationFrame(predictLoop);
        };

        // Start the prediction loop
        predictLoop();
    };

    return (
        <div>
            <h1>Gesture Recognizer App</h1>
            <div className="demos">
                {hasGetUserMedia() && (
                    <button onClick={enableCam}>
                        {webcamRunning
                            ? "DISABLE PREDICTIONS"
                            : "ENABLE PREDICTIONS"}
                    </button>
                )}

                <video
                    ref={videoRef}
                    id="webcam"
                    width={videoWidth}
                    height={videoHeight}
                    autoPlay
                    muted
                    style={{ display: webcamRunning ? "block" : "none" }}
                />
                <canvas
                    ref={canvasRef}
                    id="output_canvas"
                    width={videoWidth}
                    height={videoHeight}
                />
                <p
                    ref={gestureOutputRef}
                    className="info"
                    style={{ display: "none" }}
                >
                    Gesture Output will display here.
                </p>
            </div>
        </div>
    );
};

export default GestureRecognizerApp;
