import { useState, useEffect, useRef } from 'react';
import { imageUploadApi } from '../api/imageUpload';

interface PinRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  onAlert?: (type: 'success' | 'error', message: string) => void;
  onSubmit: (data: {
    name: string;
    description: string;
    category: string;
    noiseLevel: number;
    rating: number;
    image_url?: string;
    isNoiseRecorded: boolean;
  }) => void;
}

const PinRegistrationModal: React.FC<PinRegistrationModalProps> = ({
  isOpen,
  onClose,
  lat,
  lng,
  onAlert,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '카페',
    noiseLevel: 30,
    rating: 5,
    isNoiseRecorded: false
  });
  const [, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [address, setAddress] = useState('주소를 가져오는 중...');
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // 주소 변환
  useEffect(() => {
    if (isOpen) {

      // 약간의 지연을 두고 주소 변환 시도
      setTimeout(() => {
        if ((window as any).kakao?.maps?.services) {
          const geocoder = new (window as any).kakao.maps.services.Geocoder();

          // coord2Address 메서드 사용 (경도, 위도 순서 주의)
          geocoder.coord2Address(lng, lat, (result: any, status: any) => {

            if (status === (window as any).kakao.maps.services.Status.OK && result.length > 0) {
              const addr = result[0];

              let addressText = '';

              // 도로명 주소 우선
              if (addr.road_address) {
                addressText = addr.road_address.address_name;
              }
              // 지번 주소 대체
              else if (addr.address) {
                addressText = addr.address.address_name;
              }

              // 상세 주소 정보 추가
              if (addr.road_address && addr.road_address.building_name) {
                addressText += ` (${addr.road_address.building_name})`;
              }

              setAddress(addressText || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            } else {
              setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
          });
        } else {
          setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      }, 500);
    }
  }, [isOpen, lat, lng]);

  const startNoiseMeasurement = async () => {
    try {
      setIsMeasuring(true);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMediaStream(stream);

      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(context);

      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      source.connect(analyser);

      measureNoise();
    } catch (error) {
      console.error('마이크 접근 실패:', error);
      alert('마이크 접근 권한이 필요합니다.');
      setIsMeasuring(false);
    }
  };

  const measureNoise = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // RMS 계산으로 소음도 측정
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);

    // dB 변환 (대략적인 계산)
    const db = Math.min(80, Math.max(20, 20 + (rms / 255) * 60));

    setFormData(prev => ({
      ...prev,
      noiseLevel: Math.round(db),
      isNoiseRecorded: true
    }));

    animationRef.current = requestAnimationFrame(measureNoise);
  };

  const stopNoiseMeasurement = () => {
    setIsMeasuring(false);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }

    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }

    analyserRef.current = null;
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload image immediately
      setIsUploadingImage(true);
      try {
        const uploadResult = await imageUploadApi.uploadImage(file);
        setUploadedImageUrl(uploadResult.imageUrl);
      } catch (error) {
        console.error('Image upload failed:', error);
        if (onAlert) {
          onAlert('error', '이미지 업로드에 실패했습니다.');
        }
        setSelectedImage(null);
        setImagePreview('');
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    if (onAlert) {
      onAlert('success', '주소가 복사되었습니다!');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    stopNoiseMeasurement();

    onSubmit({
      ...formData,
      image_url: uploadedImageUrl || undefined,
      isNoiseRecorded: formData.isNoiseRecorded
    });
    onClose();
    setFormData({
      name: '',
      description: '',
      category: '카페',
      noiseLevel: 30,
      rating: 5,
      isNoiseRecorded: false
    });
    setSelectedImage(null);
    setImagePreview('');
    setUploadedImageUrl('');
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => (
      <span
        key={index}
        onClick={() => setFormData(prev => ({ ...prev, rating: index + 1 }))}
        style={{
          fontSize: '1.5rem',
          cursor: 'pointer',
          color: index < formData.rating ? '#FFD700' : '#DDD',
          marginRight: '0.25rem'
        }}
      >
        ★
      </span>
    ));
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopNoiseMeasurement();
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        stopNoiseMeasurement();
        onClose();
      }
    }}
    >
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '2rem',
        width: '90%',
        maxWidth: '400px',
        maxHeight: '80vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ margin: 0, color: '#333' }}>🤫 쉿플레이스 등록</h2>
          <button
            onClick={() => {
              stopNoiseMeasurement();
              onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          marginBottom: '1rem',
          fontSize: '0.9rem',
          color: '#666'
        }}>
          <div style={{
            cursor: 'pointer',
            padding: '0.5rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            border: '1px dashed #ddd',
            marginBottom: '0.5rem'
          }}
          onClick={copyAddress}
          title="클릭하여 주소 복사"
          >
            📍 {address}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: '#999',
            padding: '0.25rem 0.5rem'
          }}>
            <span>위도: {lat.toFixed(8)}</span>
            <span>경도: {lng.toFixed(8)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 사진 업로드 */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              사진
            </label>
            <div style={{
              width: '100%',
              height: '150px',
              border: '2px dashed #ddd',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundColor: '#f8f9fa',
              overflow: 'hidden',
              position: 'relative'
            }}
            onClick={() => document.getElementById('imageInput')?.click()}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="미리보기"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#666' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
                  <div>{isUploadingImage ? '업로드 중...' : '사진을 선택해주세요'}</div>
                </div>
              )}
              {isUploadingImage && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  borderRadius: '8px'
                }}>
                  업로드 중...
                </div>
              )}
            </div>
            <input
              id="imageInput"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              장소명 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
              placeholder="예: 조용한 카페"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem',
                minHeight: '80px',
                resize: 'vertical'
              }}
              placeholder="이 장소에 대한 설명을 입력해주세요"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              카테고리
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              <option value="카페">카페</option>
              <option value="도서관">도서관</option>
              <option value="공원">공원</option>
              <option value="기타">기타</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: '600' }}>
                소음도: {formData.noiseLevel}dB {formData.isNoiseRecorded && '🎤'}
              </label>
              <button
                type="button"
                onClick={isMeasuring ? stopNoiseMeasurement : startNoiseMeasurement}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '6px',
                  background: isMeasuring ? '#ff4757' : '#2ed573',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                {isMeasuring ? '🛑 측정 중지' : '🎤 실시간 측정'}
              </button>
            </div>
            <input
              type="range"
              min="20"
              max="80"
              value={formData.noiseLevel}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                noiseLevel: parseInt(e.target.value),
                isNoiseRecorded: false
              }))}
              disabled={isMeasuring}
              style={{ width: '100%', opacity: isMeasuring ? 0.5 : 1 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#666' }}>
              <span>매우 조용함</span>
              <span>시끄러움</span>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              평점
            </label>
            <div style={{ marginBottom: '0.5rem' }}>
              {renderStars()}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              {formData.rating}점 / 5점
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => {
                stopNoiseMeasurement();
                onClose();
              }}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              취소
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '0.75rem',
                border: 'none',
                borderRadius: '8px',
                background: '#667eea',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              등록
            </button>
          </div>
        </form>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default PinRegistrationModal;
