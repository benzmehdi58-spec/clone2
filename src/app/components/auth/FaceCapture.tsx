import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Camera, CheckCircle2, ScanFace, X, AlertTriangle, Loader2, ShieldCheck,
} from 'lucide-react';
import {
  loadModels,
  detectFace,
  drawDetection,
  assessFaceQuality,
  checkLivenessFrame,
  initialLivenessState,
  captureEnrollmentDescriptor,
  extractDescriptor,
  generateNonce,
  type FaceQuality,
  type LivenessState,
} from '../../services/faceService';
import styles from './FaceCapture.module.css';

type Phase = 'loading' | 'no-camera' | 'positioning' | 'liveness' | 'capturing' | 'success' | 'error';

interface FaceCaptureProps {
  mode: 'enroll' | 'verify';
  onCapture: (descriptor: number[], quality?: number, nonce?: string) => void;
  onCancel: () => void;
}

const FaceCapture: React.FC<FaceCaptureProps> = ({ mode, onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopIdRef = useRef<number>(0);
  const phaseRef = useRef<Phase>('loading');
  const livenessRef = useRef<LivenessState>(initialLivenessState());

  const [phase, setPhaseState] = useState<Phase>('loading');
  const [quality, setQuality] = useState<FaceQuality | null>(null);
  const [liveness, setLiveness] = useState<LivenessState>(initialLivenessState());
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [captureProgress, setCaptureProgress] = useState<{ frame: number; total: number } | null>(null);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(loopIdRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // ── Initialization ──
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await loadModels();
        if (!mounted) return;
      } catch (err) {
        console.error('[FaceCapture] Model load error:', err);
        setPhase('error');
        setErrorDetail('Failed to load face detection models.');
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
      } catch {
        setPhase('no-camera');
        setErrorDetail('Camera access denied. Please allow camera permissions in your browser settings.');
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const onPlaying = () => {
        if (!mounted || !canvasRef.current || !videoRef.current) return;
        canvasRef.current.width = videoRef.current.videoWidth || 640;
        canvasRef.current.height = videoRef.current.videoHeight || 480;

        const loop = async () => {
          if (!mounted || !videoRef.current || !canvasRef.current) return;

          try {
            const result = await detectFace(videoRef.current);
            if (!mounted) return;

            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            const p = phaseRef.current;
            if (p === 'capturing' || p === 'success') {
              // Don't interfere with capture/success phase
            } else if (result) {
              drawDetection(canvasRef.current, videoRef.current, result);

              const q = assessFaceQuality(
                result,
                videoRef.current.videoWidth,
                videoRef.current.videoHeight,
              );
              setQuality(q);

              if (p === 'liveness') {
                const ls = checkLivenessFrame(result.landmarks, livenessRef.current);
                livenessRef.current = ls;
                setLiveness(ls);
              } else if (q.passed) {
                setPhase('liveness');
                livenessRef.current = initialLivenessState();
                setLiveness(initialLivenessState());
              } else {
                setPhase('positioning');
              }
            } else {
              if (p !== 'liveness') {
                setPhase('positioning');
                setQuality(null);
              }
            }
          } catch (err) {
            console.error('[FaceCapture] Loop error:', err);
          }

          if (mounted) loopIdRef.current = requestAnimationFrame(loop);
        };

        loop();
      };

      videoRef.current?.addEventListener('playing', onPlaying, { once: true });
    };

    init();
    return () => { mounted = false; stopCamera(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Capture Handler ──
  const handleCapture = async () => {
    if (!videoRef.current || phase === 'capturing' || phase === 'success') return;

    setPhase('capturing');
    setErrorDetail(null);

    try {
      const nonce = generateNonce();

      if (mode === 'enroll') {
        const result = await captureEnrollmentDescriptor(
          videoRef.current, 5, 500,
          (frame, total) => setCaptureProgress({ frame, total }),
        );

        if (result) {
          if (result.quality < 0.65) {
            setPhase('error');
            setErrorDetail(`Capture quality insufficient (${(result.quality * 100).toFixed(0)}%). Please hold still and ensure even lighting.`);
            setCaptureProgress(null);
            return;
          }
          setPhase('success');
          stopCamera();
          onCapture(result.descriptor, result.quality, nonce);
        } else {
          setPhase('error');
          setErrorDetail('Face was lost during capture. Please remain still and try again.');
        }
      } else {
        const desc = await extractDescriptor(videoRef.current);
        if (desc) {
          setPhase('success');
          stopCamera();
          onCapture(Array.from(desc), undefined, nonce);
        } else {
          setPhase('error');
          setErrorDetail('Unable to detect your face. Please ensure adequate lighting.');
        }
      }
    } catch (err) {
      setPhase('error');
      setErrorDetail(`Capture failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCaptureProgress(null);
    }
  };

  // ── Auto-capture in verify mode ──
  // Once liveness is confirmed, immediately extract the descriptor
  // and send it — no button click required for a frictionless login.
  const autoCapturedRef = useRef(false);
  useEffect(() => {
    if (mode === 'verify' && liveness.liveDetected && !autoCapturedRef.current) {
      autoCapturedRef.current = true;
      handleCapture();
    }
  }, [liveness.liveDetected]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step Indicator ──
  const verifyAutoMode = mode === 'verify';
  const steps = verifyAutoMode
    ? [
        { label: 'Position', done: quality?.passed === true },
        { label: 'Liveness', done: liveness.liveDetected },
        { label: 'Authenticating', done: phase === 'success' },
      ]
    : [
        { label: 'Position', done: phase !== 'loading' && phase !== 'no-camera' && quality?.passed === true },
        { label: 'Liveness', done: liveness.liveDetected },
        { label: 'Capture', done: phase === 'success' },
      ];

  const canCapture = !verifyAutoMode && ((phase === 'liveness' && liveness.liveDetected) || phase === 'error');

  // Active step index for the connector line
  const activeStep = phase === 'success' ? 3 :
    liveness.liveDetected ? 2 :
    quality?.passed ? 1 : 0;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* ── Close Button ── */}
        <button className={styles.closeBtn} onClick={onCancel} aria-label="Close">
          <X size={18} />
        </button>

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <ScanFace size={22} strokeWidth={1.5} />
          </div>
          <div>
            <h3>{mode === 'enroll' ? 'Enroll Face ID' : 'Verify Identity'}</h3>
            <p>{mode === 'enroll'
              ? 'Position your face and remain still. Liveness is verified automatically.'
              : 'Look at the camera to authenticate securely.'
            }</p>
          </div>
        </div>

        {/* ── Step Progress ── */}
        <div className={styles.steps}>
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <div className={`${styles.stepConnector} ${activeStep > i ? styles.connectorDone : ''}`} />
              )}
              <div className={`${styles.step} ${s.done ? styles.stepDone : activeStep === i ? styles.stepActive : ''}`}>
                <div className={styles.stepCircle}>
                  {s.done ? <CheckCircle2 size={12} /> : <span>{i + 1}</span>}
                </div>
                <span className={styles.stepLabel}>{s.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* ── Camera View ── */}
        <div className={`${styles.cameraContainer} ${
          phase === 'liveness' && liveness.liveDetected ? styles.cameraReady :
          phase === 'success' ? styles.cameraSuccess :
          phase === 'error' ? styles.cameraError : ''
        }`}>
          <video ref={videoRef} className={styles.video} autoPlay muted playsInline />
          <canvas ref={canvasRef} className={styles.canvas} />

          {/* Corner guides */}
          <div className={styles.cornerTL} />
          <div className={styles.cornerTR} />
          <div className={styles.cornerBL} />
          <div className={styles.cornerBR} />

          {/* Quality guidance */}
          {quality && phase === 'positioning' && (
            <div className={styles.qualityOverlay}>
              <span>{quality.guidance}</span>
            </div>
          )}

          {/* Liveness progress */}
          {phase === 'liveness' && !liveness.liveDetected && (
            <div className={styles.livenessOverlay}>
              <Loader2 size={14} className={styles.spinIcon} />
              <span>Verifying liveness</span>
              <div className={styles.motionBar}>
                <div className={styles.motionFill} style={{ width: `${liveness.confidence * 100}%` }} />
              </div>
            </div>
          )}

          {phase === 'liveness' && liveness.liveDetected && (
            <div className={`${styles.livenessOverlay} ${styles.livenessSuccess}`}>
              <ShieldCheck size={14} />
              <span>Liveness confirmed</span>
            </div>
          )}

          {/* Capture progress */}
          {captureProgress && (
            <div className={styles.progressOverlay}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${(captureProgress.frame / captureProgress.total) * 100}%` }} />
              </div>
              <span>Capturing frame {captureProgress.frame} of {captureProgress.total}</span>
            </div>
          )}

          {/* Loading state */}
          {phase === 'loading' && (
            <div className={styles.loadingOverlay}>
              <Loader2 size={28} className={styles.spinIcon} />
              <span>Initializing camera</span>
            </div>
          )}
        </div>

        {/* ── Status Badge ── */}
        <div className={styles.statusRow}>
          <div className={`${styles.statusBadge} ${
            phase === 'loading' ? styles.statusLoading :
            phase === 'success' ? styles.statusReady :
            phase === 'liveness' && liveness.liveDetected ? styles.statusReady :
            phase === 'capturing' ? styles.statusCapturing :
            phase === 'error' || phase === 'no-camera' ? styles.statusError :
            styles.statusDefault
          }`}>
            <span className={styles.dot} />
            {phase === 'loading' ? 'Loading detection models' :
             phase === 'no-camera' ? 'Camera access denied' :
             phase === 'positioning' ? (quality?.guidance || 'Position your face in the frame') :
             phase === 'liveness' && !liveness.liveDetected ? 'Verifying liveness' :
             phase === 'liveness' && liveness.liveDetected ? (verifyAutoMode ? 'Authenticating' : 'Ready to capture') :
             phase === 'capturing' ? 'Authenticating' :
             phase === 'success' ? 'Authenticated' :
             'Action required'}
          </div>
        </div>

        {/* ── Error ── */}
        {errorDetail && (
          <div className={styles.errorBox}>
            <AlertTriangle size={14} />
            <span>{errorDetail}</span>
          </div>
        )}

        {/* ── Actions ── */}
        <div className={styles.actions}>
          {!verifyAutoMode && (
            <button
              className={styles.captureBtn}
              onClick={handleCapture}
              disabled={!canCapture}
            >
              {phase === 'capturing' ? (
                <><Loader2 size={15} className={styles.spinIcon} /> Processing</>
              ) : phase === 'success' ? (
                <><CheckCircle2 size={15} /> Complete</>
              ) : (
                <><Camera size={15} /> Capture Face</>
              )}
            </button>
          )}
          <button className={`${styles.cancelBtn} ${verifyAutoMode ? styles.cancelBtnFull : ''}`} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default FaceCapture;
