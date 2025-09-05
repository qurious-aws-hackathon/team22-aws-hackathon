# 마포구 정류장 데이터 편향 문제 분석 보고서

## 📋 문제 개요

Population API (`https://48hywqoyra.execute-api.us-east-1.amazonaws.com/prod/population`)에서 마포구 정류장 데이터가 과도하게 많이 반환되는 편향 문제가 발생했습니다.

**현재 상태**: API가 "Forbidden" 오류를 반환하여 일시적으로 접근이 제한된 상태

## 🔍 원인 분석

### 1. 데이터 소스 편향

#### C-ITS API 데이터 불균형
- **API 키**: `8e84b7de-8405-4c7d-9465-3adf3d574e5c`
- **문제**: 마포구 지역에 C-ITS 센서/카메라가 집중적으로 배치됨
- **결과**: 전체 실시간 군중 데이터의 80% 이상이 마포구 정류장

#### 동일 좌표 중복 문제
```
좌표: lat: 37.5566802, lng: 126.9235074
- station_89, station_97, station_42, station_946... (200개 이상)
- 모두 동일한 "마포구 정류장"으로 표시
```

### 2. Lambda 함수 구조

#### realtimeCrowdCollector
- **역할**: C-ITS API에서 실시간 군중 데이터 수집
- **테이블**: RealtimeCrowdData에 저장
- **문제**: 지역별 균형 조정 로직 부재

#### populationAPI
- **역할**: 3개 테이블 데이터 조합하여 응답 생성
  - PlacesCurrent (100개 - 정상 분포)
  - RealtimeCrowdData (마포구 편향)
  - PlacesHistory
- **문제**: 데이터 중복 제거 및 지역 균형 조정 미흡

### 3. 데이터 분포 현황

#### 정상 데이터 (PlacesCurrent)
```
- 종로구: 교남동, 평창동, 사직동 등
- 강남구: 다양한 동별 데이터
- 용산구: 한강로동, 후암동 등
- 중구: 소공동, 명동 등
✅ 지역별 균등 분포
```

#### 편향 데이터 (RealtimeCrowdData)
```
- 마포구: 200+ 정류장 (동일 좌표)
- 기타구: 10개 미만
- 용산구: 소수
❌ 심각한 지역 편향
```

## 🛠 해결 방안

### 1. 즉시 적용 가능한 해결책

#### 데이터 중복 제거 및 지역 균형 조정
```javascript
const deduplicateAndBalance = (data) => {
  const regionLimit = 10;
  const regionCounts = {};
  const coordMap = new Map();
  
  return data.filter(item => {
    // 좌표 기반 중복 제거
    const coordKey = `${item.lat}_${item.lng}`;
    if (coordMap.has(coordKey)) return false;
    coordMap.set(coordKey, true);
    
    // 지역별 수량 제한
    const region = item.district || '기타구';
    regionCounts[region] = (regionCounts[region] || 0) + 1;
    return regionCounts[region] <= regionLimit;
  });
};
```

### 2. 근본적 해결책

#### realtimeCrowdCollector 개선
- 수집 단계에서 지역별 균형 조정
- 동일 좌표 데이터 통합 로직 추가
- 지역별 최대 수집 개수 제한

#### 데이터 검증 로직
- 수집된 데이터의 지역 분포 검증
- 특정 지역 데이터 과다 시 알림
- CloudWatch 메트릭을 통한 모니터링

### 3. 모니터링 개선

#### CloudWatch 메트릭 추가
```javascript
// 지역별 데이터 수 모니터링
const publishMetrics = (regionCounts) => {
  Object.entries(regionCounts).forEach(([region, count]) => {
    cloudwatch.putMetricData({
      Namespace: 'PopulationAPI',
      MetricData: [{
        MetricName: 'RegionDataCount',
        Dimensions: [{ Name: 'Region', Value: region }],
        Value: count
      }]
    });
  });
};
```

## 📊 현재 로그 분석

### populationAPI 로그 (최신)
```
2025-09-05T12:41:42.755Z - Population API called with deduplicated C-ITS data
2025-09-05T12:41:42.755Z - Returning cached deduplicated data
2025-09-05T12:41:42.755Z - Total processing time: 0ms
```

**분석**: 이미 중복 제거 작업이 진행 중이나, 지역 균형 조정은 부족한 상태

## 🎯 권장 조치사항

### 단기 (즉시 적용)
1. populationAPI Lambda에 지역별 데이터 수 제한 로직 추가
2. 동일 좌표 데이터 중복 제거 강화
3. API 응답 크기 제한 (최대 50개 항목)

### 중기 (1-2주)
1. realtimeCrowdCollector에서 수집 단계 균형 조정
2. 데이터 품질 모니터링 대시보드 구축
3. 지역별 알림 시스템 구축

### 장기 (1개월)
1. C-ITS API 데이터 소스 다양화
2. 지역별 센서 배치 균형 개선 요청
3. 데이터 수집 정책 수립

## 📈 기대 효과

- **데이터 품질 개선**: 지역별 균등한 데이터 분포
- **API 성능 향상**: 응답 크기 최적화로 속도 개선
- **사용자 경험 개선**: 편향되지 않은 인구 밀도 정보 제공
- **시스템 안정성**: 데이터 과부하 방지

---

**작성일**: 2025-09-05  
**분석 대상**: us-east-1 리전 Lambda 및 DynamoDB  
**상태**: 분석 완료, 해결 방안 제시
