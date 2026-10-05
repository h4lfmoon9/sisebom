시세봄 11단계 - Tavily 플랫폼별 검색

사용법
1. 이 ZIP 안의 apply-step11.js, apply-step11.bat 파일을 sisebom 폴더 최상단에 넣습니다.
   (server 폴더와 같은 위치)
2. apply-step11.bat를 더블클릭합니다.
3. '시세봄 11단계 적용 완료'가 뜨면 성공입니다.
4. GitHub Desktop에서 커밋 후 Push origin 합니다.
5. Render 배포가 끝나면 아래 주소를 다시 확인합니다.
   https://sisebom.onrender.com/api/live/diagnose?q=아이폰%2015

정상 적용 확인
- diagnosticsVersion: 5
- searchMode: "per-platform-domain"
- 각 플랫폼 결과에 rawCount / sampleUrls 표시

GitHub Summary:
Tavily 플랫폼별 매물 탐색 11단계

참고
- server/liveDiagnostics.js.step10-backup 파일은 자동 백업본입니다.
- API 키는 이 ZIP이나 GitHub에 들어가지 않습니다.
