// 게임 데이터: 8개 부서, 25명 인원(재디자인 캐릭터), 임무, 순찰 경로, 혼잣말 대사.
export const DEPTS = [
  { id: 1, key: 'operation', no: '제 1 부서', en: 'Operation', ko: '중요업무처리팀', color: '#d8b45a', room: 'operation', roomKo: '중앙 지휘실' },
  { id: 2, key: 'rager', no: '제 2 부서', en: 'Rager', ko: '공격팀', color: '#c4553f', room: 'rager', roomKo: '전투 훈련장' },
  { id: 3, key: 'defencer', no: '제 3 부서', en: 'Defencer', ko: '방어팀', color: '#6a8fc0', room: 'defencer', roomKo: '방어 초소' },
  { id: 4, key: 'requester', no: '제 4 부서', en: 'Requester', ko: '의뢰 수행팀', color: '#b9a37d', room: 'requester', roomKo: '의뢰 접수실' },
  { id: 5, key: 'medical', no: '제 5 부서', en: 'Medical', ko: '치료팀', color: '#72b79d', room: 'medical', roomKo: '의무실' },
  { id: 6, key: 'raider', no: '제 6 부서', en: 'Raider', ko: '습격팀', color: '#8f9e52', room: 'raider', roomKo: '작전 준비실' },
  { id: 7, key: 'aerial', no: '제 7 부서', en: 'Aerial Striker', ko: '공중 지원팀', color: '#8fc6dc', room: 'aerial', roomKo: '옥상 헬기장' },
  { id: 8, key: 'carrier', no: '제 8 부서', en: 'Carrier', ko: '운송팀', color: '#c98d4c', room: 'carrier', roomKo: '차량 정비고' },
];
export const DEPT = Object.fromEntries(DEPTS.map((d) => [d.key, d]));

// 방 목록(부서 방 8 + 중앙 복도)
export const ROOM_LABEL = { ...Object.fromEntries(DEPTS.map((d) => [d.room, d.roomKo])), lobby: '중앙 복도(휴게)' };

