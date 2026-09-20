import type { Prescription, PackageRecord, ReviewItem, ReworkRecord, DecoctType } from '../types';
import { REWEIGH_NOTES, ACCEPT_NOTES, decoctLabel } from '../review';

export class UIRenderer {
  prescriptionX: number = 20;
  prescriptionY: number = 60;
  prescriptionW: number = 260;
  buttonRects: Array<{ x: number; y: number; w: number; h: number; action: string }> = [];
  reviewScroll = 0;
  reviewMaxScroll = 0;

  layout(canvasW: number, _canvasH: number): void {
    this.prescriptionX = 20;
    this.prescriptionY = 60;
    this.prescriptionW = Math.min(260, canvasW * 0.3);
  }

  drawPrescription(ctx: CanvasRenderingContext2D, prescription: Prescription, weighed: Set<string>, currentHerb: string | null): void {
    const x = this.prescriptionX;
    const y = this.prescriptionY;
    const w = this.prescriptionW;
    const lineH = 32;

    ctx.fillStyle = 'rgba(255, 252, 245, 0.95)';
    ctx.fillRect(x, y, w, prescription.items.length * lineH + 50);
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, prescription.items.length * lineH + 50);

    ctx.fillStyle = '#8b4513';
    ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('处方', x + 10, y + 24);

