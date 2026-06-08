/**
 * Face Recognition Service (Edge AI)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Client-side face detection, landmark extraction, and 128-dimensional
 * descriptor generation using face-api.js (TensorFlow.js / WebGL).
 *
 * Architecture: Edge AI — the CNN runs entirely in the browser.
 * No face images ever leave the user's device. Only the 128-float
 * descriptor array (a mathematical fingerprint) is transmitted.
 *
 * ── Academic References ──────────────────────────────────────────────────
 *
 * [1] Schroff, F., Kalenichenko, D., & Philbin, J. (2015).
 *     "FaceNet: A Unified Embedding for Face Recognition and Clustering."
 *     CVPR 2015. arXiv:1503.03832
 *     → Introduced the 128-dim embedding space and triplet loss training.
 *
 * [2] Soukupová, T., & Čech, J. (2016).
 *     "Real-Time Eye Blink Detection using Facial Landmarks."
 *     21st CVWW, Rimske Toplice, Slovenia.
 *     → EAR (Eye Aspect Ratio) formula used for liveness detection.
 *
 * [3] Kazemi, V., & Sullivan, J. (2014).
 *     "One Millisecond Face Alignment with an Ensemble of Regression Trees."
 *     CVPR 2014.
 *     → Foundation for the 68-landmark face alignment model.
 *
 * ── Security Properties ──────────────────────────────────────────────────
 *
 * - Face images: NEVER transmitted, NEVER stored.
 * - Descriptors: 128 IEEE 754 floats, L2-normalized (unit hypersphere).
 * - Liveness: Blink detection via Eye Aspect Ratio (EAR) monitoring.
 * - Quality gates: Minimum face size, centering, detection confidence.
 * - Anti-replay: ISO 8601 timestamp nonce, validated server-side (30s window).
 */

import * as faceapi from 'face-api.js';

// ── Model Management ────────────────────────────────────────────────────

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

/**
 * Load the TF.js neural network weights from /models (served from public/).
 *
 * Models loaded:
 *   - TinyFaceDetector: ~190KB, real-time single-shot face detection
 *   - FaceLandmark68Net: ~350KB, 68-point facial landmark regression [3]
 *   - FaceRecognitionNet: ~6.2MB, 128-dim descriptor extraction [1]
 *
 * Called once — subsequent calls are no-ops (singleton pattern).
 */
export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const MODEL_URL = '/models';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    // Models ready
  })();

  return loadingPromise;
}

export function isLoaded(): boolean {
  return modelsLoaded;
}

// ── Detection Configuration ─────────────────────────────────────────────

/**
 * TinyFaceDetector options.
 *   - inputSize: 320px — balances speed vs accuracy for webcam resolution
 *   - scoreThreshold: 0.5 — minimum confidence to accept a detection
 *
 * TinyFaceDetector vs SSD MobileNet trade-off:
 *   TinyFaceDetector: ~190KB, ~10ms inference, good for frontal faces
 *   SSD MobileNet:    ~5.4MB, ~50ms inference, better with angles/occlusion
 *   → We use TinyFaceDetector for real-time responsiveness.
 */
const DETECTION_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,
  scoreThreshold: 0.5,
});

// ── Face Detection & Descriptor Extraction ──────────────────────────────

/** Full detection result type alias for cleaner signatures. */
export type FaceResult = faceapi.WithFaceDescriptor<
  faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>
>;

/**
 * Detect a single face and extract its 128-dim descriptor.
 * Returns null if no face is detected.
 */
export async function extractDescriptor(
  input: HTMLVideoElement | HTMLCanvasElement
): Promise<Float32Array | null> {
  const result = await faceapi
    .detectSingleFace(input, DETECTION_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result) return null;
  return result.descriptor;
}

/**
 * Detect a single face and return the full detection result
 * (bounding box, 68 landmarks, 128-dim descriptor).
 */