// stats: cmb 전투 / def 방어 / mob 기동 / med 의료 / int 정보
const S = (cmb, def, mob, med, int) => ({ cmb, def, mob, med, int });
// look: skin, hair, coat, coat2(그림자/안감), pants, hat(none|cap|beret|helm|hood|headset|goggles), extra(none|scarf|mask|vest|glasses)
export const ROSTER = [
  { id: 'c25', name: '유승호', role: '중요업무 팀장', dept: 'operation', stats: S(62, 58, 54, 34, 95), look: { skin: '#e0b490', hair: '#17121a', hair2: '#c0261c', coat: '#2d2a33', coat2: '#1c1a22', pants: '#17161a', hat: 'none', extra: 'none' } },
  { id: 'c01', name: '한서윤', role: '총괄 지휘관', dept: 'operation', stats: S(48, 52, 50, 40, 90), look: { skin: '#e3b894', hair: '#1c1a1f', coat: '#3a2f27', coat2: '#251e19', pants: '#1d1b1c', hat: 'cap', extra: 'none' } },
  { id: 'c02', name: '라이언 코발', role: '작전 분석관', dept: 'operation', stats: S(44, 46, 48, 38, 82), look: { skin: '#d8a982', hair: '#6b4a2b', coat: '#4a4339', coat2: '#2e2a24', pants: '#201e1d', hat: 'headset', extra: 'glasses' } },
  { id: 'c03', name: '백도현', role: '기밀 관리관', dept: 'operation', stats: S(40, 55, 46, 35, 86), look: { skin: '#e8c4a2', hair: '#111', coat: '#2f3238', coat2: '#1d1f24', pants: '#191a1c', hat: 'none', extra: 'mask' } },
  { id: 'c04', name: '강태오', role: '돌격 리더', dept: 'rager', stats: S(90, 60, 68, 30, 42), look: { skin: '#cf9c76', hair: '#2a1a14', coat: '#4d2f2a', coat2: '#331f1c', pants: '#222', hat: 'none', extra: 'vest' } },
  { id: 'c05', name: '미라 볼코프', role: '화력 담당', dept: 'rager', stats: S(86, 52, 60, 28, 46), look: { skin: '#e7c3ab', hair: '#8a8a92', coat: '#503a33', coat2: '#32241f', pants: '#1f1d1d', hat: 'goggles', extra: 'scarf' } },
  { id: 'c06', name: '오진석', role: '근접 전투원', dept: 'rager', stats: S(82, 66, 58, 30, 40), look: { skin: '#c68e69', hair: '#0e0e10', coat: '#43342c', coat2: '#2a201b', pants: '#201f1f', hat: 'helm', extra: 'none' } },
  { id: 'c07', name: '석규민', role: '방어 대장', dept: 'defencer', stats: S(62, 92, 44, 36, 50), look: { skin: '#d4a47e', hair: '#1a1a1a', coat: '#2c3a4c', coat2: '#1c2633', pants: '#1b1d22', hat: 'helm', extra: 'vest' } },
  { id: 'c08', name: '아이린 하트', role: '요인 경호', dept: 'defencer', stats: S(64, 86, 54, 40, 58), look: { skin: '#ecc9b0', hair: '#352015', coat: '#26323f', coat2: '#18212b', pants: '#17181b', hat: 'headset', extra: 'glasses' } },
  { id: 'c09', name: '노기범', role: '초소 근무자', dept: 'defencer', stats: S(56, 80, 46, 34, 44), look: { skin: '#c99a76', hair: '#3b3b3b', coat: '#334255', coat2: '#202b38', pants: '#1c1e22', hat: 'cap', extra: 'none' } },
  { id: 'c10', name: '유채원', role: '의뢰 접수관', dept: 'requester', stats: S(36, 44, 52, 42, 78), look: { skin: '#f0d0b8', hair: '#4a2c20', coat: '#5b4c3a', coat2: '#3a3025', pants: '#25201c', hat: 'beret', extra: 'none' } },
  { id: 'c11', name: '토마스 레인', role: '현장 중개인', dept: 'requester', stats: S(52, 48, 66, 36, 70), look: { skin: '#d9ab86', hair: '#7a5a2e', coat: '#675440', coat2: '#43372a', pants: '#2a2420', hat: 'hood', extra: 'scarf' } },
  { id: 'c12', name: '윤소율', role: '수행 요원', dept: 'requester', stats: S(58, 50, 70, 38, 62), look: { skin: '#e4bd9a', hair: '#15151a', coat: '#4e4333', coat2: '#31291f', pants: '#1f1c1a', hat: 'none', extra: 'mask' } },
  { id: 'c13', name: '서하린', role: '수석 의무관', dept: 'medical', stats: S(26, 54, 52, 92, 56), look: { skin: '#f1d2bd', hair: '#241a1a', coat: '#d7d4cb', coat2: '#a7a39a', pants: '#2a2d2d', hat: 'cap', extra: 'mask' } },
  { id: 'c14', name: '엘름', role: '야전 군의관', dept: 'medical', stats: S(30, 50, 48, 86, 60), look: { skin: '#caa07c', hair: '#8c8c8c', coat: '#c9c7be', coat2: '#9a978e', pants: '#26292a', hat: 'none', extra: 'glasses' } },
  { id: 'c15', name: '문지호', role: '구급 대원', dept: 'medical', stats: S(34, 58, 64, 80, 44), look: { skin: '#dcb18c', hair: '#101012', coat: '#cfcbc0', coat2: '#9c988e', pants: '#222627', hat: 'headset', extra: 'vest' } },
  { id: 'c16', name: '장이안', role: '습격 지휘', dept: 'raider', stats: S(84, 46, 86, 28, 58), look: { skin: '#d6a780', hair: '#0f0f12', coat: '#394229', coat2: '#232a19', pants: '#1c1e17', hat: 'hood', extra: 'mask' } },
  { id: 'c17', name: '카밀라 소토', role: '침투 전문', dept: 'raider', stats: S(74, 40, 92, 30, 72), look: { skin: '#c4916a', hair: '#2a1410', coat: '#2f3622', coat2: '#1e2415', pants: '#171911', hat: 'goggles', extra: 'scarf' } },
  { id: 'c18', name: '배지훈', role: '폭파 담당', dept: 'raider', stats: S(78, 50, 70, 26, 60), look: { skin: '#e0b38e', hair: '#3a2a1a', coat: '#434a2f', coat2: '#2b301e', pants: '#1d1f17', hat: 'helm', extra: 'vest' } },
  { id: 'c19', name: '하늘', role: '비행 대장', dept: 'aerial', stats: S(66, 48, 82, 30, 70), look: { skin: '#e9c7a8', hair: '#1a1d26', coat: '#3c5566', coat2: '#27394a', pants: '#1c2127', hat: 'goggles', extra: 'scarf' } },
  { id: 'c20', name: '빅터 라우', role: '화력 유도관', dept: 'aerial', stats: S(70, 46, 74, 30, 66), look: { skin: '#d1a27c', hair: '#5a5a5e', coat: '#44606f', coat2: '#2c4250', pants: '#1e242a', hat: 'headset', extra: 'none' } },
  { id: 'c21', name: '정유나', role: '정찰 조종사', dept: 'aerial', stats: S(58, 44, 88, 32, 76), look: { skin: '#f0d3bc', hair: '#34231a', coat: '#4a6475', coat2: '#2f4455', pants: '#20262b', hat: 'cap', extra: 'glasses' } },
  { id: 'c22', name: '마덕수', role: '운송 반장', dept: 'carrier', stats: S(52, 70, 76, 36, 48), look: { skin: '#c99872', hair: '#2b2b2b', coat: '#6b4a2c', coat2: '#46301c', pants: '#25201a', hat: 'cap', extra: 'vest' } },
  { id: 'c23', name: '니나 브란트', role: '호송 운전수', dept: 'carrier', stats: S(50, 62, 84, 34, 52), look: { skin: '#eac9b0', hair: '#7a3a1c', coat: '#7a5632', coat2: '#4f361e', pants: '#2a231b', hat: 'goggles', extra: 'scarf' } },
  { id: 'c24', name: '곽민재', role: '물류 담당', dept: 'carrier', stats: S(46, 66, 72, 40, 56), look: { skin: '#d8ac88', hair: '#0f0f10', coat: '#634428', coat2: '#412c19', pants: '#241f19', hat: 'none', extra: 'mask' } },
];

