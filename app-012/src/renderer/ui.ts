import type { Package, Prescription, ReviewEntry, ReworkRecord, WeighResult } from '../types';
import { allDecided, isFlagged, latestAttempt, ISSUE_LABELS } from '../review';

export class UIRenderer {
  prescriptionX: number = 20;
  prescriptionY: number = 60;
  prescriptionW: number = 260;
  buttonRects: Array<{ x: number; y: number; w: number; h: number; action: string }> = [];

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

  drawPackageArea(ctx: CanvasRenderingContext2D, _canvasW: number, canvasH: number, packages: Package[]): void {
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
      const special = pkg.decoct !== 'normal';
      const packProblem = special && (!pkg.separated || !pkg.labeled);
      ctx.fillStyle = '#fff8f0';
      ctx.fillRect(px, py, 88, 24);
      ctx.strokeStyle = packProblem ? '#dc143c' : '#d4a574';
      ctx.lineWidth = packProblem ? 2 : 1;
      ctx.strokeRect(px, py, 88, 24);
      ctx.fillStyle = packProblem ? '#dc143c' : '#333';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let label = `${pkg.herb}`;
      if (pkg.decoct === 'first') label += '[先]';
      if (pkg.decoct === 'last') label += '[后]';
      if (packProblem) label += '⚠';
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

  drawReview(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, entries: ReviewEntry[], round: number, reworkLog: ReworkRecord[]): void {
    const rowH = 30;
    const attemptH = 18;

    let entriesH = 0;
    for (const e of entries) {
      entriesH += rowH;
      if (e.attempts.length > 1) entriesH += attemptH;
    }
    const logLines = Math.min(3, reworkLog.length);
    const logH = reworkLog.length > 0 ? 26 + logLines * 18 : 0;
    const panelW = Math.min(760, canvasW - 24);
    const panelH = 84 + entriesH + 14 + logH + 56;
    const px = (canvasW - panelW) / 2;
    const py = Math.max(12, (canvasH - panelH) / 2);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = '#fff8f0';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 3;
    ctx.strokeRect(px, py, panelW, panelH);

    const flagged = entries.filter(isFlagged).length;
    ctx.fillStyle = '#8b4513';
    ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`复核 · 第${round}轮`, px + 18, py + 26);
    ctx.fillStyle = flagged > 0 ? '#dc143c' : '#228b22';
    ctx.font = '13px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`共${entries.length}味 · ${flagged > 0 ? `${flagged}味待处置` : '全部合格'}`, px + panelW - 18, py + 26);

    const col = { herb: px + 18, target: px + 150, actual: px + 215, delta: px + 280, pack: px + 345, verdict: px + 470, action: px + 610 };
    const headerY = py + 52;
    ctx.fillStyle = '#8b6914';
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('药味', col.herb, headerY);
    ctx.fillText('应称', col.target, headerY);
    ctx.fillText('实称', col.actual, headerY);
    ctx.fillText('偏差', col.delta, headerY);
    ctx.fillText('分包·标签', col.pack, headerY);
    ctx.fillText('核对', col.verdict, headerY);
    ctx.fillText('处置', col.action, headerY);

    this.buttonRects = [];
    let rowY = headerY + 14 + rowH / 2;

    for (const e of entries) {
      const latest = latestAttempt(e);
      const bad = isFlagged(e);

      if (bad) {
        ctx.fillStyle = 'rgba(220, 20, 60, 0.07)';
        ctx.fillRect(px + 6, rowY - rowH / 2, panelW - 12, rowH);
      }

      ctx.textAlign = 'left';
      ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#333';
      let name = e.herb;
      if (e.decoct === 'first') name += ' [先煎]';
      if (e.decoct === 'last') name += ' [后下]';
      ctx.fillText(name, col.herb, rowY);

      ctx.font = '14px "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#333';
      ctx.fillText(`${e.target}g`, col.target, rowY);
      ctx.fillText(latest ? `${latest.actual.toFixed(1)}g` : '—', col.actual, rowY);

      if (latest) {
        const d = latest.deltaG;
        ctx.fillStyle = e.issues.includes('weight') ? '#dc143c' : '#228b22';
        ctx.fillText(`${d > 0 ? '+' : ''}${d.toFixed(1)}g`, col.delta, rowY);
      } else {
        ctx.fillStyle = '#dc143c';
        ctx.fillText('—', col.delta, rowY);
      }

      if (e.decoct === 'normal') {
        ctx.fillStyle = '#999';
        ctx.fillText('—', col.pack, rowY);
      } else {
        const sepOk = !e.issues.includes('not-separated');
        const labOk = !e.issues.includes('unlabeled');
        ctx.fillStyle = sepOk ? '#228b22' : '#dc143c';
        ctx.fillText(`分包${sepOk ? '✓' : '✗'}`, col.pack, rowY);
        ctx.fillStyle = labOk ? '#228b22' : '#dc143c';
        ctx.fillText(`贴标${labOk ? '✓' : '✗'}`, col.pack + 62, rowY);
      }

      if (bad) {
        ctx.fillStyle = '#dc143c';
        ctx.fillText(e.issues.map(i => ISSUE_LABELS[i]).join('、'), col.verdict, rowY);
      } else {
        ctx.fillStyle = '#228b22';
        ctx.fillText('✓ 合格', col.verdict, rowY);
      }

      if (bad) {
        const decisions: Array<{ label: string; value: 'reweigh' | 'accept'; color: string }> = [
          { label: '重抓', value: 'reweigh', color: '#d4a574' },
          { label: '认下', value: 'accept', color: '#c0c0c0' },
        ];
        decisions.forEach((d, i) => {
          const bx = col.action + i * 70;
          const by = rowY - 12;
          const chosen = e.decision === d.value;
          ctx.fillStyle = chosen ? d.color : '#f5e6d3';
          ctx.fillRect(bx, by, 62, 24);
          ctx.strokeStyle = chosen ? '#8b4513' : '#8b6914';
          ctx.lineWidth = chosen ? 2 : 1;
          ctx.strokeRect(bx, by, 62, 24);
          ctx.fillStyle = '#333';
          ctx.font = '13px "Microsoft YaHei", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(d.label, bx + 31, by + 12);
          ctx.textAlign = 'left';
          if (e.decision === null) {
            this.buttonRects.push({ x: bx, y: by, w: 62, h: 24, action: `${d.value}-${e.herb}` });
          }
        });
      }

      rowY += rowH;

      if (e.attempts.length > 1) {
        ctx.font = '12px "Microsoft YaHei", sans-serif';
        const parts = e.attempts.map((a, i) => {
          const mark = i === e.attempts.length - 1 ? '→' : '';
          return `${mark}第${i + 1}回 ${a.actual.toFixed(1)}g(${a.deltaG > 0 ? '+' : ''}${a.deltaG.toFixed(1)})`;
        });
        ctx.fillStyle = '#666';
        ctx.fillText(parts.join('　'), col.herb + 12, rowY - attemptH / 2);
        rowY += attemptH;
      }
    }

    let logY = rowY + 10;
    if (reworkLog.length > 0) {
      ctx.fillStyle = '#8b4513';
      ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('返工记录', px + 18, logY);
      logY += 16;
      ctx.font = '12px "Microsoft YaHei", sans-serif';
      for (const r of reworkLog.slice(-3)) {
        const issueText = r.issues.map(i => ISSUE_LABELS[i]).join('、');
        const decisionText = r.decision === 'reweigh' ? '重抓，退回重称' : '认下，满意度-10';
        ctx.fillStyle = r.decision === 'reweigh' ? '#b8860b' : '#888';
        ctx.fillText(`第${r.round}轮 · ${r.herb} ${issueText}（实称${r.actual.toFixed(1)}g）→ ${decisionText}`, px + 18, logY);
        logY += 18;
      }
    }

    const ready = allDecided(entries);
    const bw = 140;
    const bh = 38;
    const bx = px + (panelW - bw) / 2;
    const by = py + panelH - bh - 12;
    ctx.fillStyle = ready ? '#6b4e23' : '#b0a898';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#f5e6d3';
    ctx.font = '17px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('完成复核', bx + bw / 2, by + bh / 2);
    this.buttonRects.push({ x: bx, y: by, w: bw, h: bh, action: 'review-done' });

    if (!ready) {
      ctx.fillStyle = '#dc143c';
      ctx.font = '12px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('请先处置所有问题药味（重抓或认下）', bx + bw + 14, by + bh / 2);
    }
  }

