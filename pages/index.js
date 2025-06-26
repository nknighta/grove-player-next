import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

export default function Home() {
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const ffmpegRef = useRef(null);
  const [isFFmpegReady, setIsFFmpegReady] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSrc, setVideoSrc] = useState('');
  const [progress, setProgress] = useState(0);

  const FRAME_RATE = 30;

  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        console.log('Starting to load FFmpeg...');
        ffmpegRef.current = createFFmpeg({ 
          log: true,
          corePath: 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js'
        });
        await ffmpegRef.current.load();
        console.log('FFmpeg loaded successfully');
        setIsFFmpegReady(true);
      } catch (error) {
        console.error("Failed to load ffmpeg.wasm", error);
        // FFmpegが失敗した場合でもファイル選択は可能にする
        setIsFFmpegReady(true);
      }
    };
    loadFFmpeg();
  }, []);

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused || videoRef.current.ended) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    return () => {
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
    };
  }, [videoSrc]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTimeUpdate = () => {
    if (videoRef.current?.duration) {
      const progressValue = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progressValue);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('File selected:', file.name, file.type);
    
    // ネイティブでサポートされているビデオ形式の場合は直接再生
    const supportedFormats = ['video/mp4', 'video/webm', 'video/ogg'];
    if (supportedFormats.includes(file.type)) {
      console.log('Using native video playback');
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      return;
    }

    // その他の形式はFFmpegで変換
    if (isFFmpegReady && ffmpegRef.current) {
      setIsConverting(true);
      try {
        console.log('Converting with FFmpeg...');
        const ffmpeg = ffmpegRef.current;
        ffmpeg.FS('writeFile', file.name, await fetchFile(file));
        await ffmpeg.run('-i', file.name, 'output.mp4');
        const data = ffmpeg.FS('readFile', 'output.mp4');
        const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
        setVideoSrc(url);
        console.log('Conversion completed');
      } catch (error) {
        console.error('Error during ffmpeg conversion', error);
        alert('変換中にエラーが発生しました。ファイル形式をご確認ください。');
      } finally {
        setIsConverting(false);
      }
    } else {
      alert('FFmpegが読み込まれていません。MP4, WebM, OGG形式のファイルを選択してください。');
    }
  };

  useEffect(() => {
    if (videoSrc && videoRef.current) {
      videoRef.current.play();
    }
  }, [videoSrc]);

  const handleVolumeChange = (e) => { if (videoRef.current) videoRef.current.volume = e.target.value; };
  const handleSpeedChange = (e) => { if (videoRef.current) videoRef.current.playbackRate = e.target.value; };
  const handleProgressClick = (e) => { if (videoRef.current?.duration) { videoRef.current.currentTime = (e.nativeEvent.offsetX / e.currentTarget.offsetWidth) * videoRef.current.duration; } };
  const handleFrameBack = () => { if (videoRef.current) videoRef.current.currentTime -= 1 / FRAME_RATE; };
  const handleFrameForward = () => { if (videoRef.current) videoRef.current.currentTime += 1 / FRAME_RATE; };
  const handleFullScreen = () => { if (playerContainerRef.current?.requestFullscreen) { playerContainerRef.current.requestFullscreen(); } };
  const handleScreenshot = () => { if (videoRef.current) { const canvas = document.createElement('canvas'); canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight; const ctx = canvas.getContext('2d'); ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height); const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'screenshot.png'; a.click(); } };
  const handleOpenFile = () => { fileInputRef.current.click(); };

  // 動画のメタデータが読み込まれた時の処理
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const aspectRatio = video.videoWidth / video.videoHeight;
      const container = document.querySelector('.video-container');
      
      if (container) {
        // アスペクト比に基づいてコンテナを調整
        if (aspectRatio < 1) {
          // 縦向き動画の場合
          container.style.paddingBottom = '0';
          container.style.height = 'auto';
          container.style.flex = '1';
        } else if (aspectRatio > 2) {
          // 超横長動画の場合
          container.style.paddingBottom = '25%';
        } else {
          // 通常の横向き動画
          container.style.paddingBottom = '56.25%';
        }
      }
      
      console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}, aspect ratio: ${aspectRatio.toFixed(2)}`);
    }
  };

  // ...existing code...

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoSrc]);

  // デバッグ用のログ
  useEffect(() => {
    console.log('FFmpeg Ready:', isFFmpegReady);
    console.log('Is Converting:', isConverting);
  }, [isFFmpegReady, isConverting]);

  return (
    <>
      <Head>
        <title>Grove Player - Video Player</title>
        <meta name="description" content="Modern video player with frame-by-frame control and screenshot features" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="/style.css" />
      </Head>
      
      <div className="player-container" ref={playerContainerRef}>
        <div className="video-container">
            <video 
              id="videoPlayer" 
              ref={videoRef} 
              src={videoSrc} 
              onTimeUpdate={handleTimeUpdate} 
              onLoadedMetadata={handleLoadedMetadata}
              onClick={togglePlayPause}
            ></video>
            <div className="overlay-buttons">
                <button onClick={handleScreenshot} title="Take Screenshot">📷 Screenshot</button>
            </div>
            {isConverting && <div className="loading-overlay">Converting...</div>}
        </div>
        <div className="controls-container">
            <div className="controls">
                <div className="controls-left">
                    <button onClick={togglePlayPause} title={isPlaying ? 'Pause' : 'Play'}>
                        {isPlaying ? '⏸️' : '▶️'}
                    </button>
                    <button onClick={handleFrameBack} title="Previous Frame">⏮️</button>
                    <button onClick={handleFrameForward} title="Next Frame">⏭️</button>
                </div>
                
                <div className="controls-center">
                    <span style={{ fontSize: '12px', minWidth: '50px' }}>Volume</span>
                    <input type="range" min="0" max="1" step="0.1" defaultValue="1" onChange={handleVolumeChange} title="Volume" />
                    <div className="progress-container" onClick={handleProgressClick} title="Seek">
                        <div id="progressBar" style={{width: `${progress}%`}}></div>
                    </div>
                    <span style={{ fontSize: '12px', minWidth: '40px' }}>Speed</span>
                    <input type="range" min="0.5" max="2" step="0.1" defaultValue="1" onChange={handleSpeedChange} title="Playback Speed" />
                </div>
                
                <div className="controls-right">
                    <button onClick={handleFullScreen} title="Fullscreen">⛶</button>
                    <button 
                        onClick={handleOpenFile} 
                        className="open-file-btn" 
                        disabled={isConverting} 
                        title={`Open Video File ${isConverting ? '(Converting...)' : !isFFmpegReady ? '(MP4/WebM/OGG only)' : ''}`}
                    >
                        📁 Open File {isConverting && ' (Converting...)'}
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <input 
      type="file" 
      ref={fileInputRef} 
      onChange={handleFileChange} 
      accept="video/*,audio/*" 
      style={{ display: 'none' }}
    />
    </>
  );
}