// 성별 · 기본 머리 스타일 · 기본 무기 (커스터마이징으로 변경 가능)
const FEMALE = new Set(['c01', 'c05', 'c08', 'c10', 'c12', 'c13', 'c17', 'c19', 'c21', 'c23']);
const HAIR0 = { c01: 'f1', c02: 'm3', c03: 'm1', c04: 'm2', c05: 'f3', c06: 'm9', c07: 'm4', c08: 'f2', c09: 'm1', c10: 'f7', c11: 'm8', c12: 'f9', c13: 'f5', c14: 'm3', c15: 'm5', c16: 'm7', c17: 'f4', c18: 'm2', c19: 'f6', c20: 'm6', c21: 'f10', c22: 'm4', c23: 'f8', c24: 'm10', c25: 'm3' };
const WEAPON0 = { c01: 'rapier', c02: 'dagger', c03: 'shortsword', c04: 'battleaxe', c05: 'hammer', c06: 'gauntlet', c07: 'shield', c08: 'longsword', c09: 'spear', c10: 'shortsword', c11: 'dagger', c12: 'shortsword', c13: 'dagger', c14: 'dagger', c15: 'shortsword', c16: 'dagger', c17: 'rapier', c18: 'handaxe', c19: 'spear', c20: 'spear', c21: 'rapier', c22: 'hammer', c23: 'handaxe', c24: 'greathammer', c25: 'frostblade' };
for (const r of ROSTER) { r.gender = FEMALE.has(r.id) ? 'f' : 'm'; r.look.hairStyle = HAIR0[r.id]; r.weapon = WEAPON0[r.id]; }

