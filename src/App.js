import React, { useState, useEffect, useRef } from 'react';
import * as tmImage from '@teachablemachine/image';
import pokemonData from './pokemon_data.json'; 

function App() {
  const [model, setModel] = useState(null);
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [rawLabel, setRawLabel] = useState("");
  const videoRef = useRef();
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const modelPath = process.env.PUBLIC_URL + "/model/";

  useEffect(() => {
    async function loadModel() {
      try {
        const loadedModel = await tmImage.load(
          modelPath + "model.json", 
          modelPath + "metadata.json"
        );
        setModel(loadedModel);
        startVideo();
      } catch (error) {
        console.error("모델 로드 실패:", error);
      }
    }
    loadModel();
  }, []);

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
  };

  const analyzeImage = async (imageSource) => {
    if (!model || isAnalyzing) return;
    setIsAnalyzing(true);
    setResult(null);

    try {
      // ── 디버깅 로그 1: 전달된 이미지 정보 확인 ──
      console.log("=== 분석 시작 ===");
      console.log("전달된 타입:", imageSource.tagName);
      console.log("전달된 크기:", imageSource.width, "x", imageSource.height);

      const prediction = await model.predict(imageSource);

      // ── 디버깅 로그 2: 전체 예측 확률 확인 ──
      console.log("=== 전체 예측 결과 ===");
      prediction
        .sort((a, b) => b.probability - a.probability)
        .forEach(p => {
          console.log(`  ${p.className}: ${Math.round(p.probability * 100)}%`);
        });

      const topResult = prediction.sort((a, b) => b.probability - a.probability)[0];
      console.log("최종 선택:", topResult.className, Math.round(topResult.probability * 100) + "%");
      
      setRawLabel(topResult.className);

      const found = pokemonData.find(p => p.name === topResult.className);

      // ── 디버깅 로그 3: JSON 매칭 결과 확인 ──
      console.log("JSON 매칭 결과:", found ? "찾음 ✅" : "못 찾음 ❌");
      if (!found) {
        console.log("AI가 인식한 이름:", topResult.className);
        console.log("JSON에 있는 이름 목록:", pokemonData.map(p => p.name));
      }

      if (found) {
        setResult(found);
      } else {
        setResult({ 
          name: topResult.className, 
          type: ["이름 불일치"], 
          image: "/images/unknown.png",
          moves: [{name: "JSON의 name을 확인하세요", power: 0}] 
        });
      }
    } catch (error) {
      console.error("분석 오류 발생:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const takePhotoAndScan = async () => {
    if (!model || isAnalyzing) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    analyzeImage(canvas);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // ── 디버깅 로그 4: 원본 이미지 크기 확인 ──
        console.log("=== 파일 업로드 ===");
        console.log("원본 이미지 크기:", img.width, "x", img.height);

        // canvas를 거쳐 224x224로 정규화 후 전달
        const canvas = canvasRef.current;
        canvas.width = 224;
        canvas.height = 224;
        canvas.getContext('2d').drawImage(img, 0, 0, 224, 224);

        console.log("canvas 변환 크기:", canvas.width, "x", canvas.height);
        analyzeImage(canvas);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ textAlign: 'center', backgroundColor: '#f0f0f0', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#e3350d' }}>나의 포켓몬 도감</h1>
      
      <div style={{ position: 'relative', display: 'inline-block', backgroundColor: '#333', padding: '10px', borderRadius: '20px', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
        <video ref={videoRef} autoPlay playsInline width="320" height="240" style={{ borderRadius: '10px', display: 'block' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      
      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <button onClick={takePhotoAndScan} disabled={isAnalyzing || !model}
          style={{ padding: '15px 25px', fontSize: '16px', cursor: 'pointer', borderRadius: '50px', border: 'none', backgroundColor: '#ffcc00', color: '#333', fontWeight: 'bold', boxShadow: '0 4px #cc9900' }}>
          📸 촬영하기
        </button>

        <button onClick={() => fileInputRef.current.click()} disabled={isAnalyzing || !model}
          style={{ padding: '15px 25px', fontSize: '16px', cursor: 'pointer', borderRadius: '50px', border: 'none', backgroundColor: '#30a7d7', color: 'white', fontWeight: 'bold', boxShadow: '0 4px #1d7ba1' }}>
          📁 불러오기
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      {result && (
        <div style={{ 
          marginTop: '30px', padding: '25px', backgroundColor: 'white', 
          borderRadius: '25px', border: '6px solid #ffcc00', 
          display: 'inline-block', width: '85%', maxWidth: '380px', 
          boxShadow: '0 10px 20px rgba(0,0,0,0.1)' 
        }}>
          <div style={{ color: '#aaaaaa', fontSize: '16px', marginBottom: '20px', textAlign: 'center' }}>
            AI Label: {rawLabel}
          </div>

          <div style={{ marginBottom: '15px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img 
              src={process.env.PUBLIC_URL + result.image} 
              alt={result.name} 
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
              onError={(e) => { e.target.src = process.env.PUBLIC_URL + '/images/unknown.png'; }} 
            />
          </div>

          <h2 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '28px', fontWeight: 'bold' }}>{result.name}</h2>
          
          <div style={{ margin: '15px 0' }}>
            {result.type.map(t => (
              <span key={t} style={{ backgroundColor: '#30a7d7', color: 'white', padding: '6px 15px', borderRadius: '8px', marginRight: '5px', fontSize: '14px', fontWeight: 'bold' }}>
                {t}
              </span>
            ))}
          </div>
          
          <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '20px 0' }} />
          
          <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
            {result.moves.map((move, index) => (
              <li key={index} style={{ 
                marginBottom: '12px', fontSize: '16px', 
                display: 'flex', justifyContent: 'space-between',
                padding: '10px',
                backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white',
                borderRadius: '8px'
              }}>
                <strong style={{ color: '#333' }}>{move.name}</strong> 
                <span style={{color: '#e3350d', fontWeight: 'bold'}}>위력 {move.power}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;