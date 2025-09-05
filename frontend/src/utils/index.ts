// 조용함 지수 계산
export const calculateQuietScore = (noiseLevel: number, crowdLevel: number, population: number): number => {
  let score = 100;
  score -= noiseLevel * 25;
  score -= crowdLevel * 20;
  
  if (population > 10000) score -= 15;
  else if (population > 5000) score -= 10;
  else if (population > 2000) score -= 5;
  
  return Math.max(10, Math.min(100, score));
};

// 점수에 따른 텍스트 반환
export const getScoreText = (score: number): string => {
  if (score >= 80) return '매우 조용함';
  if (score >= 60) return '조용함';
  if (score >= 40) return '보통';
  if (score >= 20) return '시끄러움';
  return '매우 시끄러움';
};

// 점수에 따른 색상 반환
export const getScoreColor = (score: number): string => {
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#87CEEB';
  if (score >= 40) return '#90EE90';
  if (score >= 20) return '#FFA726';
  return '#FF6B6B';
};

// 점수에 따른 이모지 반환
export const getScoreEmoji = (score: number): string => {
  if (score >= 80) return '🤫';
  if (score >= 60) return '😌';
  if (score >= 40) return '😐';
  if (score >= 20) return '😵';
  return '🔊';
};

// 카카오 지도 API 로드
export const loadKakaoMapScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).kakao && (window as any).kakao.maps) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=9aad82b3e0f110046a739e949ebbd947`;
    script.async = true;
    
    script.onload = () => {
      setTimeout(() => {
        if ((window as any).kakao && (window as any).kakao.maps) {
          resolve();
        } else {
          reject(new Error('카카오 지도 API 로드 실패'));
        }
      }, 500);
    };
    
    script.onerror = reject;
    document.head.appendChild(script);
  });
};