// 라틴어 코드네임 — 각자의 역할을 뜻하는 라틴어 단어(예: 총괄 지휘관 = Imperatrix, 방패 = Murus)
const LATIN = {
  c01: 'Imperatrix', c02: 'Consilium', c03: 'Arcanus',
  c04: 'Impetus', c05: 'Fulmen', c06: 'Gladius',
  c07: 'Murus', c08: 'Custos', c09: 'Vigil',
  c10: 'Nuntia', c11: 'Mediator', c12: 'Agens',
  c13: 'Medica', c14: 'Chirurgus', c15: 'Sanator',
  c16: 'Praedator', c17: 'Vesper', c18: 'Ignis',
  c19: 'Aquila', c20: 'Sagitta', c21: 'Falco',
  c22: 'Auriga', c23: 'Vectrix', c24: 'Portitor',
  c25: 'Praefectus',
};
for (const r of ROSTER) r.latin = LATIN[r.id];

export const MISSIONS = [
  // dept, id, name, dur(게임 분), risk, reward, stat
  ['operation', 'op1', '기밀 문서 분류·봉인', 90, 0.08, 2400, 'int'],
  ['operation', 'op2', '고객사 보안 감사 브리핑', 150, 0.18, 4300, 'int'],
  ['operation', 'op3', '비상 지휘 통신망 구축', 210, 0.28, 7200, 'int'],
  ['rager', 'rg1', '거점 제압 훈련 지원', 100, 0.2, 3000, 'cmb'],
  ['rager', 'rg2', '시가지 소탕 작전', 190, 0.45, 9500, 'cmb'],
  ['rager', 'rg3', '인질 구출 화력 지원', 240, 0.55, 13500, 'cmb'],
  ['defencer', 'df1', '요인 근접 경호', 150, 0.22, 4800, 'def'],
  ['defencer', 'df2', '시설 방어 태세 점검', 90, 0.1, 2200, 'def'],
  ['defencer', 'df3', '호송로 거점 사수', 220, 0.42, 9000, 'def'],
  ['requester', 'rq1', '의뢰 접수·위험도 분류', 80, 0.08, 2000, 'int'],
  ['requester', 'rq2', '분쟁 당사자 중재 의뢰', 160, 0.25, 5200, 'int'],
  ['requester', 'rq3', '실종자 수색 의뢰', 230, 0.38, 8800, 'mob'],
  ['medical', 'md1', '부상자 응급 처치 출동', 100, 0.12, 2800, 'med'],
  ['medical', 'md2', '야전 병원 설치', 200, 0.3, 6800, 'med'],
  ['medical', 'md3', '의약품 긴급 조달', 130, 0.2, 3800, 'mob'],
  ['raider', 'rd1', '적 보급로 기습', 150, 0.4, 7600, 'cmb'],
  ['raider', 'rd2', '정보 탈취 침투', 200, 0.5, 11000, 'mob'],
  ['raider', 'rd3', '거점 급습 후 이탈', 250, 0.6, 15000, 'cmb'],
  ['aerial', 'ar1', '공중 정찰 비행', 90, 0.15, 3200, 'mob'],
  ['aerial', 'ar2', '항공 화력 지원', 180, 0.42, 9200, 'cmb'],
  ['aerial', 'ar3', '긴급 공수 투하', 140, 0.28, 5600, 'mob'],
  ['carrier', 'cr1', '보급품 운송', 100, 0.1, 2600, 'mob'],
  ['carrier', 'cr2', '요인 비밀 이송', 170, 0.3, 6200, 'def'],
  ['carrier', 'cr3', '장거리 위험 화물 호송', 240, 0.45, 10200, 'mob'],
].map(([dept, id, name, dur, risk, reward, stat]) => ({ dept, id, name, dur, risk, reward, stat }));
export const MISSION = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

export const STAT_KO = { cmb: '전투', def: '방어', mob: '기동', med: '의료', int: '정보' };

