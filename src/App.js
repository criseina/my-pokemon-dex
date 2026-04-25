import React, { useState, useEffect, useRef } from 'react';
import * as tmImage from '@teachablemachine/image';
import pokemonData from './pokemon_data.json';

function App() {
  const [model, setModel] = useState(null);
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [rawLabel, setRawLabel] = useState("");
  const [previewImage, setPreviewImage] = useState(null); // 찍은 사진 미리보기
  const [modelReady, setModelReady] = useState(false);    // 모델 로딩 상태

  const cameraInputRef = useRef(null);  // 카메라 앱 호출용
  const fileInputRef = useRef(null);    // 불러오기용

  const modelPath = process.env.PUBLIC_URL + "/model/";

  useEffect(() => {
    async function loadModel() {
      try {
        const loadedModel = await tmImage.load(
          modelPath + "model.json",
          modelPath + "metadata.json"
        );
        setModel(loadedModel);
        setModelReady(true);
      } catch (error) {
        console.error("모델 로드 실패:", error);
      }
    }
    loadModel();
  }, []);

  // ── 공통 이미지 분석 함수 ─────────────────────────────────
  const analyzeImage = async (file) => {
    if (!model || isAnalyzing) return;
    setIsAnalyzing(true);
    setResult(null);

    try {
      // 미리보기 이미지 표시
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);

      // Image 객체로 변환 후 canvas 경유
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 224;
        canvas.height = 224;
        canvas.getContext('2d').drawImage(img, 0, 0, 224, 224);

        const prediction = await model.predict(canvas);
        const sorted = prediction.sort((a, b) => b.probability - a.probability);
        const topResult = sorted[0];

        console.log("예측 결과:", sorted.map(p => `${p.className}: ${Math.round(p.probability * 100)}%`));

        setRawLabel(topResult.className);
        const found = pokemonData.find(p => p.name === topResult.className);

        if (found) {
          setResult(found);
        } else {
          setResult({
            name: topResult.className,
            type: ["이름 불일치"],
            image: "/images/unknown.png",
            moves: [{ name: "JSON의 name을 확인하세요", power: 0 }]
          });
        }
        setIsAnalyzing(false);
      };
      img.src = previewUrl;

    } catch (error) {
      console.error("분석 오류:", error);
      setIsAnalyzing(false);
    }
  };

  const handleCameraCapture = (e) => {
    const file = e.target.files[0];
    if (file) analyzeImage(file);
    e.target.value = ''; // 같은 사진 재촬영 가능하게 초기화
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) analyzeImage(file);
    e.target.value = '';
  };

  return (
    <div style={{
      textAlign: 'center',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ color: '#e3350d' }}>나의 포켓몬 도감</h1>

      {/* ── 모델 로딩 중 표시 ── */}
      {!modelReady && (
        <div style={{ color: '#888', margin: '20px' }}>
          🔄 AI 모델 로딩 중...
        </div>
      )}

      {/* ── 사진 미리보기 영역 ── */}
      <div style={{
        display: 'inline-block',
        backgroundColor: '#333',
        padding: '10px',
        borderRadius: '20px',
        boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
        width: '320px',
        height: '240px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {previewImage ? (
          <img
            src={previewImage}
            alt="촬영된 사진"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: '10px',
              backgroundColor: 'black'
            }}
          />
        ) : (
          <div style={{
            color: '#aaa',
            paddingTop: '90px',
            fontSize: '15px'
          }}>
            📷 촬영하기 버튼을 눌러주세요
          </div>
        )}

        {/* 분석 중 오버레이 */}
        {isAnalyzing && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px'
          }}>
            🔍 분석 중...
          </div>
        )}
      </div>

      {/* ── 버튼 영역 ── */}
      <div style={{
        marginTop: '20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '10px'
      }}>
        {/* 카메라 앱 실행 버튼 */}
        <button
          onClick={() => cameraInputRef.current.click()}
          disabled={isAnalyzing || !modelReady}
          style={{
            padding: '15px 25px',
            fontSize: '16px',
            cursor: isAnalyzing || !modelReady ? 'not-allowed' : 'pointer',
            borderRadius: '50px',
            border: 'none',
            backgroundColor: isAnalyzing || !modelReady ? '#ccc' : '#ffcc00',
            color: '#333',
            fontWeight: 'bold',
            boxShadow: '0 4px #cc9900'
          }}>
          📸 촬영하기
        </button>

        {/* 갤러리 불러오기 버튼 */}
        <button
          onClick={() => fileInputRef.current.click()}
          disabled={isAnalyzing || !modelReady}
          style={{
            padding: '15px 25px',
            fontSize: '16px',
            cursor: isAnalyzing || !modelReady ? 'not-allowed' : 'pointer',
            borderRadius: '50px',
            border: 'none',
            backgroundColor: isAnalyzing || !modelReady ? '#ccc' : '#30a7d7',
            color: 'white',
            fontWeight: 'bold',
            boxShadow: '0 4px #1d7ba1'
          }}>
          📁 불러오기
        </button>
      </div>

      {/* ── 숨김 input들 ── */}
      {/* 카메라 앱 실행 (capture="environment" = 후면카메라) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        style={{ display: 'none' }}
      />
      {/* 갤러리/파일 선택 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* ── 결과 표시 ── */}
      {result && (
        <div style={{
          marginTop: '30px',
          padding: '25px',
          backgroundColor: 'white',
          borderRadius: '25px',
          border: '6px solid #ffcc00',
          display: 'inline-block',
          width: '85%',
          maxWidth: '380px',
          boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
        }}>
          <div style={{ color: '#aaa', fontSize: '14px', marginBottom: '10px' }}>
            AI Label: {rawLabel}
          </div>

          <div style={{
            marginBottom: '15px',
            height: '150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img
              src={process.env.PUBLIC_URL + result.image}
              alt={result.name}
              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
              onError={(e) => { e.target.src = process.env.PUBLIC_URL + '/images/unknown.png'; }}
            />
          </div>

          <h2 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '28px', fontWeight: 'bold' }}>
            {result.name}
          </h2>

          <div style={{ margin: '15px 0' }}>
            {result.type.map(t => (
              <span key={t} style={{
                backgroundColor: '#30a7d7',
                color: 'white',
                padding: '6px 15px',
                borderRadius: '8px',
                marginRight: '5px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                {t}
              </span>
            ))}
          </div>

          <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '20px 0' }} />

          <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
            {result.moves.map((move, index) => (
              <li key={index} style={{
                marginBottom: '12px',
                fontSize: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px',
                backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white',
                borderRadius: '8px'
              }}>
                <strong style={{ color: '#333' }}>{move.name}</strong>
                <span style={{ color: '#e3350d', fontWeight: 'bold' }}>위력 {move.power}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;