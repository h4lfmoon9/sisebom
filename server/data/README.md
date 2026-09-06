# 시세봄 제조사별 스마트폰 DB

각 JSON 파일은 제조사/브랜드별 제품 목록입니다.

- apple.json
- samsung.json
- xiaomi.json
- poco.json
- redmi.json
- motorola.json
- google.json

`verified: true`
- 현재 시세봄 프로토타입에서 세부 정보가 채워진 제품

`verified: false`
- 검색 가능한 제품명/시리즈 틀만 먼저 등록한 제품
- 잘못된 정보를 만들지 않기 위해 미확인 스펙/가격/이미지는 null 또는 빈 값으로 둠

공식 자료를 확인하면 해당 제품 객체의:
storage / launchPrices / specs / scores / colors / officialSource
를 채우면 됩니다.

색상별 공식 이미지가 없으면 `image: null`을 유지합니다.