// 순찰 경로 (타일 좌표 웨이포인트)는 map.js 의 PATROLS 와 id 로 연결
export const PATROL_META = [
  { id: 'perimeter', name: '외곽 순찰', desc: '건물 외곽 울타리를 한 바퀴 돈다.', dur: 120 },
  { id: 'corridor', name: '내부 순찰', desc: '중앙 복도와 각 방 문 앞을 점검한다.', dur: 90 },
  { id: 'gate', name: '정문 경계', desc: '정문 앞 도로와 마당을 경계한다.', dur: 100 },
];

export const PATROL_EVENTS = {
  clear: ['이상 없음. 울타리 상태 양호.', '조명 점검 완료. 사각지대 없음.', '순찰 구간 통과, 특이사항 없음.', '외부 차량 접근 없음.'],
  incident: [
    ['수상한 인물이 울타리 주변을 배회 → 퇴거 조치', 'good'],
    ['정체불명 드론이 상공을 선회 → 시야 밖으로 쫓아냄', 'good'],
    ['정문 인근 위조 출입증 소지자 적발', 'good'],
    ['외곽 센서 오작동 확인 → 현장 점검 중 경미한 부상', 'bad'],
  ],
};

/* ───────────── 혼잣말(대화 엿듣기) ───────────── */
export const MONO = {
  operation: [
    '이 서류 더미, 어제도 같은 높이였어. 줄어드는 건 내 인내심뿐이군.',
    '의뢰 단가는 올리고 사상자는 내리고. 둘 다 되는 계약이 있다면 그건 계약이 아니야.',
    '천공월아의 이름으로 나가는 문서에는 오타 하나도 허용 못 해.',
    '회계가 또 숫자를 맞추자고 하겠지… 이번 달은 내가 먼저 사과할까.',
    '지휘실 창문 너머 정문. 나가는 사람은 많은데, 돌아오는 숫자를 세는 건 늘 나야.',
  ],
  rager: [
    '몸이 근질거려. 훈련 말고, 진짜로 부딪칠 상대가 필요해.',
    '탄창은 가볍게, 마음은 무겁게. 교관이 맨날 하던 말이지.',
    '오늘도 샌드백이 먼저 포기하겠네.',
    '앞에 서는 게 내 일이야. 뒤는… 방어팀이 봐주겠지, 아마도.',
    '싸움은 짧게. 후회는 더 짧게.',
  ],
  defencer: [
    '문은 닫혀 있어야 문이야. 열려 있으면 그냥 구멍이지.',
    '지키는 일은 티가 안 나. 티가 나면 이미 실패한 거고.',
    '방패는 무거운 게 아니야. 책임이 무거운 거지.',
    '정문 카메라 각도가 어제랑 다른데… 누가 건드렸나?',
    '오늘도 아무 일도 없었다. 그게 우리 팀의 최고 성적표야.',
  ],
  requester: [
    '또 급하다는 의뢰야. 급하지 않은 의뢰는 왜 하나도 없을까.',
    '의뢰인의 웃는 얼굴은 믿지 말라고 배웠어. 선금이 입금되면 그때 믿자.',
    '이번 건 서류엔 안 적힌 이야기가 더 많아 보여.',
    '접수 도장이 닳아서 글씨가 흐려졌네. 이 정도면 우리도 오래 했다.',
    '“가능합니까?”에 “상황에 따라”라고 답하는 건 거짓말보다 정직한 거짓말이야.',
  ],
  medical: [
    '붕대가 모자라. 늘 그렇듯 사고는 재고보다 먼저 온다.',
    '다쳐서 오는 건 괜찮아. 걸어서 돌아오기만 하면.',
    '환자가 농담을 하면 아직 괜찮다는 신호야. 조용해지면… 그땐 서둘러야지.',
    '소독약 냄새가 이젠 집 냄새 같아. 이상한 일이지.',
    '내일은 침대가 비었으면 좋겠어. 이룰 수 없는 소원이지만.',
  ],
  raider: [
    '조용할수록 좋아. 들어갈 때도, 나올 때도.',
    '지도에 없는 길이 제일 빠른 길이야.',
    '작전은 완벽한데 변수가 늘 하나 모자라. 그 변수가 사람이지.',
    '장비 점검 완료. 이제 마음 점검만 남았네.',
    '습격은 속도다. 망설임은 총알보다 느리지.',
  ],
  aerial: [
    '바람이 오늘은 서쪽에서 불어. 기체가 투정을 부리겠네.',
    '하늘에서 보면 우리 기지도 작은 점이야. 그래서 안심이 돼.',
    '로터 소리가 심장 박동이랑 겹치기 시작하면, 이륙할 시간이지.',
    '지상팀이 “조금만 더 위로”라고 하면 그건 이미 늦었다는 뜻이야.',
    '구름 위는 늘 맑아. 문제는 항상 아래에 있고.',
  ],
  carrier: [
    '짐은 정직해. 무게만큼만 무겁거든. 사람은 안 그렇고.',
    '타이어 공기압, 연료, 서류. 셋 중 하나라도 비면 도착은 없어.',
    '오늘 길은 막힐 것 같아. 느낌이 아니라 경험으로.',
    '화물칸 안에 뭐가 들었는지는 묻지 않기로 했어. 계약서에도 그렇게 적혀 있고.',
    '시동 거는 소리가 하루의 시작이야. 오늘도 걸려줘.',
  ],
  injured: [
    '…괜찮아. 괜찮다고. 아직 서 있잖아.',
    '의무실까지 가는 길이 오늘따라 멀게 느껴지네.',
    '다음엔 방심 안 해. …아마도.',
  ],
  lowmor: [
    '요즘 들어 이 일이 왜 내 일이었는지 자꾸 생각하게 돼.',
    '쉬는 날이 언제였더라… 달력을 보는 것도 귀찮다.',
    '위에서는 숫자만 보지. 우린 숫자 뒤에 서 있는데.',
  ],
  night: [
    '밤이 되면 기지가 다른 곳처럼 느껴져. 조용한데, 조용하지 않아.',
    '야간 조명 아래선 그림자가 두 배로 많아. 세는 걸 포기했어.',
    '커피가 식었네. 오늘 밤은 길 것 같아.',
  ],
  patrol: [
    '발소리가 내 것 하나만 들리면 오히려 불안해.',
    '울타리 너머는 늘 조용해. 그래서 더 믿을 수 없어.',
    '한 바퀴 더 돌면 끝. …아까도 그렇게 말했던가.',
  ],
  mission: [
    '지금쯤 목표 지점이겠지. 무전은 아직 조용해.',
    '돌아가면 따뜻한 걸 먹을 거야. 아무거나 좋아, 따뜻하기만 하면.',
  ],
  generic: [
    '천공월아… 이름은 거창한데 우리가 하는 일은 늘 구체적이지.',
    '초승달이 뜨면 일이 많아지더라. 미신이라 생각하지만.',
    '오늘 하루도 무사히. 그걸로 충분해.',
    '창문으로 들어오는 빛 한 줄. 이 정도면 쉬어도 되겠다 싶네.',
    '지도 위의 점 하나하나가 사람이라는 걸, 가끔 잊으려고 노력해.',
    '오늘 점심이 뭐였더라… 기억이 안 날 정도면 꽤 바빴다는 뜻이겠지.',
    '규칙은 많을수록 좋아. 어길 때 이유를 만들기 쉬우니까.',
    '장비는 거짓말을 안 해. 손질한 만큼만 돌려주거든.',
    '시계를 보면 시간이 느려지고, 안 보면 더 느려져.',
    '믿을 수 있는 사람이 셋이면 충분해. 지금은 둘인가…',
    '비 오는 날 출동은 소리가 달라. 발소리도, 마음 소리도.',
    '이름 대신 코드네임으로 불리는 게 익숙해졌어. 가끔 본명이 낯설 정도로.',
    '월급날만 기다리는 건 아니야. …반쯤은 맞지만.',
    '쉬는 법을 배우는 게 훈련보다 어렵더라.',
  ],
};
