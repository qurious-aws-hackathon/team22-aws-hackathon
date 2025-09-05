# 쉿플레이스 데이터 통합 전략

## 현재 상황
- Lambda로 외부 API 호출하여 실시간 데이터 수집 계획
- 혼잡도/소음도 데이터의 시계열 특성 고려 필요

## AWS 시계열 데이터 저장소 추천: Amazon Timestream

### 왜 Timestream인가?
1. **시계열 데이터 최적화**: 혼잡도/소음도는 시간에 따른 변화가 핵심
2. **자동 압축**: 오래된 데이터 자동 압축으로 비용 절약
3. **빠른 쿼리**: 시간 범위 기반 쿼리 최적화
4. **서버리스**: 관리 부담 없음

### 제안 아키텍처
```
EventBridge (5분 간격) 
→ Data Collection Lambda 
→ Timestream Database
→ API Lambda (쿼리용)
→ Frontend
```

### DynamoDB vs Timestream 비교
| 기능 | DynamoDB | Timestream |
|------|----------|------------|
| 시계열 쿼리 | 복잡한 GSI 필요 | 네이티브 지원 |
| 데이터 압축 | 수동 관리 | 자동 |
| 비용 (대용량) | 높음 | 낮음 |
| 집계 쿼리 | 애플리케이션 레벨 | SQL 지원 |

### 구현 방안
1. **Timestream 테이블 구조**:
   - `place_metrics` 테이블
   - Dimensions: place_id, data_type (noise/crowd)
   - Measures: value, confidence_score

2. **데이터 수집 주기**: 5분 간격 (EventBridge)

3. **쿼리 패턴**:
   - 최근 1시간 평균값
   - 시간대별 패턴 분석
   - 장소별 트렌드

### 비용 최적화
- 메모리 스토어: 최근 1일 (빠른 조회)
- 마그네틱 스토어: 1일 이후 (저렴한 장기 보관)

이 방식이 Lambda 직접 호출보다 확장성과 비용 면에서 유리합니다. 어떻게 생각하시나요?
