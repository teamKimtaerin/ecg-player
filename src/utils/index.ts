// ASS 색상을 CSS 색상으로 변환
export const assColorToCss = (assColor: string): string => {
  // ASS 색상 형태: &H00FFFF00 (BGR 형태)
  const hex = assColor.replace('&H', '').replace('&', '');
  if (hex === '00FFFFFF') return '#FFFFFF'; // 흰색
  
  // BGR을 RGB로 변환
  const bgr = hex.slice(-6); // 마지막 6자리
  const b = bgr.slice(0, 2);
  const g = bgr.slice(2, 4);
  const r = bgr.slice(4, 6);
  
  return `#${r}${g}${b}`;
};