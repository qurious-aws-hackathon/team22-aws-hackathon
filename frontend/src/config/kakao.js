// 카카오 API 설정
export const KAKAO_API_KEY = '9aad82b3e0f110046a739e949ebbd947';

// 카카오 지도 API 로드 (단순화)
export const loadKakaoMapScript = () => {
  return new Promise((resolve, reject) => {
    // 이미 로드되어 있으면 바로 resolve
    if (window.kakao && window.kakao.maps) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}`;
    script.async = true;
    
    script.onload = () => {
      // 스크립트 로드 후 잠시 대기
      setTimeout(() => {
        if (window.kakao && window.kakao.maps) {
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
