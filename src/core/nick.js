// 콜사인(닉네임) 규칙. 중복 판정은 '정규화 키'로 한다: 대소문자·공백·_·- 차이는 같은 이름으로 본다. (예: "Ab c" = "ab_c")
export const NICK_RE = /^[\p{L}\p{N}_\- ]{2,12}$/u;
const RESERVED = new Set(['admin', 'administrator', 'system', 'root', '관리자', '운영자', '시스템', '천공월아']);
export const nickKey = (n) => String(n).normalize('NFKC').toLowerCase().replace(/[\s_\-]+/g, '');
export function nickProblem(n) {
  const t = String(n).trim();
  if (!NICK_RE.test(t)) return '콜사인은 2~12자의 글자·숫자·공백·_·- 만 쓸 수 있습니다.';
  const k = nickKey(t);
  if (k.length < 2) return '콜사인이 너무 짧습니다.';
  if (RESERVED.has(k)) return '사용할 수 없는 콜사인입니다.';
  return '';
}