    prescription.items.forEach((item, i) => {
      const iy = y + 44 + i * lineH;
      const isWeighed = weighed.has(item.herb);
      const isCurrent = currentHerb === item.herb;

      if (isCurrent) {
        ctx.fillStyle = 'rgba(212, 165, 116, 0.3)';
        ctx.fillRect(x + 4, iy - 18, w - 8, lineH - 2);
      }

      ctx.fillStyle = isWeighed ? '#999' : '#333';
      ctx.font = `${isWeighed ? '' : 'bold '}15px "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'left';
      let text = `${item.herb} ${item.grams}g`;
      if (item.decoct === 'first') text += ' [先煎]';
      if (item.decoct === 'last') text += ' [后下]';
      ctx.fillText(text, x + 12, iy);

      if (isWeighed) {
        ctx.beginPath();
        ctx.moveTo(x + 12, iy - 4);
        ctx.lineTo(x + w - 12, iy - 4);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  }

  drawStatus(ctx: CanvasRenderingContext2D, level: number, score: number, combo: number, queue: number, satisfaction: number, timeLeft: number | null): void {
    const x = 20;
    const y = 10;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, 600, 48);

    ctx.fillStyle = '#f5e6d3';
    ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let text = `第${level}关  分数:${score}  连击:${combo}  排队:${queue}  满意度:${satisfaction}`;
    if (timeLeft !== null) {
      const color = timeLeft < 10 ? '#ff4444' : '#f5e6d3';
      ctx.fillStyle = color;
      text += `  时间:${Math.ceil(timeLeft)}s`;
    }
    ctx.fillText(text, x, y + 24);
  }

  drawPackageArea(ctx: CanvasRenderingContext2D, _canvasW: number, canvasH: number, packages: PackageRecord[]): void {
    const x = 20;
    const y = canvasH - 120;
    const w = 400;
    const h = 100;

    ctx.fillStyle = 'rgba(245, 230, 211, 0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#8b4513';
    ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('已分包', x + 10, y + 20);

    packages.forEach((pkg, i) => {
      const px = x + 10 + (i % 4) * 95;
      const py = y + 36 + Math.floor(i / 4) * 28;
      ctx.fillStyle = '#fff8f0';
      ctx.fillRect(px, py, 88, 24);
      ctx.strokeStyle = '#d4a574';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, 88, 24);
      ctx.fillStyle = pkg.labeled ? '#333' : '#dc143c';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let label = pkg.labeled ? pkg.herb : '未贴签';
      if (pkg.separate) label += '＊';
      ctx.fillText(label, px + 44, py + 12);
    });
  }

  drawButtons(_ctx: CanvasRenderingContext2D): void {
    this.buttonRects = [];
  }

  drawMenu(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, highestScore: number, highestLevel: number): void {
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const cx = canvasW / 2;
    const cy = canvasH / 2;

    ctx.fillStyle = '#d4a574';
    ctx.font = 'bold 36px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('中药柜抓药', cx, cy - 120);
    ctx.font = '20px "Microsoft YaHei", sans-serif';
    ctx.fillText('戥子称重模拟', cx, cy - 80);

    const buttons = [
      { label: '开始游戏', action: 'start' },
      { label: '无尽模式', action: 'endless' },
    ];

    this.buttonRects = [];
    buttons.forEach((btn, i) => {
      const bx = cx - 80;
      const by = cy - 20 + i * 60;
      const bw = 160;
      const bh = 44;

      ctx.fillStyle = '#6b4e23';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#d4a574';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);

      ctx.fillStyle = '#f5e6d3';
      ctx.font = '18px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, cx, by + bh / 2);

      this.buttonRects.push({ x: bx, y: by, w: bw, h: bh, action: btn.action });
    });

    ctx.fillStyle = '#888';
    ctx.font = '14px sans-serif';
    ctx.fillText(`最高分: ${highestScore}  最高关卡: ${highestLevel}`, cx, cy + 120);
  }

  drawPackaging(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, herb: string, grams: number, decoct: DecoctType, separate: boolean, labeled: boolean): void {
    const cx = canvasW / 2;
    const cy = canvasH / 2;
    const w = 380;
    const h = 250;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = '#fff8f0';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);

    ctx.fillStyle = '#8b4513';
    ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let title = `分包：${herb} ${grams.toFixed(1)}g`;
    const tag = decoctLabel(decoct);
    if (tag) title += `［${tag}］`;
    ctx.fillText(title, cx, cy - h / 2 + 34);

    this.buttonRects = [];
    this.drawCheckbox(ctx, cx - 150, cy - 40, separate, '单独分包', 'pkg|separate');
    this.drawCheckbox(ctx, cx - 150, cy + 4, labeled, '贴签写清药名', 'pkg|label');

    ctx.fillStyle = '#999';
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.fillText('先煎/后下的药要单独包，包上写清是哪一味', cx, cy + 48);

    const bw = 120;
    const bh = 40;
    const bx = cx - bw / 2;
    const by = cy + h / 2 - 60;
    ctx.fillStyle = '#6b4e23';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#f5e6d3';
    ctx.font = '18px "Microsoft YaHei", sans-serif';
    ctx.fillText('包好', cx, by + bh / 2);
    this.buttonRects.push({ x: bx, y: by, w: bw, h: bh, action: 'pkg|confirm' });
  }

  private drawCheckbox(ctx: CanvasRenderingContext2D, x: number, y: number, checked: boolean, label: string, action: string): void {
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, 22, 22);
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 22, 22);
    if (checked) {
      ctx.strokeStyle = '#228b22';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 11);
      ctx.lineTo(x + 9, y + 17);
      ctx.lineTo(x + 18, y + 5);
      ctx.stroke();
    }
    ctx.fillStyle = '#333';
    ctx.font = '15px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 30, y + 11);
    this.buttonRects.push({ x, y, w: 200, h: 22, action });
  }

  drawReview(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, items: ReviewItem[], reworkLog: ReworkRecord[], reviewRound: number, canApply: boolean): void {
    const pw = Math.min(820, canvasW - 40);
    const ph = canvasH - 60;
    const px = (canvasW - pw) / 2;
    const py = 30;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = '#fff8f0';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 3;
    ctx.strokeRect(px, py, pw, ph);

    ctx.fillStyle = '#8b4513';
    ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const roundText = reviewRound > 1 ? `（第${reviewRound}轮）` : '';
    ctx.fillText(`复核 · 逐味核对${roundText}`, px + pw / 2, py + 26);

    ctx.fillStyle = '#999';
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.fillText('对每味药：实称克数 / 与方子的差值 / 先煎后下是否单独包 / 包上是否写清药名；对不上的当场挑出', px + pw / 2, py + 48);

    const contentTop = py + 64;
    const contentBottom = py + ph - 56;
    this.buttonRects = [];

    ctx.save();
    ctx.beginPath();
    ctx.rect(px, contentTop, pw, contentBottom - contentTop);
    ctx.clip();

    let y = contentTop - this.reviewScroll;
    const rowX = px + 18;
    const rowW = pw - 36;

    for (const item of items) {
      y = this.drawReviewItem(ctx, item, rowX, y, rowW, contentTop, contentBottom);
    }

    if (reworkLog.length > 0) {
      y += 6;
      ctx.fillStyle = '#8b4513';
      ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('返工记录', rowX, y + 10);
      y += 24;
      const shown = reworkLog.slice(-4);
      for (const r of shown) {
        ctx.fillStyle = '#666';
        ctx.font = '12px "Microsoft YaHei", sans-serif';
        const after = r.afterActual === null ? '待重抓' : `${r.afterActual.toFixed(1)}g`;
        ctx.fillText(`${r.herb} 第${r.round}回返工：${r.beforeActual.toFixed(1)}g → ${after} ｜ 批注：${r.note}`, rowX + 8, y + 8);
        y += 18;
      }
    }

    ctx.restore();

    this.reviewMaxScroll = Math.max(0, y + this.reviewScroll - contentBottom + 10);
    this.reviewScroll = Math.max(0, Math.min(this.reviewScroll, this.reviewMaxScroll));

    if (this.reviewMaxScroll > 0) {
      const trackH = contentBottom - contentTop;
      const barH = Math.max(30, trackH * (trackH / (trackH + this.reviewMaxScroll)));
      const barY = contentTop + (trackH - barH) * (this.reviewScroll / this.reviewMaxScroll);
      ctx.fillStyle = 'rgba(139, 105, 20, 0.4)';
      ctx.fillRect(px + pw - 8, barY, 5, barH);
    }

    ctx.fillStyle = 'rgba(245, 230, 211, 0.95)';
    ctx.fillRect(px + 2, contentBottom, pw - 4, py + ph - contentBottom - 2);

    if (canApply) {
      const reweighCount = items.filter(i => i.issues.length > 0 && i.decision === 'reweigh').length;
      const label = reweighCount > 0 ? `退回重抓（${reweighCount}味）` : '复核完成，发药';
      const bw = 200;
      const bh = 38;
      const bx = px + pw / 2 - bw / 2;
      const by = py + ph - 48;
      ctx.fillStyle = reweighCount > 0 ? '#b8541e' : '#6b4e23';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#d4a574';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = '#f5e6d3';
      ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx + bw / 2, by + bh / 2);
      this.buttonRects.push({ x: bx, y: by, w: bw, h: bh, action: 'apply-review' });
    } else {
      const pending = items.filter(i => i.issues.length > 0 && (i.decision === null || i.note === '')).length;
      ctx.fillStyle = '#8b4513';
      ctx.font = '14px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`还有 ${pending} 味对不上：请逐味选定「重抓 / 认下」并写一句批注`, px + pw / 2, py + ph - 28);
    }
  }

  private drawReviewItem(ctx: CanvasRenderingContext2D, item: ReviewItem, x: number, y: number, w: number, clipTop: number, clipBottom: number): number {
    const hasIssues = item.issues.length > 0;
    const lineH = 26;

    // 第一行：药名 + 方子克数 + 全部称量记录 + 分包/标签状态
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = hasIssues ? '#dc143c' : '#228b22';
    ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
    ctx.fillText(hasIssues ? '✗' : '✓', x, y + lineH / 2);

    ctx.fillStyle = '#333';
    let head = `${item.herb}  方 ${item.target}g`;
    const tag = decoctLabel(item.decoct);
    if (tag) head += `［${tag}］`;
    ctx.fillText(head, x + 22, y + lineH / 2);

    ctx.font = '13px "Microsoft YaHei", sans-serif';
    let ax = x + 200;
    item.attempts.forEach((a, i) => {
      const sign = a.deltaG > 0 ? '+' : '';
      const text = `第${i + 1}回 ${a.actual.toFixed(1)}g(${sign}${a.deltaG.toFixed(1)})`;
      ctx.fillStyle = a.ok ? '#228b22' : '#dc143c';
      ctx.fillText(text, ax, y + lineH / 2);
      ax += ctx.measureText(text).width + 14;
    });
    if (item.attempts.length === 0) {
      ctx.fillStyle = '#dc143c';
      ctx.fillText('无称量记录', ax, y + lineH / 2);
    }

    ctx.textAlign = 'right';
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    const splitIssue = item.issues.find(i => i.type === 'split');
    const labelIssue = item.issues.find(i => i.type === 'label');
    ctx.fillStyle = splitIssue ? '#dc143c' : '#228b22';
    const splitText = item.decoct === 'normal'
      ? (splitIssue ? '分包✗' : '分包✓')
      : (splitIssue ? '未单独包✗' : '单独包✓');
    ctx.fillText(splitText, x + w - 90, y + lineH / 2);
    ctx.fillStyle = labelIssue ? '#dc143c' : '#228b22';
    ctx.fillText(labelIssue ? '标签✗' : '标签✓', x + w, y + lineH / 2);
    ctx.textAlign = 'left';

    y += lineH;

    // 第二行：挑出的问题 + 重抓/认下
    if (hasIssues) {
      ctx.font = '12px "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#dc143c';
      ctx.fillText(`⚠ ${item.issues.map(i => i.detail).join('；')}`, x + 22, y + 11);

      if (item.decision === null) {
        this.drawSmallButton(ctx, x + w - 150, y, 70, 22, '重抓', `decide|reweigh|${item.herb}`, '#b8541e', clipTop, clipBottom);
        this.drawSmallButton(ctx, x + w - 70, y, 70, 22, '认下', `decide|accept|${item.herb}`, '#6b4e23', clipTop, clipBottom);
      } else {
        ctx.fillStyle = item.decision === 'reweigh' ? '#b8541e' : '#6b4e23';
        ctx.font = 'bold 12px "Microsoft YaHei", sans-serif';
        const decisionText = item.decision === 'reweigh' ? '→ 重抓' : '→ 认下';
        ctx.textAlign = 'right';
        ctx.fillText(item.note ? `${decisionText} ｜ 批注：${item.note}` : decisionText, x + w, y + 11);
        ctx.textAlign = 'left';
      }
      y += 24;

      // 第三行：写一句批注
      if (item.decision !== null && item.note === '') {
        const notes = item.decision === 'reweigh' ? REWEIGH_NOTES : ACCEPT_NOTES;
        ctx.fillStyle = '#666';
        ctx.font = '12px "Microsoft YaHei", sans-serif';
        ctx.fillText('写一句：', x + 22, y + 12);
        let nx = x + 80;
        notes.forEach(note => {
          const nw = ctx.measureText(note).width + 20;
          this.drawSmallButton(ctx, nx, y, nw, 24, note, `note|${item.herb}|${note}`, '#f5e6d3', clipTop, clipBottom, '#333');
          nx += nw + 10;
        });
        y += 28;
      }
    }

    // 行分隔线
    ctx.strokeStyle = 'rgba(139, 105, 20, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x + w, y + 4);
    ctx.stroke();

    return y + 10;
  }

  private drawSmallButton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, action: string, bg: string, clipTop: number, clipBottom: number, fg = '#f5e6d3'): void {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = fg;
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.textAlign = 'left';
    if (y + h > clipTop && y < clipBottom) {
      this.buttonRects.push({ x, y, w, h, action });
    }
  }

  drawResult(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, score: number, level: number, items: ReviewItem[], reworkLog: ReworkRecord[], passed: boolean): void {
    const cx = canvasW / 2;
    const cy = canvasH / 2;
    const ph = Math.min(480, canvasH - 60);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = '#fff8f0';
    ctx.fillRect(cx - 220, cy - ph / 2, 440, ph);
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 220, cy - ph / 2, 440, ph);

    ctx.fillStyle = passed ? '#228b22' : '#dc143c';
    ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(passed ? '关卡通过！' : '关卡失败', cx, cy - ph / 2 + 40);

    ctx.fillStyle = '#333';
    ctx.font = '18px sans-serif';
    ctx.fillText(`第${level}关  得分: ${score}`, cx, cy - ph / 2 + 76);

    let ry = cy - ph / 2 + 106;
    items.forEach(item => {
      const last = item.attempts.length > 0 ? item.attempts[item.attempts.length - 1] : null;
      const accepted = item.issues.length > 0 && item.decision === 'accept';
      const color = item.issues.length === 0 ? '#228b22' : accepted ? '#b8541e' : '#dc143c';
      ctx.fillStyle = color;
      ctx.font = '13px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      let text = `${item.herb}: 方${item.target}g`;
      if (last) text += ` 实称${last.actual.toFixed(1)}g`;
      if (item.issues.length === 0) text += ' ✓';
      else if (accepted) text += ` ✗（认下：${item.note}）`;
      else text += ' ✗';
      ctx.fillText(text, cx - 190, ry);
      ry += 22;
    });

    if (reworkLog.length > 0) {
      ry += 8;
      ctx.fillStyle = '#8b4513';
      ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
      ctx.fillText(`返工 ${reworkLog.length} 回`, cx - 190, ry);
      ry += 20;
      for (const r of reworkLog.slice(-3)) {
        ctx.fillStyle = '#666';
        ctx.font = '12px "Microsoft YaHei", sans-serif';
        const after = r.afterActual === null ? '待重抓' : `${r.afterActual.toFixed(1)}g`;
        ctx.fillText(`${r.herb} 第${r.round}回：${r.beforeActual.toFixed(1)}g → ${after}`, cx - 180, ry);
        ry += 18;
      }
    }

    this.buttonRects = [];
    const btnLabel = passed ? '下一关' : '重试';
    const bx = cx - 60;
    const by = cy + ph / 2 - 56;
    const bw = 120;
    const bh = 40;

    ctx.fillStyle = '#6b4e23';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = '#f5e6d3';
    ctx.font = '18px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btnLabel, cx, by + bh / 2);

    this.buttonRects.push({ x: bx, y: by, w: bw, h: bh, action: passed ? 'next' : 'retry' });
  }

  drawGameOver(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, score: number, level: number): void {
    const cx = canvasW / 2;
    const cy = canvasH / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = '#dc143c';
    ctx.font = 'bold 36px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('病人都走光了', cx, cy - 60);

    ctx.fillStyle = '#f5e6d3';
    ctx.font = '20px sans-serif';
    ctx.fillText(`最终得分: ${score}  通过关卡: ${level}`, cx, cy);

    this.buttonRects = [];
    const bx = cx - 60;
    const by = cy + 50;
    const bw = 120;
    const bh = 40;

    ctx.fillStyle = '#6b4e23';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = '#f5e6d3';
    ctx.font = '18px "Microsoft YaHei", sans-serif';
    ctx.fillText('返回菜单', cx, by + bh / 2);

    this.buttonRects.push({ x: bx, y: by, w: bw, h: bh, action: 'menu' });
  }

  drawInstructions(ctx: CanvasRenderingContext2D, _canvasW: number, canvasH: number): void {
    const x = 20;
    const y = canvasH - 80;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x, y, 500, 70);
    ctx.fillStyle = '#ccc';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('操作: 1-9选抽屉 / 拖拽药材到秤盘 / 滚轮微调 / 空格确认 / Z归零', x + 10, y + 10);
    ctx.fillText('目标: 按处方抓药，误差在允许范围内', x + 10, y + 30);
    ctx.fillText('注意: 先煎/后下药要单独分包、贴签写清药名，复核会逐味核对', x + 10, y + 48);
  }

  drawTareButton(ctx: CanvasRenderingContext2D, x: number, y: number, active: boolean): void {
    ctx.fillStyle = active ? '#d4a574' : '#f5e6d3';
    ctx.fillRect(x, y, 60, 32);
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 60, 32);
    ctx.fillStyle = '#333';
    ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('归零', x + 30, y + 16);
  }
}