  drawPackToggles(ctx: CanvasRenderingContext2D, x: number, y: number, separated: boolean, labeled: boolean): void {
    this.buttonRects = [];
    ctx.fillStyle = '#f5e6d3';
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('先煎/后下需单独处理（F分包 T贴标）:', x, y - 12);

    const toggles = [
      { label: '单独分包', action: 'pack-sep', on: separated },
      { label: '贴标签', action: 'pack-label', on: labeled },
    ];
    toggles.forEach((t, i) => {
      const bx = x + i * 106;
      const by = y;
      const bw = 96;
      const bh = 30;
      ctx.fillStyle = t.on ? '#d4a574' : '#f5e6d3';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#8b6914';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);

      ctx.fillStyle = t.on ? '#6b4e23' : '#fff8f0';
      ctx.fillRect(bx + 8, by + 8, 14, 14);
      ctx.strokeStyle = '#8b6914';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 8, by + 8, 14, 14);

      ctx.fillStyle = '#333';
      ctx.font = '13px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.label, bx + 28, by + bh / 2);

      this.buttonRects.push({ x: bx, y: by, w: bw, h: bh, action: t.action });
    });
  }

  drawResult(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, score: number, level: number, results: WeighResult[], passed: boolean, reworkCount: number): void {
    const cx = canvasW / 2;
    const cy = canvasH / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.fillStyle = '#fff8f0';
    ctx.fillRect(cx - 200, cy - 180, 400, 360);
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 200, cy - 180, 400, 360);

    ctx.fillStyle = passed ? '#228b22' : '#dc143c';
    ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(passed ? '关卡通过！' : '关卡失败', cx, cy - 140);

    ctx.fillStyle = '#333';
    ctx.font = '18px sans-serif';
    ctx.fillText(`第${level}关  得分: ${score}  返工: ${reworkCount}次`, cx, cy - 100);

    const byHerb = new Map<string, WeighResult[]>();
    for (const r of results) {
      const list = byHerb.get(r.herb) ?? [];
      list.push(r);
      byHerb.set(r.herb, list);
    }
    let i = 0;
    for (const [herb, list] of byHerb) {
      const latest = list[list.length - 1];
      const ry = cy - 60 + i * 28;
      const color = latest.ok ? '#228b22' : '#dc143c';
      ctx.fillStyle = color;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      const times = list.length > 1 ? `（抓${list.length}回）` : '';
      ctx.fillText(`${herb}: 目标${latest.target}g 实际${latest.actual.toFixed(1)}g 差${latest.deltaG > 0 ? '+' : ''}${latest.deltaG.toFixed(1)}g${times}`, cx - 160, ry);
      i++;
    }

    this.buttonRects = [];
    const btnLabel = passed ? '下一关' : '重试';
    const bx = cx - 60;
    const by = cy + 140;
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
    ctx.fillText('操作: 1-9选抽屉 / 拖拽药材到秤盘 / 滚轮微调 / 空格确认 / Z归零 / F分包 T贴标', x + 10, y + 10);
    ctx.fillText('目标: 按处方抓药，误差在允许范围内', x + 10, y + 30);
    ctx.fillText('注意: 先煎/后下药要单独分包并贴标，复核会逐味核对', x + 10, y + 48);
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
