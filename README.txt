시세봄 STEP7 백엔드 전용 수정본

1. 이 폴더 안의 server 폴더 내용을 기존 sisebom/server 폴더에 덮어쓰기
2. server/data 폴더는 삭제하지 말 것
3. GitHub Desktop에서 Commit + Push origin
4. Render 재배포 후 확인:
   https://sisebom.onrender.com/api/health
   https://sisebom.onrender.com/api/live/status

/api/live/status 에서 당근/번개장터/중고나라 3개가 모두 loaded:true 로 보여야 정상입니다.
