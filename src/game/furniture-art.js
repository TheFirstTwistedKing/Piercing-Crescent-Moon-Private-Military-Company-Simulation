// 가구 아이콘(16×16 한 칸). 가구 40종은 11가지 기본 모양 × 색으로 구분해 그린다.
import { adj } from './hair.js';

export function drawFurnitureIcon(c, item, x, y) {
  const r = (col, dx, dy, w, h) => { c.fillStyle = col; c.fillRect(x + dx, y + dy, w, h); };
  const col = item.color, dk = adj(col, -48), lt = adj(col, 40), wood = '#5a4330';
  switch (item.art) {
    case 'bed': r('#241c14', 1, 3, 14, 11); r(dk, 2, 4, 12, 9); r(col, 2, 6, 12, 7); r('#e8e4d6', 3, 4, 5, 3); r(lt, 2, 6, 12, 1); break;
    case 'seat': r('#1a120e', 1, 5, 14, 9); r(dk, 2, 3, 12, 5); r(col, 2, 7, 12, 6); r(lt, 3, 8, 10, 1); r(dk, 1, 6, 2, 7); r(dk, 13, 6, 2, 7); break;
    case 'desk': r('#1c140e', 1, 6, 14, 8); r(wood, 1, 4, 14, 5); r(col, 2, 5, 12, 3); r(lt, 2, 5, 12, 1); r('#1c140e', 2, 10, 2, 4); r('#1c140e', 12, 10, 2, 4); break;
    case 'shelf': r('#14100c', 2, 1, 12, 14); r(dk, 3, 2, 10, 12); for (let i = 0; i < 3; i++) { r('#241c14', 3, 4 + i * 4, 10, 1); r(i % 2 ? lt : col, 4, 2 + i * 4, 3, 2); r(col, 8, 2 + i * 4, 4, 2); } break;
    case 'gym': r('#14100c', 2, 11, 12, 3); r('#6a7078', 4, 7, 8, 2); r(col, 2, 5, 3, 6); r(col, 11, 5, 3, 6); r(lt, 2, 5, 1, 6); break;
    case 'tech': r('#14181c', 2, 3, 12, 10); r(dk, 3, 4, 10, 6); r(col, 4, 5, 8, 4); r(lt, 4, 5, 8, 1); r('#2a2f35', 6, 11, 4, 2); break;
    case 'plant': r('#4a3322', 5, 9, 6, 5); r('#2d5538', 2, 1, 12, 9); r(col, 4, 2, 8, 6); r(lt, 6, 3, 3, 3); break;
    case 'lamp': r('#241c14', 6, 9, 4, 5); r(dk, 4, 3, 8, 7); r(col, 5, 4, 6, 5); r(lt, 6, 5, 3, 2); r('rgba(255,200,120,.25)', 2, 1, 12, 12); break;
    case 'med': r('#c9cdc6', 2, 2, 12, 12); r('#9aa09a', 2, 2, 12, 2); r(col, 6, 5, 4, 7); r(col, 4, 7, 8, 3); r('#ffffff', 7, 6, 2, 5); break;
    case 'safe': r('#14181c', 2, 2, 12, 12); r(dk, 3, 3, 10, 10); r(col, 3, 3, 10, 2); r(lt, 6, 7, 4, 4); r('#14181c', 7, 8, 2, 2); break;
    case 'board': r('#1c140e', 2, 2, 12, 11); r(col, 3, 3, 10, 9); r(lt, 3, 3, 10, 1); r('#e8e4d6', 5, 5, 6, 5); r(dk, 7, 7, 2, 2); break;
    default: r(col, 3, 3, 10, 10);
  }
}