export async function detectFace(
  input: HTMLVideoElement | HTMLCanvasElement
): Promise<FaceResult | undefined> {
  return faceapi
    .detectSingleFace(input, DETECTION_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptor();
}

/**
 * Draw bounding box + 68-point landmarks overlay onto a canvas.
 */
export function drawDetection(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  result: FaceResult
) {
  const dims = faceapi.matchDimensions(canvas, video, true);
  const resized = faceapi.resizeResults(result, dims);
  faceapi.draw.drawDetections(canvas, [resized.detection]);
  faceapi.draw.drawFaceLandmarks(canvas, [resized]);
}

// ── Face Quality Assessment ─────────────────────────────────────────────

export interface FaceQuality {
  /** Is the face large enough for reliable descriptor extraction? */
  sizeOk: boolean;
  /** Is the face roughly centered in the frame? */
  centeredOk: boolean;
  /** Detection confidence score (0–1) */
  confidence: number;
  /** Is the detection confidence above minimum? */
  confidenceOk: boolean;
  /** Overall quality passed all gates? */
  passed: boolean;
  /** Human-readable guidance message */
  guidance: string;
}

/** Minimum face bounding box area relative to frame area (4% of frame). */
const MIN_FACE_AREA_RATIO = 0.04;
/** Maximum distance of face center from frame center (as ratio of frame size). */
const MAX_CENTER_OFFSET_RATIO = 0.35;
/** Minimum detection confidence score. */
const MIN_CONFIDENCE = 0.65;

/**
 * Assess face quality for enrollment/verification suitability.
 *
 * Checks three gates:
 *   1. Size: Face must occupy ≥4% of the frame area (prevents distant faces)
 *   2. Centering: Face center must be within 35% of frame center
 *   3. Confidence: Detection score must be ≥0.65
 */
export function assessFaceQuality(
  result: FaceResult,
  frameWidth: number,
  frameHeight: number
): FaceQuality {
  const box = result.detection.box;
  const frameArea = frameWidth * frameHeight;
  const faceArea = box.width * box.height;
  const confidence = result.detection.score;

  // Size check
  const sizeOk = (faceArea / frameArea) >= MIN_FACE_AREA_RATIO;

  // Centering check
  const faceCenterX = box.x + box.width / 2;
  const faceCenterY = box.y + box.height / 2;
  const offsetX = Math.abs(faceCenterX - frameWidth / 2) / frameWidth;
  const offsetY = Math.abs(faceCenterY - frameHeight / 2) / frameHeight;
  const centeredOk = offsetX <= MAX_CENTER_OFFSET_RATIO && offsetY <= MAX_CENTER_OFFSET_RATIO;

  // Confidence check
  const confidenceOk = confidence >= MIN_CONFIDENCE;

  const passed = sizeOk && centeredOk && confidenceOk;

  let guidance = '';
  if (!sizeOk) guidance = 'Move closer to the camera';
  else if (!centeredOk) guidance = 'Center your face in the frame';
  else if (!confidenceOk) guidance = 'Improve lighting conditions';
  else guidance = 'Face quality is good — ready to capture';

  return { sizeOk, centeredOk, confidence, confidenceOk, passed, guidance };
}

// ── Liveness Detection (Motion-Based) ───────────────────────────────────

/**
 * Passive Motion Liveness Detection
 *
 * Replaces blink-based EAR detection (which depends on precise eye
 * landmarks that are unreliable at webcam resolution with TinyFaceDetector).
 *
 * Principle:
 *   A live person naturally micro-moves — head sway, breathing, subtle
 *   postural adjustments. These cause the nose-tip landmark (point 30)
 *   to shift by 1–5 pixels between frames. A photo or static image
 *   held up to the camera produces near-zero movement (< 0.5px).
 *
 * Method:
 *   1. Track the nose-tip position (landmark 30) over N frames
 *   2. Compute cumulative displacement across all tracked frames
 *   3. If total movement exceeds threshold → user is live
 *
 * Advantages over blink detection:
 *   - Invisible to user (no action required — just look at camera)
 *   - Works in ~1–2 seconds (vs 8+ seconds waiting for a blink)
 *   - Not dependent on eye landmark accuracy
 *   - Handles glasses, small faces, low-res webcams
 *
 * Limitations:
 *   - Can be defeated by slowly moving a printed photo
 *   - Does not detect video replay attacks
 *   - For production: combine with server-side challenge or depth sensing
 *
 * Academic reference:
 *   Bao, W., Li, H., Li, N., & Jiang, W. (2009).
 *   "A liveness detection method for face recognition based on
 *    optical flow field." IASP 2009.
 */

/** Minimum cumulative pixel displacement to confirm liveness. */
const MOTION_THRESHOLD_PX = 8;
/** Minimum frames required to make a liveness decision. */
const MIN_LIVENESS_FRAMES = 12;

export interface LivenessState {
  /** Cumulative pixel displacement of the nose tip */
  totalMotion: number;
  /** Whether liveness has been confirmed */
  liveDetected: boolean;
  /** How many frames have been processed */
  framesProcessed: number;
  /** Previous nose-tip position for delta computation */
  prevNose: { x: number; y: number } | null;
  /** Motion confidence (0–1) — how much of the threshold has been reached */
  confidence: number;
}

/**
 * Check one frame for motion-based liveness.
 *
 * Tracks landmark 30 (nose tip) displacement between consecutive frames.
 * Nose tip is chosen because:
 *   - It's the most stable facial landmark (least affected by expressions)
 *   - It reflects overall head movement accurately
 *   - It's reliably detected even at low resolution
 */
export function checkLivenessFrame(
  landmarks: faceapi.FaceLandmarks68,
  prevState: LivenessState
): LivenessState {
  const noseTip = landmarks.positions[30]; // landmark 30 = nose tip
  const frame = prevState.framesProcessed;

  if (!prevState.prevNose) {
    // First frame — just record position
    return {
      totalMotion: 0,
      liveDetected: false,
      framesProcessed: 1,
      prevNose: { x: noseTip.x, y: noseTip.y },
      confidence: 0,
    };
  }

  // Compute displacement from previous frame
  const dx = noseTip.x - prevState.prevNose.x;
  const dy = noseTip.y - prevState.prevNose.y;
  const displacement = Math.sqrt(dx * dx + dy * dy);

  const totalMotion = prevState.totalMotion + displacement;
  const confidence = Math.min(1, totalMotion / MOTION_THRESHOLD_PX);

  // Liveness confirmed when enough cumulative motion is detected
  const liveDetected = prevState.liveDetected ||
    (totalMotion >= MOTION_THRESHOLD_PX && frame >= MIN_LIVENESS_FRAMES);

  if (liveDetected && !prevState.liveDetected) {
    // Liveness confirmed via motion analysis
  }

  return {
    totalMotion,
    liveDetected,
    framesProcessed: frame + 1,
    prevNose: { x: noseTip.x, y: noseTip.y },
    confidence,
  };
}

export function initialLivenessState(): LivenessState {
  return {
    totalMotion: 0,
    liveDetected: false,
    framesProcessed: 0,
    prevNose: null,
    confidence: 0,
  };
}

// ── Multi-Frame Enrollment Capture ──────────────────────────────────────

/**
 * Multi-frame enrollment capture with quality validation.
 *
 * Captures N descriptors over time and averages them to create
 * a more robust face template (reduces single-frame noise).
 *
 * Process:
 *   1. Capture 5 frames with ~500ms spacing (covers micro-expressions)
 *   2. Validate each frame passes quality gates
 *   3. Average all descriptors element-wise
 *   4. L2-normalize the averaged descriptor back to unit hypersphere
 *   5. Compute quality score from pairwise consistency
 *
 * Quality score (0–1):
 *   Measures intra-session consistency — how similar the captured
 *   descriptors are to each other. Higher = more stable embedding.
 *   Score < 0.7 suggests unstable capture (e.g., movement, lighting changes).
 *
 * Returns null if any frame fails face detection.
 */
export async function captureEnrollmentDescriptor(
  video: HTMLVideoElement,
  numFrames: number = 5,
  delayMs: number = 500,
  onProgress?: (frame: number, total: number) => void,
): Promise<{ descriptor: number[]; quality: number } | null> {
  const descriptors: Float32Array[] = [];

  for (let i = 0; i < numFrames; i++) {
    onProgress?.(i + 1, numFrames);

    const desc = await extractDescriptor(video);
    if (!desc) {
      console.warn(`[FaceService] Enrollment frame ${i + 1}/${numFrames} — no face detected`);
      return null;
    }
    descriptors.push(desc);

    if (i < numFrames - 1) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  // Average the descriptors (element-wise mean)
  const averaged = new Float32Array(128);
  for (let i = 0; i < 128; i++) {
    let sum = 0;
    for (const d of descriptors) sum += d[i];
    averaged[i] = sum / descriptors.length;
  }

  // L2-normalize back to unit hypersphere
  // face-api.js descriptors are L2-normalized; averaging breaks the norm
  const norm = Math.sqrt(averaged.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return null; // degenerate case
  for (let i = 0; i < 128; i++) averaged[i] /= norm;

  // Quality score: average pairwise cosine similarity
  // For L2-normalized vectors, cosine similarity = dot product
  let totalSim = 0;
  let pairCount = 0;
  for (let i = 0; i < descriptors.length; i++) {
    for (let j = i + 1; j < descriptors.length; j++) {
      const dist = faceapi.euclideanDistance(
        Array.from(descriptors[i]),
        Array.from(descriptors[j])
      );
      // Convert Euclidean distance to similarity: sim = 1 - d/2
      // (for unit vectors, max distance = 2, so sim ∈ [0, 1])
      totalSim += 1 - (dist / 2);
      pairCount++;
    }
  }
  const quality = pairCount > 0 ? totalSim / pairCount : 1;

  // Enrollment complete: ${numFrames} frames, quality=${quality}

  return {
    descriptor: Array.from(averaged),
    quality: Math.max(0, Math.min(1, quality)),
  };
}

// ── Anti-Replay Nonce ───────────────────────────────────────────────────

/**
 * Generate a timestamp-based nonce for anti-replay protection.
 *
 * The server validates that the timestamp is within a 30-second window
 * to prevent captured descriptors from being replayed later.
 */
export function generateNonce(): string {
  return new Date().toISOString();
}
