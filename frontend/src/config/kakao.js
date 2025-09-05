// 카카오 API 설정
export const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_API_KEY;

console.log('환경변수 확인:', KAKAO_API_KEY);

// 카카오 지도 API 로드
export const loadKakaoMapScript = () => {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_API_KEY}&autoload=false`;
    console.log('카카오 API 로드 URL:', script.src);
    script.onload = () => {
      window.kakao.maps.load(() => {
        resolve();
      });
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};
